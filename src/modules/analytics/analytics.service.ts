import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { GroupMembershipRulesService } from '../groups/permissions/group-membership-rules.service';
import {
  AccountInactiveException,
  UserNotFoundException,
} from '../../common/exceptions/api.exception';
import { GroupAnalyticsCacheService } from './group-analytics-cache.service';
import type { GroupAnalyticsQueryDto } from './dto/analytics-query.dto';
import type {
  CategoryBreakdownRowDto,
  HeatmapCellDto,
  MerchantInsightRowDto,
  MonthlyTrendRowDto,
  RecurringInsightDto,
  TopSpenderRowDto,
} from './dto/analytics-responses.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: GroupMembershipRulesService,
    private readonly cache: GroupAnalyticsCacheService,
  ) {}

  private async requireUser(actorUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: actorUserId } });
    if (!user) {
      throw new UserNotFoundException();
    }
    if (!user.isActive) {
      throw new AccountInactiveException();
    }
    return user;
  }

  private resolveRange(q: GroupAnalyticsQueryDto): { from: Date; to: Date } {
    const to = q.dateTo
      ? new Date(`${q.dateTo}T23:59:59.999Z`)
      : new Date();
    const from = q.dateFrom
      ? new Date(`${q.dateFrom}T00:00:00.000Z`)
      : new Date(to.getTime() - 366 * 24 * 60 * 60 * 1000);
    return { from, to };
  }

  async categoryBreakdown(
    actorUserId: string,
    groupId: string,
    q: GroupAnalyticsQueryDto,
  ): Promise<CategoryBreakdownRowDto[]> {
    await this.requireUser(actorUserId);
    await this.membership.requireActiveMember(actorUserId, groupId);

    const { from, to } = this.resolveRange(q);
    const cacheKey = this.cache.key(
      groupId,
      `categories:${from.toISOString().slice(0, 10)}:${to.toISOString().slice(0, 10)}:${q.scopedUserId ?? 'all'}`,
    );
    const cached = await this.cache.getJson<CategoryBreakdownRowDto[]>(
      cacheKey,
    );
    if (cached) {
      return cached;
    }

    const rows = await this.prisma.$queryRaw<
      Array<{ category_id: string | null; slug: string | null; total: string; cnt: bigint }>
    >(
      q.scopedUserId
        ? Prisma.sql`
      SELECT e."categoryId" AS category_id,
             ec.slug AS slug,
             SUM(e.amount)::text AS total,
             COUNT(*)::bigint AS cnt
      FROM expenses e
      LEFT JOIN expense_categories ec ON ec.id = e."categoryId"
      WHERE e."groupId" = ${groupId}
        AND e."deletedAt" IS NULL
        AND e.date BETWEEN ${from} AND ${to}
        AND e."paidByUserId" = ${q.scopedUserId}
      GROUP BY e."categoryId", ec.slug
      ORDER BY SUM(e.amount) DESC
    `
        : Prisma.sql`
      SELECT e."categoryId" AS category_id,
             ec.slug AS slug,
             SUM(e.amount)::text AS total,
             COUNT(*)::bigint AS cnt
      FROM expenses e
      LEFT JOIN expense_categories ec ON ec.id = e."categoryId"
      WHERE e."groupId" = ${groupId}
        AND e."deletedAt" IS NULL
        AND e.date BETWEEN ${from} AND ${to}
      GROUP BY e."categoryId", ec.slug
      ORDER BY SUM(e.amount) DESC
    `,
    );

    const dto: CategoryBreakdownRowDto[] = rows.map((r) => ({
      categoryId: r.category_id,
      categorySlug:
        r.slug ?? (r.category_id ? null : 'uncategorized'),
      totalAmount: r.total,
      expenseCount: Number(r.cnt),
    }));

    await this.cache.setJson(
      cacheKey,
      dto,
      GroupAnalyticsCacheService.ttls.breakdown,
    );
    return dto;
  }

  async monthlyTrends(
    actorUserId: string,
    groupId: string,
    q: GroupAnalyticsQueryDto,
  ): Promise<MonthlyTrendRowDto[]> {
    await this.requireUser(actorUserId);
    await this.membership.requireActiveMember(actorUserId, groupId);

    const { from, to } = this.resolveRange(q);
    const cacheKey = this.cache.key(
      groupId,
      `monthly:${from.toISOString().slice(0, 10)}:${to.toISOString().slice(0, 10)}:${q.scopedUserId ?? 'all'}`,
    );
    const cached =
      await this.cache.getJson<MonthlyTrendRowDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const rows = await this.prisma.$queryRaw<
      Array<{
        y: number;
        m: number;
        total: string;
        cnt: bigint;
      }>
    >(
      q.scopedUserId
        ? Prisma.sql`
      SELECT COALESCE(e."expenseYear", EXTRACT(YEAR FROM e.date)::int)::int AS y,
             COALESCE(e."expenseMonth", EXTRACT(MONTH FROM e.date)::int)::int AS m,
             SUM(e.amount)::text AS total,
             COUNT(*)::bigint AS cnt
      FROM expenses e
      WHERE e."groupId" = ${groupId}
        AND e."deletedAt" IS NULL
        AND e.date BETWEEN ${from} AND ${to}
        AND e."paidByUserId" = ${q.scopedUserId}
      GROUP BY 1, 2
      ORDER BY 1 ASC, 2 ASC
    `
        : Prisma.sql`
      SELECT COALESCE(e."expenseYear", EXTRACT(YEAR FROM e.date)::int)::int AS y,
             COALESCE(e."expenseMonth", EXTRACT(MONTH FROM e.date)::int)::int AS m,
             SUM(e.amount)::text AS total,
             COUNT(*)::bigint AS cnt
      FROM expenses e
      WHERE e."groupId" = ${groupId}
        AND e."deletedAt" IS NULL
        AND e.date BETWEEN ${from} AND ${to}
      GROUP BY 1, 2
      ORDER BY 1 ASC, 2 ASC
    `,
    );

    const dto = rows.map((r) => ({
      year: r.y,
      month: r.m,
      totalAmount: r.total,
      expenseCount: Number(r.cnt),
    }));

    await this.cache.setJson(
      cacheKey,
      dto,
      GroupAnalyticsCacheService.ttls.trends,
    );
    return dto;
  }

  async topSpenders(
    actorUserId: string,
    groupId: string,
    q: GroupAnalyticsQueryDto,
  ): Promise<TopSpenderRowDto[]> {
    await this.requireUser(actorUserId);
    await this.membership.requireActiveMember(actorUserId, groupId);

    const { from, to } = this.resolveRange(q);
    /** Per product spec (“top spenders”): **`paidByUserId`** net of fronted bills. */
    const rows = await this.prisma.$queryRaw<
      Array<{ uid: string; total: string; cnt: bigint }>
    >(
      q.scopedUserId
        ? Prisma.sql`
      SELECT e."paidByUserId" AS uid,
             SUM(e.amount)::text AS total,
             COUNT(*)::bigint AS cnt
      FROM expenses e
      WHERE e."groupId" = ${groupId}
        AND e."deletedAt" IS NULL
        AND e.date BETWEEN ${from} AND ${to}
        AND e."paidByUserId" = ${q.scopedUserId}
      GROUP BY e."paidByUserId"
      ORDER BY SUM(e.amount) DESC
      LIMIT 25
    `
        : Prisma.sql`
      SELECT e."paidByUserId" AS uid,
             SUM(e.amount)::text AS total,
             COUNT(*)::bigint AS cnt
      FROM expenses e
      WHERE e."groupId" = ${groupId}
        AND e."deletedAt" IS NULL
        AND e.date BETWEEN ${from} AND ${to}
      GROUP BY e."paidByUserId"
      ORDER BY SUM(e.amount) DESC
      LIMIT 25
    `,
    );

    return rows.map((r) => ({
      userId: r.uid,
      totalPaidAmount: r.total,
      expenseCount: Number(r.cnt),
    }));
  }

  async merchantInsights(
    actorUserId: string,
    groupId: string,
    q: GroupAnalyticsQueryDto,
  ): Promise<MerchantInsightRowDto[]> {
    await this.requireUser(actorUserId);
    await this.membership.requireActiveMember(actorUserId, groupId);

    const { from, to } = this.resolveRange(q);
    const cacheKey = this.cache.key(
      groupId,
      `merchants:${from.toISOString().slice(0, 10)}:${to.toISOString().slice(0, 10)}:${q.scopedUserId ?? 'all'}`,
    );
    const cached =
      await this.cache.getJson<MerchantInsightRowDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const rows = await this.prisma.$queryRaw<
      Array<{
        merchant_id: string | null;
        display_name: string | null;
        total: string;
        cnt: bigint;
      }>
    >(
      q.scopedUserId
        ? Prisma.sql`
      SELECT e."merchantId" AS merchant_id,
             COALESCE(em."displayName", 'Unknown') AS display_name,
             SUM(e.amount)::text AS total,
             COUNT(*)::bigint AS cnt
      FROM expenses e
      LEFT JOIN expense_merchants em ON em.id = e."merchantId"
      WHERE e."groupId" = ${groupId}
        AND e."deletedAt" IS NULL
        AND e.date BETWEEN ${from} AND ${to}
        AND e."paidByUserId" = ${q.scopedUserId}
      GROUP BY e."merchantId", display_name
      ORDER BY SUM(e.amount) DESC
      LIMIT 40
    `
        : Prisma.sql`
      SELECT e."merchantId" AS merchant_id,
             COALESCE(em."displayName", 'Unknown') AS display_name,
             SUM(e.amount)::text AS total,
             COUNT(*)::bigint AS cnt
      FROM expenses e
      LEFT JOIN expense_merchants em ON em.id = e."merchantId"
      WHERE e."groupId" = ${groupId}
        AND e."deletedAt" IS NULL
        AND e.date BETWEEN ${from} AND ${to}
      GROUP BY e."merchantId", display_name
      ORDER BY SUM(e.amount) DESC
      LIMIT 40
    `,
    );

    const dto = rows.map((r) => ({
      merchantId: r.merchant_id,
      displayName: r.display_name ?? 'Unknown',
      totalAmount: r.total,
      expenseCount: Number(r.cnt),
    }));

    await this.cache.setJson(
      cacheKey,
      dto,
      GroupAnalyticsCacheService.ttls.merchants,
    );
    return dto;
  }

  async spendingHeatmap(
    actorUserId: string,
    groupId: string,
    q: GroupAnalyticsQueryDto,
  ): Promise<HeatmapCellDto[]> {
    await this.requireUser(actorUserId);
    await this.membership.requireActiveMember(actorUserId, groupId);

    const { from, to } = this.resolveRange(q);
    /** No cache (small payload; shape depends on exploratory UI). */
    const rows = await this.prisma.$queryRaw<
      Array<{ dow: number; hr: number; total: string; cnt: bigint }>
    >(Prisma.sql`
      SELECT COALESCE(e."expenseDayOfWeek", EXTRACT(DOW FROM e.date)::int) AS dow,
             COALESCE(e."expenseHour", 12)::int AS hr,
             SUM(e.amount)::text AS total,
             COUNT(*)::bigint AS cnt
      FROM expenses e
      WHERE e."groupId" = ${groupId}
        AND e."deletedAt" IS NULL
        AND e.date BETWEEN ${from} AND ${to}
      GROUP BY 1, 2
      ORDER BY total DESC
    `);

    return rows.map((r) => ({
      dayOfWeek: r.dow,
      hour: r.hr,
      totalAmount: r.total,
      expenseCount: Number(r.cnt),
    }));
  }

  async recurringInsights(
    actorUserId: string,
    groupId: string,
    q: GroupAnalyticsQueryDto,
  ): Promise<RecurringInsightDto> {
    await this.requireUser(actorUserId);
    await this.membership.requireActiveMember(actorUserId, groupId);

    const { from, to } = this.resolveRange(q);
    const rows = await this.prisma.$queryRaw<
      Array<{ clusters: bigint; flagged: bigint; avg_conf: string | null }>
    >(Prisma.sql`
      SELECT COUNT(DISTINCT e."recurringGroupId") FILTER (WHERE e."recurringGroupId" IS NOT NULL)::bigint AS clusters,
             COUNT(*) FILTER (WHERE e."recurringDetected" = true)::bigint AS flagged,
             AVG(e."recurringConfidence")::text AS avg_conf
      FROM expenses e
      WHERE e."groupId" = ${groupId}
        AND e."deletedAt" IS NULL
        AND e.date BETWEEN ${from} AND ${to}
    `);

    const r = rows[0];
    return {
      clusterCount: r ? Number(r.clusters) : 0,
      flaggedExpenseCount: r ? Number(r.flagged) : 0,
      avgConfidence: r?.avg_conf ?? null,
    };
  }
}
