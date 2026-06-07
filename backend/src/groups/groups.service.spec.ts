import { Test, TestingModule } from '@nestjs/testing';
import { GroupsService } from './groups.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GroupsService', () => {
  let service: GroupsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      group: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      university: {
        upsert: jest.fn(),
      },
      chatMessage: {
        findMany: jest.fn(),
      },
      course: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      membership: {
        create: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [GroupsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
  });

  describe('getMessages', () => {
    it('should return messages if group exists', async () => {
      prisma.group.findUnique.mockResolvedValue({
        id: 'group-1',
        name: 'Test',
      });
      const mockMessages = [{ id: 'msg-1', content: 'Hello' }];
      prisma.chatMessage.findMany.mockResolvedValue(mockMessages);

      const result = await service.getMessages('group-1');
      expect(result).toEqual(mockMessages);
      expect(prisma.chatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { groupId: 'group-1' } }),
      );
    });

    it('should create group if it does not exist and user exists', async () => {
      prisma.group.findUnique.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });
      prisma.group.create.mockResolvedValue({ id: 'group-1' });
      prisma.chatMessage.findMany.mockResolvedValue([]);

      await service.getMessages('group-1');
      expect(prisma.group.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: 'group-1',
            name: 'CS-229 Neural Network Room',
          }),
        }),
      );
    });

    it('should create university and user if neither exists', async () => {
      prisma.group.findUnique.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.university.upsert.mockResolvedValue({ id: 'uni-1' });
      prisma.user.create = jest.fn().mockResolvedValue({ id: 'new-user' });
      prisma.group.create.mockResolvedValue({ id: 'group-2' });
      prisma.chatMessage.findMany.mockResolvedValue([]);

      await service.getMessages('group-2');
      expect(prisma.university.upsert).toHaveBeenCalled();
    });
  });

  describe('createGroup', () => {
    it('should create a group and enroll creator as LEADER', async () => {
      prisma.group.create.mockResolvedValue({
        id: 'group-123',
        name: 'My Group',
      });
      prisma.membership.create.mockResolvedValue({});

      const result = await service.createGroup('My Group', 'user-1');
      expect(result).toEqual({ id: 'group-123', name: 'My Group' });
      expect(prisma.membership.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1', role: 'LEADER' }),
        }),
      );
    });

    it('should link a course if courseCode is provided', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        universityId: 'uni-1',
      });
      prisma.course.findFirst.mockResolvedValue(null);
      prisma.course.create.mockResolvedValue({ id: 'course-1' });
      prisma.group.create.mockResolvedValue({ id: 'group-1', name: 'Room' });
      prisma.membership.create.mockResolvedValue({});

      await service.createGroup('Room', 'user-1', 'cs101');
      expect(prisma.course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: 'CS101',
            universityId: 'uni-1',
          }),
        }),
      );
    });
  });

  describe('addGroupMember', () => {
    it('should throw if group not found', async () => {
      prisma.group.findUnique.mockResolvedValue(null);
      await expect(service.addGroupMember('g1', 'conn1', 'u1')).rejects.toThrow(
        'Group not found',
      );
    });

    it('should throw if target user not found', async () => {
      prisma.group.findUnique.mockResolvedValue({ id: 'g1' });
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.addGroupMember('g1', 'conn1', 'u1')).rejects.toThrow(
        'User with this Connection ID not found',
      );
    });

    it('should upsert membership for a valid user', async () => {
      prisma.group.findUnique.mockResolvedValue({ id: 'g1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'target-user' });
      prisma.membership.upsert.mockResolvedValue({ id: 'mem-1' });

      const result = await service.addGroupMember('g1', 'conn1', 'u1');
      expect(result).toEqual({ id: 'mem-1' });
      expect(prisma.membership.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { groupId_userId: { groupId: 'g1', userId: 'target-user' } },
        }),
      );
    });
  });
});
