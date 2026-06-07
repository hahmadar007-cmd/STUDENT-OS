import { Test, TestingModule } from '@nestjs/testing';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

describe('GroupsController', () => {
  let controller: GroupsController;
  let groupsService: any;
  let jwtService: any;

  beforeEach(async () => {
    groupsService = {
      createGroup: jest.fn(),
      getMessages: jest.fn(),
      addGroupMember: jest.fn(),
    };

    jwtService = {
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupsController],
      providers: [
        { provide: GroupsService, useValue: groupsService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    controller = module.get<GroupsController>(GroupsController);
  });

  describe('createGroup', () => {
    it('should throw UnauthorizedException if no auth header', async () => {
      await expect(
        controller.createGroup('', { name: 'Test' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });
      await expect(
        controller.createGroup('Bearer bad-token', { name: 'Test' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should call groupsService.createGroup with decoded user', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1' });
      groupsService.createGroup.mockResolvedValue({ id: 'g1' });

      const result = await controller.createGroup('Bearer valid-token', {
        name: 'Room',
        courseCode: 'CS101',
      });
      expect(groupsService.createGroup).toHaveBeenCalledWith(
        'Room',
        'user-1',
        'CS101',
      );
      expect(result).toEqual({ id: 'g1' });
    });
  });

  describe('getMessages', () => {
    it('should return messages for the groupId', async () => {
      groupsService.getMessages.mockResolvedValue([{ id: 'm1' }]);
      const result = await controller.getMessages('group-1');
      expect(result).toEqual([{ id: 'm1' }]);
    });
  });

  describe('addGroupMember', () => {
    it('should throw UnauthorizedException if no auth header', async () => {
      await expect(
        controller.addGroupMember('', 'g1', { connectionId: 'c1' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should call groupsService.addGroupMember with correct args', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1' });
      groupsService.addGroupMember.mockResolvedValue({ id: 'mem-1' });

      const result = await controller.addGroupMember('Bearer tok', 'g1', {
        connectionId: 'c1',
      });
      expect(groupsService.addGroupMember).toHaveBeenCalledWith(
        'g1',
        'c1',
        'user-1',
      );
      expect(result).toEqual({ id: 'mem-1' });
    });
  });
});
