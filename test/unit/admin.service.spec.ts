import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminService } from '../../src/admin/admin.service';
import { User } from '../../src/auth/entities/user.entity';
import { UserPermission } from '../../src/auth/entities/user-permission.entity';
import { Organization } from '../../src/org/entities/organization.entity';
import { Facility } from '../../src/facility/entities/facility.entity';
import { FacilityScopeService } from '../../src/facility/facility-scope.service';

const mockUserRepo = () => ({
  findOne: jest.fn(),
});

const mockPermissionRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((value) => value),
  save: jest.fn(),
  merge: jest.fn((entity, value) => ({ ...entity, ...value })),
});

const mockOrganizationRepo = () => ({
  findOne: jest.fn(),
});

const mockFacilityRepo = () => ({
  findOne: jest.fn(),
  update: jest.fn(),
});

const mockFacilityScopeService = () => ({
  invalidateCache: jest.fn(),
  invalidateAllCaches: jest.fn(),
});

describe('AdminService', () => {
  let service: AdminService;
  let userRepo: ReturnType<typeof mockUserRepo>;
  let permissionRepo: ReturnType<typeof mockPermissionRepo>;
  let organizationRepo: ReturnType<typeof mockOrganizationRepo>;
  let facilityRepo: ReturnType<typeof mockFacilityRepo>;
  let facilityScopeService: ReturnType<typeof mockFacilityScopeService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(User), useFactory: mockUserRepo },
        { provide: getRepositoryToken(UserPermission), useFactory: mockPermissionRepo },
        { provide: getRepositoryToken(Organization), useFactory: mockOrganizationRepo },
        { provide: getRepositoryToken(Facility), useFactory: mockFacilityRepo },
        { provide: FacilityScopeService, useFactory: mockFacilityScopeService },
      ],
    }).compile();

    service = module.get(AdminService);
    userRepo = module.get(getRepositoryToken(User));
    permissionRepo = module.get(getRepositoryToken(UserPermission));
    organizationRepo = module.get(getRepositoryToken(Organization));
    facilityRepo = module.get(getRepositoryToken(Facility));
    facilityScopeService = module.get(FacilityScopeService);
  });

  it('lists user permissions after validating the user exists', async () => {
    userRepo.findOne.mockResolvedValue({ id: 7, isActive: true });
    permissionRepo.find.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const result = await service.listUserPermissions(7);

    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    expect(permissionRepo.find).toHaveBeenCalledWith({
      where: { userId: 7 },
      order: { id: 'ASC' },
    });
  });

  it('adds an organization permission and invalidates the user cache', async () => {
    userRepo.findOne.mockResolvedValue({ id: 7, isActive: true });
    organizationRepo.findOne.mockResolvedValue({ id: 11, isActive: true });
    permissionRepo.save.mockResolvedValue({ id: 99, userId: 7, organizationId: 11 });

    const result = await service.addUserPermission(
      7,
      {
        organizationId: 11,
        canViewAnalytics: true,
        canViewPulse: true,
        canViewSurvey: false,
        canExportAnalytics: false,
        canManagePermissions: false,
      },
      1,
    );

    expect(result).toEqual({ id: 99, userId: 7, organizationId: 11 });
    expect(permissionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        organizationId: 11,
        facilityId: null,
      }),
    );
    expect(facilityScopeService.invalidateCache).toHaveBeenCalledWith(7);
  });

  it('rejects a permission with no enabled features', async () => {
    userRepo.findOne.mockResolvedValue({ id: 7, isActive: true });
    organizationRepo.findOne.mockResolvedValue({ id: 11, isActive: true });

    await expect(
      service.addUserPermission(
        7,
        {
          organizationId: 11,
          canViewAnalytics: false,
          canViewPulse: false,
          canViewSurvey: false,
          canExportAnalytics: false,
          canManagePermissions: false,
        },
        1,
      ),
    ).rejects.toThrow('At least one feature permission must be enabled');
  });

  it('rejects granting manage-permissions to yourself', async () => {
    await expect(
      service.addUserPermission(
        7,
        {
          organizationId: 11,
          canViewAnalytics: true,
          canViewPulse: false,
          canViewSurvey: false,
          canExportAnalytics: false,
          canManagePermissions: true,
        },
        7,
      ),
    ).rejects.toThrow('Admin cannot grant manage-permissions to themselves');
  });

  it('updates a permission and invalidates the target user cache', async () => {
    permissionRepo.findOne.mockResolvedValue({
      id: 5,
      userId: 9,
      organizationId: 11,
      facilityId: null,
      canViewAnalytics: true,
      canViewPulse: true,
      canViewSurvey: false,
      canExportAnalytics: false,
      canManagePermissions: false,
      isActive: true,
    });
    facilityRepo.findOne.mockResolvedValue({ id: 42, isActive: true });
    permissionRepo.save.mockResolvedValue({ id: 5, userId: 9, facilityId: 42 });

    const result = await service.updateUserPermission(
      5,
      {
        organizationId: undefined,
        facilityId: 42,
        canViewSurvey: true,
      },
      1,
    );

    expect(result).toEqual({ id: 5, userId: 9, facilityId: 42 });
    expect(facilityScopeService.invalidateCache).toHaveBeenCalledWith(9);
  });

  it('deactivates a permission through removeUserPermission', async () => {
    permissionRepo.findOne.mockResolvedValue({
      id: 5,
      userId: 9,
      canManagePermissions: false,
      isActive: true,
    });
    permissionRepo.save.mockResolvedValue({ id: 5, isActive: false });

    const result = await service.removeUserPermission(5, 1);

    expect(result).toEqual({ message: 'Permission 5 is now inactive' });
    expect(facilityScopeService.invalidateCache).toHaveBeenCalledWith(9);
  });

  it('rejects deactivating your own manage-permissions grant', async () => {
    permissionRepo.findOne.mockResolvedValue({
      id: 5,
      userId: 1,
      canManagePermissions: true,
      isActive: true,
    });

    await expect(service.setUserPermissionActiveState(5, false, 1)).rejects.toThrow(
      'Admin cannot deactivate their own manage-permissions grant',
    );
  });

  it('updates a facility organization and invalidates all cached scopes', async () => {
    facilityRepo.findOne.mockResolvedValue({ id: 50, name: 'Clinic A', isActive: true });
    organizationRepo.findOne.mockResolvedValue({ id: 12, name: 'Region B', level: 1, isActive: true });

    const result = await service.updateFacilityOrganization(50, { organizationId: 12 });

    expect(facilityRepo.update).toHaveBeenCalledWith({ id: 50 }, { organizationId: 12 });
    expect(facilityScopeService.invalidateAllCaches).toHaveBeenCalled();
    expect(result.message).toContain('Region B');
  });
});
