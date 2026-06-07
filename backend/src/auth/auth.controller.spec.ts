import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('register', () => {
    it('should call authService.register with the dto', async () => {
      const dto = {
        email: 'a@b.com',
        name: 'A',
        universityName: 'MIT',
        password: 'pass',
      };
      const expected = {
        accessToken: 'tok',
        user: { id: '1', email: 'a@b.com' },
      };
      authService.register.mockResolvedValue(expected);

      const result = await controller.register(dto);
      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('login', () => {
    it('should call authService.login with the dto', async () => {
      const dto = { email: 'a@b.com', password: 'pass' };
      const expected = {
        accessToken: 'tok',
        user: { id: '1', email: 'a@b.com' },
      };
      authService.login.mockResolvedValue(expected);

      const result = await controller.login(dto);
      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });
});
