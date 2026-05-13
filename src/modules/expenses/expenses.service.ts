import { Injectable } from '@nestjs/common';
import type { Expense, Prisma, User } from '@prisma/client';
import {
  ExpenseClassificationSource,
  GroupActivityEventType,
  GroupMemberStatus,
} from '@prisma/client';
import Decimal from 'decimal.js';

import {
  AccountInactiveException,
  ExpenseNotFoundException,
  ExpenseSplitValidationException,
  ExpenseStaleVersionException,
  UserNotFoundException,
} from '../../common/exceptions/api.exception';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { GroupAnalyticsCacheService } from '../analytics/group-analytics-cache.service';
import { GroupMembershipRulesService } from '../groups/permissions/group-membership-rules.service';
import { GroupActivityRepository } from '../groups/repositories/group-activity.repository';
import { BalanceEngine } from '../splits/balance.engine';
import { ExpenseSplitService } from '../splits/expense-split.service';
import type { ExpenseBalanceEntry } from '../splits/types/split.types';
import { ReceiptStorageService } from '../upload/receipt-storage.service';

import { ClassifierService } from './classification/classifier.service';
import { UserLearningService } from './classification/user-learning.service';
import { TaxonomyCacheService } from './classification/taxonomy-cache.service';
import type { CategoryTreeItemDto } from './dto/classify-expense.dto';
import type { CreateExpenseCommentBodyDto } from './dto/create-expense-comment.dto';
import type { CreateExpenseReactionBodyDto } from './dto/create-expense-reaction.dto';
import type { CreateExpenseBodyDto } from './dto/create-expense.dto';
import type { ListExpensesQueryDto } from './dto/list-expenses-query.dto';
import type { PatchExpenseBodyDto } from './dto/patch-expense.dto';
import {
  type ExpenseAttachmentEntryDto,
  type ExpenseCommentEntryDto,
  type ExpenseDetailDto,
  type ExpenseDetailWithRelationsDto,
  type ExpenseFeedItemDto,
  type ExpenseFeedPageDto,
  type ExpenseHistoryEntryDto,
  type ExpenseMutationResponseDto,
  type ExpenseReactionEntryDto,
  type GroupBalanceViewDto,
} from './dto/expense-responses.dto';
import {
  EXPENSE_FEED_DEFAULT_LIMIT,
  EXPENSE_FEED_MAX_LIMIT,
  EXPENSE_FEED_SORT,
} from './constants/expense.constants';
import { GroupBalanceCacheService } from './group-balance-cache.service';
import { computeExpenseAnalyticsFacets } from './utils/expense-facets';
import {
  decodeExpenseFeedCursor,
  encodeExpenseFeedCursor,
} from './utils/expense-cursor';
import { mapSplitPayloadToComputation } from './utils/map-split-payload';
import { assertReceiptBufferMatchesMime } from './utils/receipt-file-signature';

const D = (x: string) => new Decimal(x);

function userSnippet(u: Pick<User, 'id' | 'name' | 'username' | 'avatarUrl'>) {
  return {
    id: u.id,
    name: u.name ?? null,
    username: u.username ?? null,
    avatar: u.avatarUrl ?? null,
  };
}

function toMinor(major: string): string {
  return D(major).mul(100).toFixed(0);
}

function parseYmd(ymd: string): Date {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new ExpenseSplitValidationException('invalid date');
  }
  return d;
}

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membershipRules: GroupMembershipRulesService,
    private readonly splitService: ExpenseSplitService,
    private readonly balanceEngine: BalanceEngine,
    private readonly taxonomy: TaxonomyCacheService,
    private readonly classifier: ClassifierService,
    private readonly learning: UserLearningService,
    private readonly balanceCache: GroupBalanceCacheService,
    private readonly analyticsCache: GroupAnalyticsCacheService,
    private readonly activity: GroupActivityRepository,
    private readonly receipts: ReceiptStorageService,
  ) {}

  async getCategoryTree(): Promise<CategoryTreeItemDto[]> {
    return this.taxonomy.categoriesList.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      color: c.color ?? null,
      subcategories: c.subcategories.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        color: s.color ?? null,
      })),
    }));
  }

  async classifyStandalone(userId: string, title: string) {
    return this.classifier.classifyStandalone(userId, title);
  }

  async reclassify(
    actorUserId: string,
    groupId: string,
    expenseId: string,
    categorySlug: string,
    subcategorySlug: string | null,
  ): Promise<void> {
    await this.membershipRules.requireActiveMember(actorUserId, groupId);
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, groupId },
      include: { categoryRef: true, subcategoryRef: true },
    });
    if (!expense || expense.deletedAt) {
      throw new ExpenseNotFoundException();
    }

    const cat = await this.prisma.expenseCategory.findFirst({
      where: { slug: categorySlug, isActive: true },
    });
    if (!cat) {
      throw new ExpenseSplitValidationException('Unknown categorySlug');
    }
    let subId: string | null = null;
    if (subcategorySlug) {
      const sub = await this.prisma.expenseSubcategory.findFirst({
        where: { slug: subcategorySlug, categoryId: cat.id },
      });
      if (!sub) {
        throw new ExpenseSplitValidationException('Unknown subcategorySlug');
      }
      subId = sub.id;
    }

    await this.prisma.expense.update({
      where: { id: expenseId },
      data: {
        categoryId: cat.id,
        subcategoryId: subId,
        classificationSource: ExpenseClassificationSource.user,
        isUserClassified: true,
        classifiedAt: new Date(),
        category: cat.slug,
      },
    });

    await this.learning.bumpCategoryHit(actorUserId, cat.id, subId);
    await this.analyticsCache.invalidateGroup(expense.groupId);
    await this.activity.create({
      groupId: expense.groupId,
      type: GroupActivityEventType.expense_reclassified,
      actorUserId,
      subjectUserId: null,
      payload: {
        expenseId,
        categorySlug,
        subcategorySlug,
      } as Prisma.InputJsonValue,
    });
    await this.balanceCache.invalidate(expense.groupId);
  }

  async listGroupExpenseFeed(
    actorUserId: string,
    groupId: string,
    query: ListExpensesQueryDto,
  ): Promise<ExpenseFeedPageDto> {
    await this.assertExpenseFeedActor(actorUserId);
    await this.membershipRules.requireActiveMember(actorUserId, groupId);
    return this.executeExpenseFeedQuery({ groupId }, query);
  }

  async listMyExpenseFeed(
    actorUserId: string,
    query: ListExpensesQueryDto,
  ): Promise<ExpenseFeedPageDto> {
    await this.assertExpenseFeedActor(actorUserId);
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId: actorUserId, status: GroupMemberStatus.active },
      select: { groupId: true },
    });
    const groupIds = memberships.map((m) => m.groupId);
    if (groupIds.length === 0) {
      return { items: [], nextCursor: null };
    }
    return this.executeExpenseFeedQuery({ groupId: { in: groupIds } }, query);
  }

  private async assertExpenseFeedActor(actorUserId: string): Promise<void> {
    const u = await this.prisma.user.findUnique({ where: { id: actorUserId } });
    if (!u) {
      throw new UserNotFoundException();
    }
    if (!u.isActive) {
      throw new AccountInactiveException();
    }
  }

  private buildExpenseFeedFilters(
    query: ListExpensesQueryDto,
    groupScope: Prisma.ExpenseWhereInput,
  ): Prisma.ExpenseWhereInput[] {
    const parts: Prisma.ExpenseWhereInput[] = [groupScope];
    if (!query.includeDeleted) {
      parts.push({ deletedAt: null });
    }
    if (query.q?.trim()) {
      parts.push({
        title: { contains: query.q.trim(), mode: 'insensitive' },
      });
    }
    if (query.categoryId) {
      parts.push({ categoryId: query.categoryId });
    }
    if (query.fromDate) {
      parts.push({ date: { gte: parseYmd(query.fromDate) } });
    }
    if (query.toDate) {
      parts.push({ date: { lte: parseYmd(query.toDate) } });
    }
    return parts;
  }

  private async executeExpenseFeedQuery(
    groupScope: Prisma.ExpenseWhereInput,
    query: ListExpensesQueryDto,
  ): Promise<ExpenseFeedPageDto> {
    const sort = query.sort ?? EXPENSE_FEED_SORT.CREATED_AT;
    const limit = Math.min(
      Math.max(query.limit ?? EXPENSE_FEED_DEFAULT_LIMIT, 1),
      EXPENSE_FEED_MAX_LIMIT,
    );

    let cursorPred: Prisma.ExpenseWhereInput | undefined;
    if (query.cursor) {
      const c = decodeExpenseFeedCursor(query.cursor, sort);
      if (c.sort === EXPENSE_FEED_SORT.CREATED_AT) {
        cursorPred = {
          OR: [
            { createdAt: { lt: c.createdAt } },
            {
              AND: [{ createdAt: c.createdAt }, { id: { lt: c.id } }],
            },
          ],
        };
      } else {
        cursorPred = {
          OR: [
            { date: { lt: c.expenseDate } },
            {
              AND: [{ date: c.expenseDate }, { id: { lt: c.id } }],
            },
          ],
        };
      }
    }

    const where: Prisma.ExpenseWhereInput = {
      AND: [...this.buildExpenseFeedFilters(query, groupScope), ...(cursorPred ? [cursorPred] : [])],
    };

    const orderBy: Prisma.ExpenseOrderByWithRelationInput[] =
      sort === EXPENSE_FEED_SORT.EXPENSE_DATE
        ? [{ date: 'desc' }, { id: 'desc' }]
        : [{ createdAt: 'desc' }, { id: 'desc' }];

    const rows = await this.prisma.expense.findMany({
      where,
      orderBy,
      take: limit + 1,
      include: {
        paidBy: { select: { id: true, name: true, username: true, avatarUrl: true } },
        categoryRef: true,
        subcategoryRef: true,
      },
    });

    const page = rows.slice(0, limit);
    const hasMore = rows.length > limit;
    const last = page[page.length - 1];

    let nextCursor: string | null = null;
    if (hasMore && last) {
      nextCursor =
        sort === EXPENSE_FEED_SORT.EXPENSE_DATE
          ? encodeExpenseFeedCursor(sort, last.date, last.id)
          : encodeExpenseFeedCursor(sort, last.createdAt, last.id);
    }

    const items: ExpenseFeedItemDto[] = page.map((e) => this.mapFeedItem(e));
    return { items, nextCursor };
  }

  private mapFeedItem(
    e: Expense & {
      paidBy: Pick<User, 'id' | 'name' | 'username' | 'avatarUrl'>;
      categoryRef: { id: string; slug: string; name: string; color: string | null } | null;
      subcategoryRef: { id: string; slug: string; name: string; color: string | null } | null;
    },
  ): ExpenseFeedItemDto {
    return {
      id: e.id,
      groupId: e.groupId,
      title: e.title,
      amount: e.amount.toString(),
      currency: e.currency,
      date: e.date.toISOString().slice(0, 10),
      createdAt: e.createdAt.toISOString(),
      paidBy: userSnippet(e.paidBy),
      receiptUrl: e.receiptUrl ?? null,
      taxonomy:
        e.categoryRef
          ? {
              text: {
                id: e.categoryRef.id,
                slug: e.categoryRef.slug,
                name: e.categoryRef.name,
                color: e.categoryRef.color ?? null,
              },
              icon: e.subcategoryRef
                ? {
                    id: e.subcategoryRef.id,
                    slug: e.subcategoryRef.slug,
                    name: e.subcategoryRef.name,
                    color: e.subcategoryRef.color ?? null,
                  }
                : null,
            }
          : null,
    };
  }

  async getGroupBalanceView(
    actorUserId: string,
    groupId: string,
  ): Promise<GroupBalanceViewDto> {
    await this.membershipRules.requireActiveMember(actorUserId, groupId);
    const snap = await this.ensureBalanceSnapshot(groupId);
    const viewerNet = snap.netByUserId[actorUserId] ?? '0';

    const involvingViewer = snap.balances.filter(
      (b) => b.fromUserId === actorUserId || b.toUserId === actorUserId,
    );

    const peerIds = new Set<string>();
    for (const b of involvingViewer) {
      peerIds.add(b.fromUserId === actorUserId ? b.toUserId : b.fromUserId);
    }
    const peers = await this.prisma.user.findMany({
      where: { id: { in: [...peerIds] } },
      select: { id: true, name: true, username: true, avatarUrl: true },
    });

    return {
      dominantCurrency: snap.dominantCurrency,
      updatedAt: snap.updatedAt,
      summary: {
        currency: snap.dominantCurrency,
        netMinor: toMinor(viewerNet),
      },
      groupBalances: {
        dominantCurrency: snap.dominantCurrency,
        updatedAt: snap.updatedAt,
        summary: {
          currency: snap.dominantCurrency,
          netMinor: toMinor(viewerNet),
        },
        balances: snap.balances.map((b) => ({
          fromUserId: b.fromUserId,
          toUserId: b.toUserId,
          amountMinor: toMinor(b.amount),
        })),
      },
      balances: involvingViewer.map((b) => ({
        fromUserId: b.fromUserId,
        toUserId: b.toUserId,
        amountMinor: toMinor(b.amount),
      })),
      peers: peers.map((p) => ({
        id: p.id,
        name: p.name ?? null,
        username: p.username ?? null,
        avatar: p.avatarUrl ?? null,
      })),
    };
  }

  private async ensureBalanceSnapshot(groupId: string) {
    const cached = await this.balanceCache.get(groupId);
    if (cached) return cached;

    const expenses = await this.prisma.expense.findMany({
      where: { groupId, deletedAt: null },
      include: { participants: true },
    });

    const entries: ExpenseBalanceEntry[] = expenses.map((e) => ({
      paidByUserId: e.paidByUserId,
      totalAmount: e.amount.toString(),
      owedByUserId: Object.fromEntries(
        e.participants.map((p) => [p.userId, p.owedAmount.toString()]),
      ),
    }));

    const { edges, netByUserId } = this.balanceEngine.computeGroupBalances(
      groupId,
      entries,
      2,
    );

    const currencyCounts = new Map<string, number>();
    for (const e of expenses) {
      currencyCounts.set(e.currency, (currencyCounts.get(e.currency) ?? 0) + 1);
    }
    let dominantCurrency = 'INR';
    let best = 0;
    for (const [c, n] of currencyCounts) {
      if (n > best) {
        best = n;
        dominantCurrency = c;
      }
    }

    const snap = {
      dominantCurrency,
      updatedAt: new Date().toISOString(),
      balances: edges.map((e) => ({
        fromUserId: e.fromUserId,
        toUserId: e.toUserId,
        amount: e.amount,
      })),
      netByUserId,
    };
    await this.balanceCache.set(groupId, snap);
    return snap;
  }

  async getExpenseDetailWithRelations(
    actorUserId: string,
    groupId: string,
    expenseId: string,
  ): Promise<ExpenseDetailWithRelationsDto> {
    await this.membershipRules.requireActiveMember(actorUserId, groupId);
    const e = await this.loadExpenseDetailForGroup(expenseId, groupId);
    if (!e || e.deletedAt) {
      throw new ExpenseNotFoundException();
    }

    const [participants, comments, reactions, attachments, logs] =
      await Promise.all([
        this.prisma.expenseParticipant.findMany({
          where: { expenseId },
          include: {
            user: {
              select: { id: true, name: true, username: true, avatarUrl: true },
            },
          },
        }),
        this.prisma.expenseComment.findMany({
          where: { expenseId },
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, name: true, username: true, avatarUrl: true },
            },
          },
        }),
        this.prisma.expenseReaction.findMany({
          where: { expenseId },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.expenseAttachment.findMany({
          where: { expenseId },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.activityLog.findMany({
          where: { groupId: e.groupId, entityId: expenseId },
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: {
            actor: {
              select: { id: true, name: true, username: true, avatarUrl: true },
            },
          },
        }),
      ]);

    const base: ExpenseDetailDto = {
      id: e.id,
      groupId: e.groupId,
      title: e.title,
      amount: e.amount.toString(),
      currency: e.currency,
      splitType: e.splitType,
      date: e.date.toISOString().slice(0, 10),
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      notes: e.notes ?? null,
      description: e.description ?? null,
      paidBy: userSnippet(e.paidBy),
      taxonomy: e.categoryRef
        ? {
            text: {
              id: e.categoryRef.id,
              slug: e.categoryRef.slug,
              name: e.categoryRef.name,
              color: e.categoryRef.color ?? null,
            },
            icon: e.subcategoryRef
              ? {
                  id: e.subcategoryRef.id,
                  slug: e.subcategoryRef.slug,
                  name: e.subcategoryRef.name,
                  color: e.subcategoryRef.color ?? null,
                }
              : null,
          }
        : null,
      participants: participants.map((p) => ({
        userId: p.userId,
        owedAmount: p.owedAmount.toString(),
        paidAmount: p.paidAmount.toString(),
        user: userSnippet(p.user),
      })),
    };

    const commentDtos: ExpenseCommentEntryDto[] = comments.map((c) => ({
      id: c.id,
      userId: c.userId,
      message: c.message,
      createdAt: c.createdAt.toISOString(),
      user: userSnippet(c.user),
    }));

    const reactionDtos: ExpenseReactionEntryDto[] = reactions.map((r) => ({
      id: r.id,
      userId: r.userId,
      emoji: r.emoji,
      createdAt: r.createdAt.toISOString(),
    }));

    const attDtos: ExpenseAttachmentEntryDto[] = attachments.map((a) => ({
      id: a.id,
      type: a.type,
      url: a.url,
      createdAt: a.createdAt.toISOString(),
    }));

    const history: ExpenseHistoryEntryDto[] = logs.map((log) => ({
      type: log.type,
      createdAt: log.createdAt.toISOString(),
      actor: log.actor ? userSnippet(log.actor) : null,
      metadata: (log.metadata as Record<string, unknown>) ?? {},
    }));

    return {
      ...base,
      comments: commentDtos,
      reactions: reactionDtos,
      attachments: attDtos,
      activityLogs: history,
    };
  }

  private async loadExpenseDetailForGroup(expenseId: string, groupId: string) {
    return this.prisma.expense.findFirst({
      where: { id: expenseId, groupId },
      include: {
        paidBy: { select: { id: true, name: true, username: true, avatarUrl: true } },
        categoryRef: true,
        subcategoryRef: true,
      },
    });
  }

  async createExpenseComment(
    actorUserId: string,
    groupId: string,
    expenseId: string,
    dto: CreateExpenseCommentBodyDto,
  ): Promise<ExpenseCommentEntryDto> {
    await this.membershipRules.requireActiveMember(actorUserId, groupId);
    const e = await this.prisma.expense.findFirst({
      where: { id: expenseId, groupId },
    });
    if (!e || e.deletedAt) throw new ExpenseNotFoundException();

    const c = await this.prisma.expenseComment.create({
      data: {
        expenseId,
        userId: actorUserId,
        message: dto.message,
      },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
    });

    await this.prisma.activityLog.create({
      data: {
        groupId: e.groupId,
        type: 'expense_comment_created',
        actorId: actorUserId,
        entityId: expenseId,
        metadata: { commentId: c.id },
      },
    });

    return {
      id: c.id,
      userId: c.userId,
      message: c.message,
      createdAt: c.createdAt.toISOString(),
      user: userSnippet(c.user),
    };
  }

  async createExpenseReaction(
    actorUserId: string,
    groupId: string,
    expenseId: string,
    dto: CreateExpenseReactionBodyDto,
  ): Promise<{ created: boolean; reaction: ExpenseReactionEntryDto }> {
    await this.membershipRules.requireActiveMember(actorUserId, groupId);
    const e = await this.prisma.expense.findFirst({
      where: { id: expenseId, groupId },
    });
    if (!e || e.deletedAt) throw new ExpenseNotFoundException();

    const existing = await this.prisma.expenseReaction.findFirst({
      where: { expenseId, userId: actorUserId, emoji: dto.emoji },
    });
    if (existing) {
      return {
        created: false,
        reaction: {
          id: existing.id,
          userId: existing.userId,
          emoji: existing.emoji,
          createdAt: existing.createdAt.toISOString(),
        },
      };
    }

    const r = await this.prisma.expenseReaction.create({
      data: {
        expenseId,
        userId: actorUserId,
        emoji: dto.emoji,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        groupId: e.groupId,
        type: 'expense_reaction_created',
        actorId: actorUserId,
        entityId: expenseId,
        metadata: { reactionId: r.id },
      },
    });

    return {
      created: true,
      reaction: {
        id: r.id,
        userId: r.userId,
        emoji: r.emoji,
        createdAt: r.createdAt.toISOString(),
      },
    };
  }

  async uploadExpenseReceipt(
    req: import('express').Request,
    actorUserId: string,
    groupId: string,
    expenseId: string,
    file: Express.Multer.File,
  ): Promise<ExpenseAttachmentEntryDto> {
    assertReceiptBufferMatchesMime(file.buffer, file.mimetype);

    await this.membershipRules.requireActiveMember(actorUserId, groupId);
    const e = await this.prisma.expense.findFirst({
      where: { id: expenseId, groupId },
    });
    if (!e || e.deletedAt) throw new ExpenseNotFoundException();

    const { publicUrl } = await this.receipts.storeReceipt(req, file);
    const att = await this.prisma.expenseAttachment.create({
      data: {
        expenseId,
        type: file.mimetype.startsWith('image/') ? 'image' : 'document',
        url: publicUrl,
      },
    });

    await this.prisma.expense.update({
      where: { id: expenseId },
      data: { receiptUrl: publicUrl },
    });

    await this.prisma.activityLog.create({
      data: {
        groupId: e.groupId,
        type: 'expense_receipt_uploaded',
        actorId: actorUserId,
        entityId: expenseId,
        metadata: { attachmentId: att.id },
      },
    });

    return {
      id: att.id,
      type: att.type,
      url: att.url,
      createdAt: att.createdAt.toISOString(),
    };
  }

  async createExpense(
    actorUserId: string,
    groupId: string,
    dto: CreateExpenseBodyDto,
  ): Promise<ExpenseMutationResponseDto> {
    await this.membershipRules.requireActiveMember(actorUserId, groupId);

    const currency = dto.currency ?? 'INR';
    const dateOnly = parseYmd(dto.date);
    const facets = computeExpenseAnalyticsFacets(dateOnly);

    const compInput = mapSplitPayloadToComputation(
      dto.split,
      dto.amount,
      currency,
    );
    const computed = this.splitService.compute(compInput);

    const participantIds = [
      ...new Set(computed.participantShares.map((p) => p.userId)),
    ];
    await this.ensureUsersActiveInGroup(groupId, [...participantIds, dto.paidByUserId]);

    let classificationSource: ExpenseClassificationSource =
      ExpenseClassificationSource.system;
    let categoryId: string | undefined = dto.categoryId;
    let subcategoryId: string | undefined = dto.subcategoryId;
    let merchantId: string | undefined = dto.merchantId;

    if (categoryId || subcategoryId) {
      classificationSource = ExpenseClassificationSource.user;
    } else {
      const guess = await this.classifier.classifyStandalone(actorUserId, dto.title);
      categoryId = guess.category?.id;
      subcategoryId = guess.subcategory?.id ?? undefined;
      merchantId = guess.merchant?.id ?? merchantId;
      classificationSource =
        guess.classificationSource ?? ExpenseClassificationSource.system;
    }

    if (categoryId) {
      const exists = await this.prisma.expenseCategory.findFirst({
        where: { id: categoryId, isActive: true },
      });
      if (!exists) throw new ExpenseSplitValidationException('Unknown categoryId');
    }
    if (subcategoryId) {
      const sub = await this.prisma.expenseSubcategory.findFirst({
        where: { id: subcategoryId },
      });
      if (!sub) throw new ExpenseSplitValidationException('Unknown subcategoryId');
      if (categoryId && sub.categoryId !== categoryId) {
        throw new ExpenseSplitValidationException('subcategoryId does not match category');
      }
    }

    const catRow = categoryId
      ? await this.prisma.expenseCategory.findUnique({ where: { id: categoryId } })
      : null;

    const expense = await this.prisma.$transaction(async (tx) => {
      const exp = await tx.expense.create({
        data: {
          groupId,
          createdByUserId: actorUserId,
          paidByUserId: dto.paidByUserId,
          title: dto.title,
          description: dto.description ?? null,
          notes: dto.notes ?? null,
          amount: D(dto.amount).toFixed(4),
          currency,
          splitType: computed.splitType,
          category: catRow?.slug ?? 'food',
          date: dateOnly,
          location: dto.location ?? null,
          categoryId: categoryId ?? null,
          subcategoryId: subcategoryId ?? null,
          merchantId: merchantId ?? null,
          classificationSource,
          isUserClassified: classificationSource === ExpenseClassificationSource.user,
          classifiedAt:
            categoryId || subcategoryId ? new Date() : null,
          ...facets,
        },
      });

      await tx.expenseParticipant.deleteMany({ where: { expenseId: exp.id } });
      for (const p of computed.participantShares) {
        const paid =
          p.userId === dto.paidByUserId ? D(dto.amount).toFixed(4) : '0';
        await tx.expenseParticipant.create({
          data: {
            expenseId: exp.id,
            userId: p.userId,
            owedAmount: p.owedAmount,
            paidAmount: paid,
            percentage: p.percentage ? D(p.percentage).toFixed(4) : '0',
            shares: p.shares ? D(p.shares).toFixed(4) : '0',
          },
        });
      }

      await tx.expensePayer.deleteMany({ where: { expenseId: exp.id } });
      await tx.expensePayer.create({
        data: {
          expenseId: exp.id,
          userId: dto.paidByUserId,
          amount: D(dto.amount).toFixed(4),
        },
      });

      if (dto.tagSlugs?.length) {
        for (const slug of dto.tagSlugs) {
          const tag = await tx.expenseTag.findUnique({ where: { slug } });
          if (tag) {
            await tx.expenseTagMapping.upsert({
              where: {
                expenseId_tagId: { expenseId: exp.id, tagId: tag.id },
              },
              create: { expenseId: exp.id, tagId: tag.id },
              update: {},
            });
          }
        }
      }

      await tx.activityLog.create({
        data: {
          groupId,
          type: 'expense_created',
          actorId: actorUserId,
          entityId: exp.id,
          metadata: { title: dto.title },
        },
      });

      return exp;
    });

    if (categoryId) {
      await this.learning.bumpCategoryHit(actorUserId, categoryId, subcategoryId ?? null);
    }

    await this.analyticsCache.invalidateGroup(groupId);
    await this.balanceCache.invalidate(groupId);

    return {
      id: expense.id,
      groupId: expense.groupId,
      updatedAt: expense.updatedAt.toISOString(),
    };
  }

  async patchExpense(
    actorUserId: string,
    groupId: string,
    expenseId: string,
    dto: PatchExpenseBodyDto,
  ): Promise<ExpenseMutationResponseDto> {
    await this.membershipRules.requireActiveMember(actorUserId, groupId);
    const existing = await this.loadExpenseDetailForGroup(expenseId, groupId);
    if (!existing || existing.deletedAt) {
      throw new ExpenseNotFoundException();
    }

    if (dto.expectedUpdatedAt) {
      const expected = new Date(dto.expectedUpdatedAt).getTime();
      if (Number.isNaN(expected) || expected !== existing.updatedAt.getTime()) {
        throw new ExpenseStaleVersionException();
      }
    }

    const needsSplit =
      dto.amount !== undefined ||
      dto.split !== undefined ||
      dto.paidByUserId !== undefined ||
      dto.currency !== undefined;

    if (needsSplit) {
      const amountStr = dto.amount ?? existing.amount.toString();
      const currency = dto.currency ?? existing.currency;
      const paidBy = dto.paidByUserId ?? existing.paidByUserId;
      if (!dto.split) {
        throw new ExpenseSplitValidationException(
          'split is required when changing amount, currency, or paidByUserId',
        );
      }
      const compInput = mapSplitPayloadToComputation(dto.split, amountStr, currency);
      const computed = this.splitService.compute(compInput);
      const participantIds = [
        ...new Set(computed.participantShares.map((p) => p.userId)),
      ];
      await this.ensureUsersActiveInGroup(existing.groupId, [...participantIds, paidBy]);

      const dateOnly = dto.date ? parseYmd(dto.date) : existing.date;
      const facets = computeExpenseAnalyticsFacets(dateOnly);

      const updated = await this.prisma.$transaction(async (tx) => {
        const exp = await tx.expense.update({
          where: { id: expenseId },
          data: {
            title: dto.title ?? existing.title,
            description: dto.description ?? existing.description,
            notes: dto.notes ?? existing.notes,
            amount: D(amountStr).toFixed(4),
            currency,
            paidByUserId: paidBy,
            splitType: computed.splitType,
            date: dateOnly,
            categoryId: dto.categoryId ?? existing.categoryId,
            subcategoryId: dto.subcategoryId ?? existing.subcategoryId,
            merchantId: dto.merchantId ?? existing.merchantId,
            ...facets,
          },
        });

        await tx.expenseParticipant.deleteMany({ where: { expenseId } });
        for (const p of computed.participantShares) {
          const paid = p.userId === paidBy ? D(amountStr).toFixed(4) : '0';
          await tx.expenseParticipant.create({
            data: {
              expenseId,
              userId: p.userId,
              owedAmount: p.owedAmount,
              paidAmount: paid,
              percentage: p.percentage ? D(p.percentage).toFixed(4) : '0',
              shares: p.shares ? D(p.shares).toFixed(4) : '0',
            },
          });
        }

        await tx.expensePayer.deleteMany({ where: { expenseId } });
        await tx.expensePayer.create({
          data: {
            expenseId,
            userId: paidBy,
            amount: D(amountStr).toFixed(4),
          },
        });

        await tx.activityLog.create({
          data: {
            groupId: existing.groupId,
            type: 'expense_updated',
            actorId: actorUserId,
            entityId: expenseId,
            metadata: {},
          },
        });

        return exp;
      });

      await this.analyticsCache.invalidateGroup(existing.groupId);
      await this.balanceCache.invalidate(existing.groupId);

      return {
        id: updated.id,
        groupId: updated.groupId,
        updatedAt: updated.updatedAt.toISOString(),
      };
    }

    const dateOnly = dto.date ? parseYmd(dto.date) : existing.date;
    const facetPatch = dto.date ? computeExpenseAnalyticsFacets(dateOnly) : null;

    const data: Prisma.ExpenseUncheckedUpdateInput = {
      title: dto.title ?? existing.title,
      description: dto.description ?? existing.description,
      notes: dto.notes ?? existing.notes,
      categoryId: dto.categoryId ?? existing.categoryId,
      subcategoryId: dto.subcategoryId ?? existing.subcategoryId,
      merchantId: dto.merchantId ?? existing.merchantId,
    };
    if (dto.date && facetPatch) {
      data.date = dateOnly;
      data.expenseYear = facetPatch.expenseYear;
      data.expenseMonth = facetPatch.expenseMonth;
      data.expenseDayOfWeek = facetPatch.expenseDayOfWeek;
      data.expenseHour = facetPatch.expenseHour;
    }

    if (dto.metadata) {
      data.metadata = {
        ...((existing.metadata as object) ?? {}),
        ...dto.metadata,
      } as Prisma.InputJsonValue;
    }

    const updated = await this.prisma.expense.update({
      where: { id: expenseId },
      data,
    });

    await this.prisma.activityLog.create({
      data: {
        groupId: existing.groupId,
        type: 'expense_updated',
        actorId: actorUserId,
        entityId: expenseId,
        metadata: { scalar: true },
      },
    });

    await this.analyticsCache.invalidateGroup(existing.groupId);
    await this.balanceCache.invalidate(existing.groupId);

    return {
      id: updated.id,
      groupId: updated.groupId,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deleteExpense(
    actorUserId: string,
    groupId: string,
    expenseId: string,
  ): Promise<ExpenseMutationResponseDto> {
    await this.membershipRules.requireActiveMember(actorUserId, groupId);
    const existing = await this.prisma.expense.findFirst({
      where: { id: expenseId, groupId },
    });
    if (!existing || existing.deletedAt) {
      throw new ExpenseNotFoundException();
    }

    const updated = await this.prisma.expense.update({
      where: { id: expenseId },
      data: { deletedAt: new Date() },
    });

    await this.prisma.activityLog.create({
      data: {
        groupId: existing.groupId,
        type: 'expense_deleted',
        actorId: actorUserId,
        entityId: expenseId,
        metadata: {},
      },
    });

    await this.analyticsCache.invalidateGroup(existing.groupId);
    await this.balanceCache.invalidate(existing.groupId);

    return {
      id: updated.id,
      groupId: updated.groupId,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  private async ensureUsersActiveInGroup(
    groupId: string,
    userIds: string[],
  ): Promise<void> {
    const unique = [...new Set(userIds)];
    const rows = await this.prisma.groupMember.findMany({
      where: {
        groupId,
        userId: { in: unique },
        status: GroupMemberStatus.active,
      },
    });
    if (rows.length !== unique.length) {
      throw new ExpenseSplitValidationException(
        'All participants must be active members of the group.',
      );
    }
  }
}
