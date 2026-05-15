import { Test, TestingModule } from '@nestjs/testing';

import {
  ExpenseCommentValidationException,
  ExpenseNotFoundException,
  NotGroupMemberException,
} from '../../common/exceptions/api.exception';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { GroupMembershipRulesService } from '../groups/permissions/group-membership-rules.service';

import { ExpenseCommentsService } from './expense-comments.service';

/** Minimal row shape for {@link ExpenseCommentsService} maps + includes. */
function commentRow(overrides: Partial<{ id: string; userId: string }> = {}) {
  const id = overrides.id ?? 'comment-1';
  const userId = overrides.userId ?? 'author-1';
  return {
    id,
    expenseId: 'expense-1',
    userId,
    message: 'hello',
    parentCommentId: null as string | null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null as Date | null,
    user: {
      id: userId,
      name: null as string | null,
      username: null as string | null,
      avatarUrl: null as string | null,
    },
  };
}

describe('ExpenseCommentsService', () => {
  let service: ExpenseCommentsService;
  let prisma: {
    expense: { findFirst: jest.Mock };
    expenseComment: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    activityLog: { create: jest.Mock };
  };
  let membershipRules: {
    requireActiveMember: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      expense: { findFirst: jest.fn() },
      expenseComment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      activityLog: { create: jest.fn().mockResolvedValue({}) },
    };
    membershipRules = {
      requireActiveMember: jest.fn().mockResolvedValue({ id: 'membership' }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseCommentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: GroupMembershipRulesService, useValue: membershipRules },
      ],
    }).compile();

    service = moduleRef.get(ExpenseCommentsService);
  });

  describe('listComments', () => {
    it('throws NotGroupMemberException when membership check fails', async () => {
      membershipRules.requireActiveMember.mockRejectedValueOnce(
        new NotGroupMemberException(),
      );

      await expect(
        service.listComments('user-1', 'group-1', 'expense-1', {}),
      ).rejects.toBeInstanceOf(NotGroupMemberException);
      expect(prisma.expense.findFirst).not.toHaveBeenCalled();
    });

    it('throws ExpenseNotFoundException when expense is not in group (wrong groupId)', async () => {
      prisma.expense.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.listComments('user-1', 'wrong-group', 'expense-1', {}),
      ).rejects.toBeInstanceOf(ExpenseNotFoundException);
    });

    it('filters soft-deleted rows (deletedAt: null) in list query', async () => {
      prisma.expense.findFirst.mockResolvedValueOnce({
        id: 'expense-1',
        groupId: 'group-1',
      });
      prisma.expenseComment.findMany.mockResolvedValueOnce([]);

      await service.listComments('user-1', 'group-1', 'expense-1', {});

      expect(prisma.expenseComment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([{ deletedAt: null }]),
          }),
        }),
      );
    });
  });

  describe('createComment', () => {
    beforeEach(() => {
      prisma.expense.findFirst.mockResolvedValue({
        id: 'expense-1',
        groupId: 'group-1',
      });
    });

    it('throws ExpenseCommentValidationException when parent belongs to another expense', async () => {
      prisma.expenseComment.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.createComment('user-1', 'group-1', 'expense-1', {
          message: 'reply',
          parentCommentId: 'parent-on-other-expense',
        }),
      ).rejects.toBeInstanceOf(ExpenseCommentValidationException);

      expect(prisma.expenseComment.create).not.toHaveBeenCalled();
    });

    it('throws ExpenseCommentValidationException when parent is already a reply (depth > 1)', async () => {
      prisma.expenseComment.findFirst.mockResolvedValueOnce({
        id: 'parent-1',
        parentCommentId: 'grandparent',
      });

      await expect(
        service.createComment('user-1', 'group-1', 'expense-1', {
          message: 'nested',
          parentCommentId: 'parent-1',
        }),
      ).rejects.toBeInstanceOf(ExpenseCommentValidationException);
    });
  });

  describe('loadCommentPreviewForDetail', () => {
    it('excludes soft-deleted comments from expense detail preview', async () => {
      prisma.expenseComment.findMany.mockResolvedValueOnce([]);

      await service.loadCommentPreviewForDetail('expense-1', 50);

      expect(prisma.expenseComment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { expenseId: 'expense-1', deletedAt: null },
        }),
      );
    });
  });
});
