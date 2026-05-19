import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../../src/auth/auth.service';
import { User } from '../../src/auth/entities/user.entity';

const mockUserRepo = () => ({
  findOne: jest.fn(),
});

const mockJwtService = () => ({
  signAsync: jest.fn(),
});

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: ReturnType<typeof mockUserRepo>;
  let jwtService: ReturnType<typeof mockJwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useFactory: mockUserRepo },
        { provide: JwtService, useFactory: mockJwtService },
      ],
    }).compile();

    service = module.get(AuthService);
    userRepo = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
  });

  it('returns a token when email and password are valid', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 1,
      email: 'admin@totale.com',
      passwordHash: '$2b$04$z1WGGx/8JDeoVQ77QAb0H.AToxfaeyoe7LXkDm2dKk9b/0gSibgDO',
      isActive: true,
    });
    jwtService.signAsync.mockResolvedValue('token-123');

    const result = await service.login({
      email: 'admin@totale.com',
      password: 'password123',
    });

    expect(result).toEqual({
      accessToken: 'token-123',
      user: {
        id: 1,
        email: 'admin@totale.com',
      },
    });
  });

  it('rejects an unknown email', async () => {
    userRepo.findOne.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'missing@totale.com',
        password: 'password123',
      }),
    ).rejects.toThrow('Invalid credentials');
  });

  it('rejects an invalid password', async () => {
    userRepo.findOne.mockResolvedValue({
      id: 1,
      email: 'admin@totale.com',
      passwordHash: '$2b$04$z1WGGx/8JDeoVQ77QAb0H.AToxfaeyoe7LXkDm2dKk9b/0gSibgDO',
      isActive: true,
    });

    await expect(
      service.login({
        email: 'admin@totale.com',
        password: 'wrong-password',
      }),
    ).rejects.toThrow('Invalid credentials');
  });
});
