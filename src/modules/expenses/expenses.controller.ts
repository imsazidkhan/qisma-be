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
  CategoryTreeItemDto,
  ClassifyExpenseBodyDto,
  ClassifyExpenseResponseDto,
  ExpenseCategoryDisplayDto,
  ReclassifyExpenseBodyDto,
  ReclassifyExpenseResponseDto,
  SubcategoryTreeItemDto,
  TaxonomyIconDto,
  TaxonomyTierDto,
} from './dto/classify-expense.dto';
import { CreateExpenseBodyDto } from './dto/create-expense.dto';
import { CreateExpenseCommentBodyDto } from './dto/create-expense-comment.dto';
import { CreateExpenseReactionBodyDto } from './dto/create-expense-reaction.dto';
import {
  ExpenseAttachmentEntryDto,
  ExpenseCommentEntryDto,
  ExpenseCommentPageDto,
  ExpenseDetailWithRelationsDto,
  ExpenseFeedItemDto,
  ExpenseFeedPageDto,
  ExpenseMutationResponseDto,
  ExpenseReactionEntryDto,
  ExpenseUserSnippetDto,
  GroupBalanceLineDto,
  GroupBalanceSnapshotDto,
  GroupBalanceSummaryDto,
  GroupBalanceViewDto,
  GroupBalanceViewerUserDto,
} from './dto/expense-responses.dto';
import { ListExpenseCommentsQueryDto } from './dto/list-expense-comments-query.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';
import { PatchExpenseBodyDto } from './dto/patch-expense.dto';
import { ExpenseCommentsService } from './expense-comments.service';
import { ExpensesService } from './expenses.service';
import { mapExpenseCategoryToTier } from './utils/taxonomy-display.util';

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
  ListExpenseCommentsQueryDto,
  ExpenseMutationResponseDto,
  ListExpensesQueryDto,
  ExpenseFeedPageDto,
  ExpenseFeedItemDto,
  ExpenseUserSnippetDto,
  ExpenseCommentPageDto,
  TaxonomyIconDto,
  TaxonomyTierDto,
  ExpenseCategoryDisplayDto,
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
  ReclassifyExpenseBodyDto,
  ReclassifyExpenseResponseDto,
  CategoryTreeItemDto,
  SubcategoryTreeItemDto,
)
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class ExpensesController {
  constructor(
    private readonly expenses: ExpensesService,
    private readonly expenseComments: ExpenseCommentsService,
  ) {}

  @Post('expenses/classify')
  @Throttle({ default: { limit: 45, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Suggest category (**primary**/**secondary**) / merchant / tags from a title (**secondary** = subcategory)',
  })
  @ApiOkResponse({ type: ClassifyExpenseResponseDto })
  async classifyExpense(
    @Req() req: Request,
    @Body() body: ClassifyExpenseBodyDto,
  ): Promise<ApiSuccessResponse<ClassifyExpenseResponseDto>> {
    const { userId } = authContextOrThrow(req);
    const r = await this.expenses.classifyStandalone(userId, body.title);
    const data: ClassifyExpenseResponseDto = {
      category: this.expenses.toExpenseCategoryDisplayDto(r.category, r.subcategory),
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
        suggestedAlternatives:
          r.suggestedAlternatives?.map((c) => mapExpenseCategoryToTier(c)) ?? null,
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
      'Each category includes **`subcategories`** (id, slug, name, color, structured **`icon`**, **`iconUrl`**) sorted by **name**. **`icon.kind`** is **glyph** (ASCII key) or **emoji**.',
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
      'Participants, **comments** (latest preview only — full history via **GET …/comments**), reactions, attachments, activity history',
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

  @Get('groups/:groupId/expenses/:expenseId/comments')
  @ApiOperation({
    summary: 'List expense comments (paginated)',
    description: [
      '**`sort`** (optional): **`asc`** (default) — chronological oldest→newest; first page starts at oldest messages, **`cursor`** loads newer.',
      '**`sort=desc`** — newest first (chat / inverted list); first page has latest messages, **`cursor`** loads **older**.',
      '',
      '**Top-level:** omit `parentCommentId` — only rows where `parentCommentId` is null.',
      '**Replies:** set `parentCommentId` to the root comment id.',
      '',
      '**Cursor:** pass previous `data.nextCursor` as `cursor`. Payload is **base64url** JSON: `{ "v": 1, "c": "<ISO8601 createdAt>", "i": "<comment uuid>", "p": "<parent uuid>|null", "s": "asc"|"desc" }`.',
      'Legacy cursors omit `s` and only work with **`sort=asc`**. The `p` field must match this request’s `parentCommentId` query.',
      'Malformed or mismatched cursor → **400** `INVALID_EXPENSE_CURSOR`.',
    ].join('\n'),
  })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiParam({ name: 'expenseId', format: 'uuid' })
  @ApiOkResponse({ type: ExpenseCommentPageDto })
  async listComments(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Query() query: ListExpenseCommentsQueryDto,
  ): Promise<ApiSuccessResponse<ExpenseCommentPageDto>> {
    const { userId } = authContextOrThrow(req);
    const data = await this.expenseComments.listComments(
      userId,
      groupId,
      expenseId,
      query,
    );
    return { success: true, data };
  }

  @Post('groups/:groupId/expenses/:expenseId/comments')
  @ApiOperation({
    summary: 'Add expense comment (active group member)',
    description:
      'Optional **`parentCommentId`** — reply to a **top-level** comment only (depth ≤ 1). Omit for a root comment.',
  })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiParam({
    name: 'expenseId',
    format: 'uuid',
    description: 'Expense id',
  })
  @ApiBody({ type: CreateExpenseCommentBodyDto })
  @ApiCreatedResponse({ type: ExpenseCommentEntryDto })
  async createComment(
    @Req() req: Request,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Body() body: CreateExpenseCommentBodyDto,
  ): Promise<ApiSuccessResponse<ExpenseCommentEntryDto>> {
    const { userId } = authContextOrThrow(req);
    const data = await this.expenseComments.createComment(
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
    description:
      '**Category** and **subcategory** are inferred from **`title`** only (server classifier); **`categoryId`** / **`subcategoryId`** are not accepted on create. Adjust later via **`PATCH`** or **`POST …/reclassify`.',
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
