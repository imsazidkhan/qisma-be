import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import {
  ExpenseCommentValidationException,
  ExpenseNotFoundException,
} from '../../common/exceptions/api.exception';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { GroupMembershipRulesService } from '../groups/permissions/group-membership-rules.service';

import {
  EXPENSE_COMMENT_SORT_ASC,
  normalizeExpenseCommentListSort,
} from './constants/expense-comment-sort.constants';
import {
  EXPENSE_COMMENT_LIST_DEFAULT_LIMIT,
  EXPENSE_COMMENT_LIST_MAX_LIMIT,
} from './constants/expense.constants';
import type { CreateExpenseCommentBodyDto } from './dto/create-expense-comment.dto';
import type { ListExpenseCommentsQueryDto } from './dto/list-expense-comments-query.dto';
import type {
  ExpenseCommentEntryDto,
  ExpenseCommentPageDto,
} from './dto/expense-responses.dto';
import {
  decodeExpenseCommentCursor,
  encodeExpenseCommentCursor,
} from './utils/expense-comment-cursor';
import { expenseUserSnippet } from './utils/expense-user-snippet';

const COMMENT_USER_INCLUDE = {
  user: {
    select: { id: true, name: true, username: true, avatarUrl: true },
  },
} satisfies Prisma.ExpenseCommentInclude;

type ExpenseCommentWithUser = Prisma.ExpenseCommentGetPayload<{
  include: typeof COMMENT_USER_INCLUDE;
}>;

@Injectable()
export class ExpenseCommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membershipRules: GroupMembershipRulesService,
  ) {}

  private mapRow(c: ExpenseCommentWithUser): ExpenseCommentEntryDto {
    return {
      id: c.id,
      userId: c.userId,
      message: c.message,
      parentCommentId: c.parentCommentId ?? null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      user: expenseUserSnippet(c.user),
    };
  }

  private async assertExpenseInGroup(expenseId: string, groupId: string) {
    const e = await this.prisma.expense.findFirst({
      where: { id: expenseId, groupId, deletedAt: null },
      select: { id: true, groupId: true },
    });
    if (!e) {
      throw new ExpenseNotFoundException();
    }
    return e;
  }

  /**
   * Latest **`limit`** comments by time, returned in **chronological** order (oldest first).
   * Caller must already have verified membership + expense access.
   */
  async loadCommentPreviewForDetail(
    expenseId: string,
    limit: number,
  ): Promise<ExpenseCommentEntryDto[]> {
    const rows = await this.prisma.expenseComment.findMany({
      where: { expenseId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: COMMENT_USER_INCLUDE,
    });
    const chronological = [...rows].reverse();
    return chronological.map((c) => this.mapRow(c));
  }

  /**
   * Paginated comments.
   * - **`sort=asc`** (default): **`createdAt ASC`**, **`id ASC`** — first page is oldest; **`cursor`** continues toward newer.
   * - **`sort=desc`**: **`createdAt DESC`**, **`id DESC`** — first page is newest (chat); **`cursor`** continues toward older.
   * Cursor: {@link encodeExpenseCommentCursor}.
   */
  async listComments(
    actorUserId: string,
    groupId: string,
    expenseId: string,
    query: ListExpenseCommentsQueryDto,
  ): Promise<ExpenseCommentPageDto> {
    await this.membershipRules.requireActiveMember(actorUserId, groupId);
    await this.assertExpenseInGroup(expenseId, groupId);

    const limit = Math.min(
      Math.max(query.limit ?? EXPENSE_COMMENT_LIST_DEFAULT_LIMIT, 1),
      EXPENSE_COMMENT_LIST_MAX_LIMIT,
    );

    const sort = normalizeExpenseCommentListSort(query.sort);

    const scopeParent = query.parentCommentId;
    const parentFilter: Prisma.ExpenseCommentWhereInput = query.parentCommentId
      ? { parentCommentId: query.parentCommentId }
      : { parentCommentId: null };

    const parts: Prisma.ExpenseCommentWhereInput[] = [
      { expenseId },
      { deletedAt: null },
      parentFilter,
    ];

    if (query.cursor) {
      const { createdAt, id } = decodeExpenseCommentCursor(
        query.cursor,
        scopeParent,
        sort,
      );
      if (sort === EXPENSE_COMMENT_SORT_ASC) {
        parts.push({
          OR: [
            { createdAt: { gt: createdAt } },
            { AND: [{ createdAt }, { id: { gt: id } }] },
          ],
        });
      } else {
        parts.push({
          OR: [
            { createdAt: { lt: createdAt } },
            { AND: [{ createdAt }, { id: { lt: id } }] },
          ],
        });
      }
    }

    const orderBy: Prisma.ExpenseCommentOrderByWithRelationInput[] =
      sort === EXPENSE_COMMENT_SORT_ASC
        ? [{ createdAt: 'asc' }, { id: 'asc' }]
        : [{ createdAt: 'desc' }, { id: 'desc' }];

    const rows = await this.prisma.expenseComment.findMany({
      where: { AND: parts },
      orderBy,
      take: limit + 1,
      include: COMMENT_USER_INCLUDE,
    });

    const page = rows.slice(0, limit);
    const hasMore = rows.length > limit;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeExpenseCommentCursor(last.createdAt, last.id, scopeParent, sort)
        : null;

    return { items: page.map((c) => this.mapRow(c)), nextCursor };
  }

  async createComment(
    actorUserId: string,
    groupId: string,
    expenseId: string,
    dto: CreateExpenseCommentBodyDto,
  ): Promise<ExpenseCommentEntryDto> {
    await this.membershipRules.requireActiveMember(actorUserId, groupId);
    const expense = await this.assertExpenseInGroup(expenseId, groupId);

    if (dto.parentCommentId) {
      const parent = await this.prisma.expenseComment.findFirst({
        where: {
          id: dto.parentCommentId,
          expenseId,
          deletedAt: null,
        },
        select: { id: true, parentCommentId: true },
      });
      if (!parent) {
        throw new ExpenseCommentValidationException(
          'Parent comment not found or not on this expense.',
        );
      }
      if (parent.parentCommentId !== null) {
        throw new ExpenseCommentValidationException(
          'Replies cannot be nested more than one level.',
        );
      }
    }

    const c = await this.prisma.expenseComment.create({
      data: {
        expenseId,
        userId: actorUserId,
        message: dto.message,
        parentCommentId: dto.parentCommentId ?? null,
      },
      include: COMMENT_USER_INCLUDE,
    });

    await this.prisma.activityLog.create({
      data: {
        groupId: expense.groupId,
        type: 'expense_comment_created',
        actorId: actorUserId,
        entityId: expenseId,
        metadata: { commentId: c.id },
      },
    });

    return this.mapRow(c);
  }
}
