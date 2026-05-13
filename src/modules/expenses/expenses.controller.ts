import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { memoryStorage } from 'multer';

import { ApiErrorDto } from '../../common/dto/api-response.dto';
import type { ApiSuccessResponse } from '../../common/interfaces/api-response.interface';
import { UnauthorizedException } from '../../common/exceptions/api.exception';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CategoryTaxonomy,
  CategoryTreeItemDto,
  ClassifyExpenseBodyDto,
  ClassifyExpenseResponseDto,
  ReclassifyExpenseBodyDto,
  ReclassifyExpenseResponseDto,
} from './dto/classify-expense.dto';
import { CreateExpenseBodyDto } from './dto/create-expense.dto';
import { CreateExpenseCommentBodyDto } from './dto/create-expense-comment.dto';
import { CreateExpenseReactionBodyDto } from './dto/create-expense-reaction.dto';
import {
  ExpenseTaxonomyDisplayDto,
  ExpenseAttachmentEntryDto,
  ExpenseCommentEntryDto,
  ExpenseDetailWithRelationsDto,
  ExpenseFeedItemDto,
  ExpenseFeedPageDto,
  ExpenseMutationResponseDto,
  ExpenseReactionEntryDto,
  GroupBalanceLineDto,
  GroupBalanceSnapshotDto,
  GroupBalanceSummaryDto,
  GroupBalanceViewDto,
  GroupBalanceViewerUserDto,
} from './dto/expense-responses.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';
import { PatchExpenseBodyDto } from './dto/patch-expense.dto';
import { ExpensesService } from './expenses.service';

/** Hard cap for multipart **file** (aligns with env **RECEIPT_MAX_BYTES** max of 20 MB). */
const RECEIPT_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
const RECEIPT_ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

function authContextOrThrow(req: Request): { userId: string } {
  const authUser = req.user as { userId?: string } | undefined;
  if (!authUser?.userId) {
    throw new UnauthorizedException(
      'Authentication context missing after guard.',
    );
  }
  return { userId: authUser.userId };
}

@ApiTags('Expenses')
@ApiExtraModels(
  ApiErrorDto,
  CreateExpenseBodyDto,
  CreateExpenseCommentBodyDto,
  ExpenseMutationResponseDto,
  ListExpensesQueryDto,
  ExpenseFeedPageDto,
  ExpenseFeedItemDto,
  CategoryTaxonomy,
  ExpenseTaxonomyDisplayDto,
  ExpenseDetailWithRelationsDto,
  ExpenseCommentEntryDto,
  ExpenseReactionEntryDto,
  CreateExpenseReactionBodyDto,
  ExpenseAttachmentEntryDto,
  GroupBalanceLineDto,
  GroupBalanceSnapshotDto,
  GroupBalanceSummaryDto,
  GroupBalanceViewDto,
  GroupBalanceViewerUserDto,
  ClassifyExpenseBodyDto,
  ClassifyExpenseResponseDto,
  ReclassifyExpenseResponseDto,
  CategoryTreeItemDto,
)
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Post('expenses/classify')
  @Throttle({ default: { limit: 45, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Suggest taxonomy (text=category label, icon=sub slug) / merchant / tags from a title',
  })
  @ApiOkResponse({ type: ClassifyExpenseResponseDto })
  async classifyExpense(
    @Req() req: Request,
    @Body() body: ClassifyExpenseBodyDto,
  ): Promise<ApiSuccessResponse<ClassifyExpenseResponseDto>> {
    const { userId } = authContextOrThrow(req);
    const r = await this.expenses.classifyStandalone(userId, body.title);
    const data: ClassifyExpenseResponseDto = {
      taxonomy: r.category
        ? {
            text: {
              id: r.category.id,
              slug: r.category.slug,
              name: r.category.name,
              color: r.category.color ?? null,
            },
            icon: r.subcategory
              ? {
                  id: r.subcategory.id,
                  slug: r.subcategory.slug,
                  name: r.subcategory.name,
                  color: r.subcategory.color ?? null,
                }
              : null,
          }
        : null,
      merchant: r.merchant
        ? {
            id: r.merchant.id,
            displayName: r.merchant.displayName,
            normalizedName: r.merchant.normalizedName,
          }
        : null,
      tags: r.tags.map((t) => ({
        id: t.id,
        slug: t.slug,
        label: t.label,
        color: t.color ?? null,
      })),
      classification: {
        isFallback: r.isFallback,
        shouldPromptCorrection: r.shouldPromptCorrection,
        suggestedAlternatives: r.suggestedAlternatives?.map((c) => ({
          id: c.id,
          slug: c.slug,
          name: c.name,
          color: c.color ?? null,
        })) ?? null,
      },
    };
    return { success: true, data };
  }

  @Post('groups/:groupId/expenses/:expenseId/reclassify')
  @Throttle({ default: { limit: 45, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reclassify an expense after user correction' })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiParam({ name: 'expenseId', format: 'uuid' })
  @ApiOkResponse({ type: ReclassifyExpenseResponseDto })
  async reclassifyExpense(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Body() body: ReclassifyExpenseBodyDto,
  ): Promise<ApiSuccessResponse<ReclassifyExpenseResponseDto>> {
    const { userId } = authContextOrThrow(req);
    await this.expenses.reclassify(
      userId,
      groupId,
      expenseId,
      body.categorySlug,
      body.subcategorySlug ?? null,
    );
    return { success: true, data: { ok: true } };
  }

  @Get('categories')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all categories with subcategories',
    description:
      'Each category includes **`subcategories`** (id, slug, name, color) sorted by **name**. Clients map **`slug`** to icons.',
  })
  @ApiOkResponse({ type: [CategoryTreeItemDto] })
  async getCategories(
    @Req() req: Request,
  ): Promise<ApiSuccessResponse<CategoryTreeItemDto[]>> {
    authContextOrThrow(req);
    const cats = await this.expenses.getCategoryTree();
    return { success: true, data: cats };
  }

  @Get('groups/:groupId/expenses')
  @ApiOperation({
    summary: 'List group expenses (cursor pagination + filters)',
    description:
      'Default **sort** is **created_at** (newest record first). Use **sort=expense_date** for purchase-day order. Pass **nextCursor** as **cursor** for the next page.',
  })
  @ApiOkResponse({ type: ExpenseFeedPageDto })
  async listGroupExpenses(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Query() query: ListExpensesQueryDto,
  ): Promise<ApiSuccessResponse<ExpenseFeedPageDto>> {
    const { userId } = authContextOrThrow(req);
    const data = await this.expenses.listGroupExpenseFeed(userId, groupId, query);
    return { success: true, data };
  }

  @Get('me/expenses')
  @ApiOperation({
    summary: 'List my expenses across all active group memberships',
    description:
      'Includes expenses from every group where you are an **active** member. Use **sort** + **cursor** like the group feed.',
  })
  @ApiOkResponse({ type: ExpenseFeedPageDto })
  async listMyExpenses(
    @Req() req: Request,
    @Query() query: ListExpensesQueryDto,
  ): Promise<ApiSuccessResponse<ExpenseFeedPageDto>> {
    const { userId } = authContextOrThrow(req);
    const data = await this.expenses.listMyExpenseFeed(userId, query);
    return { success: true, data };
  }

  @Get('groups/:groupId/balances')
  @ApiOperation({
    summary: 'Group balance view (viewer-centric)',
    description:
      '**summary** uses your net from the same ledger as expense **`groupBalances`**. **balances** lists simplified settlement **edges** you participate in.',
  })
  @ApiOkResponse({ type: GroupBalanceViewDto })
  async getGroupBalances(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ): Promise<ApiSuccessResponse<GroupBalanceViewDto>> {
    const { userId } = authContextOrThrow(req);
    const data = await this.expenses.getGroupBalanceView(userId, groupId);
    return { success: true, data };
  }

  @Get('groups/:groupId/expenses/:expenseId')
  @ApiOperation({
    summary: 'Get expense detail',
    description:
      'Get expense detail (participants, comments, reactions, attachments, history)',
  })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiParam({ name: 'expenseId', format: 'uuid' })
  @ApiOkResponse({ type: ExpenseDetailWithRelationsDto })
  async getExpenseDetail(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
  ): Promise<ApiSuccessResponse<ExpenseDetailWithRelationsDto>> {
    const { userId } = authContextOrThrow(req);
    const data = await this.expenses.getExpenseDetailWithRelations(
      userId,
      groupId,
      expenseId,
    );
    return { success: true, data };
  }

  @Post('groups/:groupId/expenses/:expenseId/comments')
  @ApiOperation({ summary: 'Add expense comment (active group member)' })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiParam({
    name: 'expenseId',
    format: 'uuid',
    description: 'Expense id',
  })
  @ApiCreatedResponse({ type: ExpenseCommentEntryDto })
  async createExpenseComment(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Body() body: CreateExpenseCommentBodyDto,
  ): Promise<ApiSuccessResponse<ExpenseCommentEntryDto>> {
    const { userId } = authContextOrThrow(req);
    const data = await this.expenses.createExpenseComment(
      userId,
      groupId,
      expenseId,
      body,
    );
    return { success: true, data };
  }

  @Post('groups/:groupId/expenses/:expenseId/reactions')
  @ApiOperation({
    summary: 'Add expense reaction (idempotent)',
  })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiParam({
    name: 'expenseId',
    format: 'uuid',
    description: 'Expense id',
  })
  @ApiCreatedResponse({ type: ExpenseReactionEntryDto })
  @ApiOkResponse({ type: ExpenseReactionEntryDto })
  async createExpenseReaction(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Body() body: CreateExpenseReactionBodyDto,
  ): Promise<ApiSuccessResponse<ExpenseReactionEntryDto>> {
    const { userId } = authContextOrThrow(req);
    const { reaction } = await this.expenses.createExpenseReaction(
      userId,
      groupId,
      expenseId,
      body,
    );
    return { success: true, data: reaction };
  }

  @Post('groups/:groupId/expenses/:expenseId/receipts')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: RECEIPT_UPLOAD_MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        if (RECEIPT_ALLOWED_MIME.has(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('unsupported receipt MIME'), false);
        }
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload expense receipt (multipart file)',
  })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiParam({
    name: 'expenseId',
    format: 'uuid',
    description: 'Expense id',
  })
  @ApiCreatedResponse({ type: ExpenseAttachmentEntryDto })
  async uploadExpenseReceipt(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiSuccessResponse<ExpenseAttachmentEntryDto>> {
    const { userId } = authContextOrThrow(req);
    if (!file?.buffer) {
      throw new BadRequestException('Receipt file is required.');
    }
    const data = await this.expenses.uploadExpenseReceipt(
      req,
      userId,
      groupId,
      expenseId,
      file,
    );
    return { success: true, data };
  }

  @Post('groups/:groupId/expenses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create group expense (split engine + activity log + balances)',
  })
  @ApiCreatedResponse({ type: ExpenseMutationResponseDto })
  async createExpense(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() body: CreateExpenseBodyDto,
  ): Promise<ApiSuccessResponse<ExpenseMutationResponseDto>> {
    const { userId } = authContextOrThrow(req);
    const data = await this.expenses.createExpense(userId, groupId, body);
    return { success: true, data };
  }

  @Patch('groups/:groupId/expenses/:expenseId')
  @ApiOperation({
    summary: 'Update expense (recompute splits, balances, activity log)',
  })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiParam({ name: 'expenseId', format: 'uuid' })
  @ApiOkResponse({ type: ExpenseMutationResponseDto })
  async patchExpense(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Body() body: PatchExpenseBodyDto,
  ): Promise<ApiSuccessResponse<ExpenseMutationResponseDto>> {
    const { userId } = authContextOrThrow(req);
    const data = await this.expenses.patchExpense(userId, groupId, expenseId, body);
    return { success: true, data };
  }

  @Delete('groups/:groupId/expenses/:expenseId')
  @ApiOperation({
    summary: 'Soft-delete expense (activity log + recompute balances)',
  })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiParam({ name: 'expenseId', format: 'uuid' })
  @ApiOkResponse({ type: ExpenseMutationResponseDto })
  async deleteExpense(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
  ): Promise<ApiSuccessResponse<ExpenseMutationResponseDto>> {
    const { userId } = authContextOrThrow(req);
    const data = await this.expenses.deleteExpense(userId, groupId, expenseId);
    return { success: true, data };
  }
}
