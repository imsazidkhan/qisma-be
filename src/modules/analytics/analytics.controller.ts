import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { ApiErrorDto } from '../../common/dto/api-response.dto';
import type { ApiSuccessResponse } from '../../common/interfaces/api-response.interface';
import {
  UnauthorizedException,
} from '../../common/exceptions/api.exception';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { GroupAnalyticsQueryDto } from './dto/analytics-query.dto';
import {
  CategoryBreakdownRowDto,
  HeatmapCellDto,
  MerchantInsightRowDto,
  MonthlyTrendRowDto,
  RecurringInsightDto,
  TopSpenderRowDto,
} from './dto/analytics-responses.dto';

function authContextOrThrow(req: Request): { userId: string } {
  const authUser = req.user as { userId?: string } | undefined;
  if (!authUser?.userId) {
    throw new UnauthorizedException(
      'Authentication context missing after guard.',
    );
  }
  return { userId: authUser.userId };
}

@ApiTags('Analytics')
@ApiExtraModels(ApiErrorDto)
@Controller('groups/:groupId/analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('category-breakdown')
  @ApiOperation({ summary: 'Category spend breakdown (cached 5m)' })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiOkResponse({ type: [CategoryBreakdownRowDto] })
  async categoryBreakdown(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Query() query: GroupAnalyticsQueryDto,
  ): Promise<ApiSuccessResponse<CategoryBreakdownRowDto[]>> {
    const { userId } = authContextOrThrow(req);
    const data = await this.analytics.categoryBreakdown(userId, groupId, query);
    return { success: true, data };
  }

  @Get('monthly-trends')
  @ApiOperation({ summary: 'Monthly spending totals (cached 5m)' })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiOkResponse({ type: [MonthlyTrendRowDto] })
  async monthlyTrends(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Query() query: GroupAnalyticsQueryDto,
  ): Promise<ApiSuccessResponse<MonthlyTrendRowDto[]>> {
    const { userId } = authContextOrThrow(req);
    const data = await this.analytics.monthlyTrends(userId, groupId, query);
    return { success: true, data };
  }

  @Get('top-spenders')
  @ApiOperation({ summary: 'Top payers by summed expense amount' })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiOkResponse({ type: [TopSpenderRowDto] })
  async topSpenders(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Query() query: GroupAnalyticsQueryDto,
  ): Promise<ApiSuccessResponse<TopSpenderRowDto[]>> {
    const { userId } = authContextOrThrow(req);
    const data = await this.analytics.topSpenders(userId, groupId, query);
    return { success: true, data };
  }

  @Get('merchants')
  @ApiOperation({ summary: 'Merchant concentration (cached up to 10m)' })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiOkResponse({ type: [MerchantInsightRowDto] })
  async merchants(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Query() query: GroupAnalyticsQueryDto,
  ): Promise<ApiSuccessResponse<MerchantInsightRowDto[]>> {
    const { userId } = authContextOrThrow(req);
    const data = await this.analytics.merchantInsights(userId, groupId, query);
    return { success: true, data };
  }

  @Get('heatmap')
  @ApiOperation({ summary: 'Dow × hour spend heatmap (UTC facets)' })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiOkResponse({ type: [HeatmapCellDto] })
  async heatmap(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Query() query: GroupAnalyticsQueryDto,
  ): Promise<ApiSuccessResponse<HeatmapCellDto[]>> {
    const { userId } = authContextOrThrow(req);
    const data = await this.analytics.spendingHeatmap(userId, groupId, query);
    return { success: true, data };
  }

  @Get('recurring')
  @ApiOperation({ summary: 'Recurring detection snapshot for the range' })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiOkResponse({ type: RecurringInsightDto })
  async recurring(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Query() query: GroupAnalyticsQueryDto,
  ): Promise<ApiSuccessResponse<RecurringInsightDto>> {
    const { userId } = authContextOrThrow(req);
    const data = await this.analytics.recurringInsights(userId, groupId, query);
    return { success: true, data };
  }
}
