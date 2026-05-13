import { Test, TestingModule } from '@nestjs/testing';
import type { GroupMember } from '@prisma/client';
import { GroupMemberRole, GroupMemberStatus } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';

import {
  AccountInactiveException,
  GroupInvitePreviewNotPendingException,
  GroupMemberNotFoundException,
  GroupNotFoundException,
  NotGroupMemberException,
  UserNotFoundException,
} from '../../common/exceptions/api.exception';
import { UserService } from '../user/user.service';
import { GroupsService } from './groups.service';
import { GroupMembershipRulesService } from './permissions/group-membership-rules.service';
import { GroupInviteRepository } from './repositories/group-invite.repository';
import { GroupActivityRepository } from './repositories/group-activity.repository';
import { GroupMemberRepository } from './repositories/group-member.repository';
import { GroupRepository } from './repositories/group.repository';

const pinoLoggerMock: Pick<
  PinoLogger,
  'setContext' | 'info' | 'warn' | 'error' | 'debug'
> = {
  setContext: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const groupActivityRepoMock = {
  create: jest.fn().mockResolvedValue(undefined),
};

describe('GroupsService', () => {
  describe('listPendingInvitesForUser', () => {
    let service: GroupsService;
    let groupMembers: jest.Mocked<
      Pick<GroupMemberRepository, 'findPendingMembershipsForUser'>
    >;
    let users: jest.Mocked<Pick<UserService, 'findById'>>;

    beforeEach(async () => {
      groupMembers = {
        findPendingMembershipsForUser: jest.fn(),
      };
      users = {
        findById: jest.fn(),
      };

      const moduleRef: TestingModule = await Test.createTestingModule({
        providers: [
          GroupsService,
          { provide: GroupRepository, useValue: {} },
          { provide: GroupMemberRepository, useValue: groupMembers },
          { provide: GroupInviteRepository, useValue: {} },
          { provide: GroupActivityRepository, useValue: groupActivityRepoMock },
          { provide: UserService, useValue: users },
          { provide: GroupMembershipRulesService, useValue: {} },
          { provide: PinoLogger, useValue: pinoLoggerMock },
        ],
      }).compile();

      service = moduleRef.get(GroupsService);
    });

    it('returns [] when there are no pending memberships', async () => {
      users.findById.mockResolvedValue({
        id: 'u1',
        isActive: true,
      } as Awaited<ReturnType<UserService['findById']>>);
      groupMembers.findPendingMembershipsForUser.mockResolvedValue([]);

      await expect(service.listPendingInvitesForUser('u1')).resolves.toEqual(
        [],
      );
    });

    it('maps group snapshot and inviter (addedBy)', async () => {
      users.findById.mockResolvedValue({
        id: 'u1',
        isActive: true,
      } as Awaited<ReturnType<UserService['findById']>>);

      const createdAt = new Date('2024-06-01T12:00:00.000Z');
      groupMembers.findPendingMembershipsForUser.mockResolvedValue([
        {
          groupId: 'g1',
          userId: 'u1',
          role: GroupMemberRole.member,
          status: GroupMemberStatus.pending,
          createdAt,
          joinedAt: null,
          addedByUserId: 'inv1',
          group: {
            id: 'g1',
            name: 'Summer trip',
            avatarUrl: 'https://cdn.example/g.png',
            type: 'trip',
          },
          addedBy: {
            id: 'inv1',
            name: 'Alex',
            username: 'alex',
            avatarUrl: null,
          },
        },
      ] as Awaited<
        ReturnType<GroupMemberRepository['findPendingMembershipsForUser']>
      >);

      await expect(service.listPendingInvitesForUser('u1')).resolves.toEqual([
        {
          groupId: 'g1',
          groupName: 'Summer trip',
          groupAvatar: 'https://cdn.example/g.png',
          groupType: 'trip',
          role: GroupMemberRole.member,
          invitedAt: createdAt,
          invitedBy: {
            userId: 'inv1',
            name: 'Alex',
            username: 'alex',
            avatar: null,
          },
        },
      ]);
    });

    it('maps invitedBy null when addedBy unset', async () => {
      users.findById.mockResolvedValue({
        id: 'u1',
        isActive: true,
      } as Awaited<ReturnType<UserService['findById']>>);

      const createdAt = new Date('2024-06-02T09:00:00.000Z');
      groupMembers.findPendingMembershipsForUser.mockResolvedValue([
        {
          groupId: 'g2',
          userId: 'u1',
          role: GroupMemberRole.member,
          status: GroupMemberStatus.pending,
          createdAt,
          joinedAt: null,
          addedByUserId: null,
          group: {
            id: 'g2',
            name: 'Home',
            avatarUrl: null,
            type: 'home',
          },
          addedBy: null,
        },
      ] as Awaited<
        ReturnType<GroupMemberRepository['findPendingMembershipsForUser']>
      >);

      await expect(service.listPendingInvitesForUser('u1')).resolves.toEqual([
        {
          groupId: 'g2',
          groupName: 'Home',
          groupAvatar: null,
          groupType: 'home',
          role: GroupMemberRole.member,
          invitedAt: createdAt,
          invitedBy: null,
        },
      ]);
    });

    it('throws UserNotFoundException when user row missing', async () => {
      users.findById.mockResolvedValue(null);
      await expect(
        service.listPendingInvitesForUser('missing'),
      ).rejects.toThrow(UserNotFoundException);
    });

    it('throws AccountInactiveException when user inactive', async () => {
      users.findById.mockResolvedValue({
        id: 'u1',
        isActive: false,
      } as Awaited<ReturnType<UserService['findById']>>);
      await expect(service.listPendingInvitesForUser('u1')).rejects.toThrow(
        AccountInactiveException,
      );
    });
  });

  describe('getInvitePreviewForPendingInvitee', () => {
    let service: GroupsService;
    let groupsRepo: jest.Mocked<Pick<GroupRepository, 'findById'>>;
    let groupMembers: jest.Mocked<
      Pick<GroupMemberRepository, 'findMembership' | 'countWhere'>
    >;
    let users: jest.Mocked<Pick<UserService, 'findById'>>;

    beforeEach(async () => {
      groupsRepo = { findById: jest.fn() };
      groupMembers = {
        findMembership: jest.fn(),
        countWhere: jest.fn(),
      };
      users = { findById: jest.fn() };

      const moduleRef: TestingModule = await Test.createTestingModule({
        providers: [
          GroupsService,
          { provide: GroupRepository, useValue: groupsRepo },
          { provide: GroupMemberRepository, useValue: groupMembers },
          { provide: GroupInviteRepository, useValue: {} },
          { provide: GroupActivityRepository, useValue: groupActivityRepoMock },
          { provide: UserService, useValue: users },
          { provide: GroupMembershipRulesService, useValue: {} },
          { provide: PinoLogger, useValue: pinoLoggerMock },
        ],
      }).compile();

      service = moduleRef.get(GroupsService);
    });

    it('returns minimal fields when pending', async () => {
      users.findById.mockResolvedValue({
        id: 'u1',
        isActive: true,
      } as Awaited<ReturnType<UserService['findById']>>);
      groupsRepo.findById.mockResolvedValue({
        id: 'g1',
        name: 'Club',
        type: 'other',
        avatarUrl: null,
      } as Awaited<ReturnType<GroupRepository['findById']>>);
      groupMembers.findMembership.mockResolvedValue({
        status: GroupMemberStatus.pending,
      } as GroupMember);
      groupMembers.countWhere.mockResolvedValue(5);

      await expect(
        service.getInvitePreviewForPendingInvitee('u1', 'g1'),
      ).resolves.toEqual({
        id: 'g1',
        name: 'Club',
        type: 'other',
        avatar: null,
        memberCount: 5,
      });
      expect(groupMembers.countWhere).toHaveBeenCalledWith(
        'g1',
        GroupMemberStatus.active,
      );
    });

    it('throws GroupInvitePreviewNotPendingException when already active', async () => {
      users.findById.mockResolvedValue({
        id: 'u1',
        isActive: true,
      } as Awaited<ReturnType<UserService['findById']>>);
      groupsRepo.findById.mockResolvedValue({
        id: 'g1',
      } as Awaited<ReturnType<GroupRepository['findById']>>);
      groupMembers.findMembership.mockResolvedValue({
        status: GroupMemberStatus.active,
      } as GroupMember);

      await expect(
        service.getInvitePreviewForPendingInvitee('u1', 'g1'),
      ).rejects.toThrow(GroupInvitePreviewNotPendingException);
    });

    it('throws GroupMemberNotFoundException when no membership row', async () => {
      users.findById.mockResolvedValue({
        id: 'u1',
        isActive: true,
      } as Awaited<ReturnType<UserService['findById']>>);
      groupsRepo.findById.mockResolvedValue({
        id: 'g1',
      } as Awaited<ReturnType<GroupRepository['findById']>>);
      groupMembers.findMembership.mockResolvedValue(null);

      await expect(
        service.getInvitePreviewForPendingInvitee('u1', 'g1'),
      ).rejects.toThrow(GroupMemberNotFoundException);
    });

    it('throws GroupNotFoundException when group missing', async () => {
      users.findById.mockResolvedValue({
        id: 'u1',
        isActive: true,
      } as Awaited<ReturnType<UserService['findById']>>);
      groupsRepo.findById.mockResolvedValue(null);

      await expect(
        service.getInvitePreviewForPendingInvitee('u1', 'g1'),
      ).rejects.toThrow(GroupNotFoundException);
    });
  });

  describe('listMyActiveGroups', () => {
    let service: GroupsService;
    let groupMembers: jest.Mocked<
      Pick<GroupMemberRepository, 'findActiveMembershipsWithGroupByUserId'>
    >;
    let users: jest.Mocked<Pick<UserService, 'findById'>>;

    beforeEach(async () => {
      groupMembers = {
        findActiveMembershipsWithGroupByUserId: jest.fn(),
      };
      users = { findById: jest.fn() };

      const moduleRef: TestingModule = await Test.createTestingModule({
        providers: [
          GroupsService,
          { provide: GroupRepository, useValue: {} },
          { provide: GroupMemberRepository, useValue: groupMembers },
          { provide: GroupInviteRepository, useValue: {} },
          { provide: GroupActivityRepository, useValue: groupActivityRepoMock },
          { provide: UserService, useValue: users },
          { provide: GroupMembershipRulesService, useValue: {} },
          { provide: PinoLogger, useValue: pinoLoggerMock },
        ],
      }).compile();

      service = moduleRef.get(GroupsService);
    });

    it('returns [] when user has no active memberships', async () => {
      users.findById.mockResolvedValue({
        id: 'u1',
        isActive: true,
      } as Awaited<ReturnType<UserService['findById']>>);
      groupMembers.findActiveMembershipsWithGroupByUserId.mockResolvedValue([]);

      await expect(service.listMyActiveGroups('u1')).resolves.toEqual([]);
    });

    it('maps nested group, joinedAt, and isCreator', async () => {
      users.findById.mockResolvedValue({
        id: 'u1',
        isActive: true,
      } as Awaited<ReturnType<UserService['findById']>>);

      const joinedAt = new Date('2024-03-15T10:00:00.000Z');
      groupMembers.findActiveMembershipsWithGroupByUserId.mockResolvedValue([
        {
          groupId: 'g1',
          userId: 'u1',
          role: GroupMemberRole.member,
          status: GroupMemberStatus.active,
          joinedAt,
          createdAt: joinedAt,
          id: 'm1',
          addedByUserId: null,
          group: {
            id: 'g1',
            name: 'Beach',
            type: 'trip',
            avatarUrl: 'https://x/a.png',
            createdByUserId: 'owner-99',
          },
        },
      ] as Awaited<
        ReturnType<
          GroupMemberRepository['findActiveMembershipsWithGroupByUserId']
        >
      >);

      await expect(service.listMyActiveGroups('u1')).resolves.toEqual([
        {
          groupId: 'g1',
          group: {
            id: 'g1',
            name: 'Beach',
            type: 'trip',
            avatar: 'https://x/a.png',
          },
          role: GroupMemberRole.member,
          joinedAt,
          isCreator: false,
        },
      ]);
    });

    it('sets isCreator true when createdByUserId matches user', async () => {
      users.findById.mockResolvedValue({
        id: 'u1',
        isActive: true,
      } as Awaited<ReturnType<UserService['findById']>>);

      const joinedAt = new Date('2024-01-01T00:00:00.000Z');
      groupMembers.findActiveMembershipsWithGroupByUserId.mockResolvedValue([
        {
          groupId: 'g2',
          userId: 'u1',
          role: GroupMemberRole.owner,
          status: GroupMemberStatus.active,
          joinedAt,
          createdAt: joinedAt,
          id: 'm2',
          addedByUserId: null,
          group: {
            id: 'g2',
            name: 'Mine',
            type: 'home',
            avatarUrl: null,
            createdByUserId: 'u1',
          },
        },
      ] as Awaited<
        ReturnType<
          GroupMemberRepository['findActiveMembershipsWithGroupByUserId']
        >
      >);

      await expect(service.listMyActiveGroups('u1')).resolves.toEqual([
        {
          groupId: 'g2',
          group: {
            id: 'g2',
            name: 'Mine',
            type: 'home',
            avatar: null,
          },
          role: GroupMemberRole.owner,
          joinedAt,
          isCreator: true,
        },
      ]);
    });

    it('throws UserNotFoundException when user missing', async () => {
      users.findById.mockResolvedValue(null);
      await expect(service.listMyActiveGroups('x')).rejects.toThrow(
        UserNotFoundException,
      );
    });

    it('throws AccountInactiveException when user inactive', async () => {
      users.findById.mockResolvedValue({
        id: 'u1',
        isActive: false,
      } as Awaited<ReturnType<UserService['findById']>>);
      await expect(service.listMyActiveGroups('u1')).rejects.toThrow(
        AccountInactiveException,
      );
    });
  });

  describe('getGroupProfileForActiveMember', () => {
    let service: GroupsService;
    let groupsRepo: jest.Mocked<Pick<GroupRepository, 'findById'>>;
    let users: jest.Mocked<Pick<UserService, 'findById'>>;
    let membershipRules: jest.Mocked<
      Pick<GroupMembershipRulesService, 'requireActiveMember'>
    >;

    beforeEach(async () => {
      groupsRepo = { findById: jest.fn() };
      users = { findById: jest.fn() };
      membershipRules = { requireActiveMember: jest.fn() };

      const moduleRef: TestingModule = await Test.createTestingModule({
        providers: [
          GroupsService,
          { provide: GroupRepository, useValue: groupsRepo },
          { provide: GroupMemberRepository, useValue: {} },
          { provide: GroupInviteRepository, useValue: {} },
          { provide: GroupActivityRepository, useValue: groupActivityRepoMock },
          { provide: UserService, useValue: users },
          { provide: GroupMembershipRulesService, useValue: membershipRules },
          { provide: PinoLogger, useValue: pinoLoggerMock },
        ],
      }).compile();

      service = moduleRef.get(GroupsService);
    });

    it('returns group when user is active and requireActiveMember passes', async () => {
      users.findById.mockResolvedValue({
        id: 'u1',
        isActive: true,
      } as Awaited<ReturnType<UserService['findById']>>);
      membershipRules.requireActiveMember.mockResolvedValue(undefined);
      const groupRow = {
        id: 'g1',
        name: 'Trip',
        type: 'trip',
        avatarUrl: null,
        createdByUserId: 'owner-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Awaited<ReturnType<GroupRepository['findById']>>;
      groupsRepo.findById.mockResolvedValue(groupRow);

      await expect(
        service.getGroupProfileForActiveMember('u1', 'g1'),
      ).resolves.toBe(groupRow);
      expect(membershipRules.requireActiveMember).toHaveBeenCalledWith(
        'u1',
        'g1',
      );
    });

    it('throws NotGroupMemberException when requireActiveMember rejects', async () => {
      users.findById.mockResolvedValue({
        id: 'u1',
        isActive: true,
      } as Awaited<ReturnType<UserService['findById']>>);
      membershipRules.requireActiveMember.mockRejectedValue(
        new NotGroupMemberException(),
      );

      await expect(
        service.getGroupProfileForActiveMember('u1', 'g1'),
      ).rejects.toThrow(NotGroupMemberException);
      expect(groupsRepo.findById).not.toHaveBeenCalled();
    });

    it('throws GroupNotFoundException when group row missing after membership check', async () => {
      users.findById.mockResolvedValue({
        id: 'u1',
        isActive: true,
      } as Awaited<ReturnType<UserService['findById']>>);
      membershipRules.requireActiveMember.mockResolvedValue(undefined);
      groupsRepo.findById.mockResolvedValue(null);

      await expect(
        service.getGroupProfileForActiveMember('u1', 'g1'),
      ).rejects.toThrow(GroupNotFoundException);
    });

    it('throws UserNotFoundException when user missing', async () => {
      users.findById.mockResolvedValue(null);
      await expect(
        service.getGroupProfileForActiveMember('x', 'g1'),
      ).rejects.toThrow(UserNotFoundException);
    });

    it('throws AccountInactiveException when user inactive', async () => {
      users.findById.mockResolvedValue({
        id: 'u1',
        isActive: false,
      } as Awaited<ReturnType<UserService['findById']>>);
      await expect(
        service.getGroupProfileForActiveMember('u1', 'g1'),
      ).rejects.toThrow(AccountInactiveException);
    });
  });
});
