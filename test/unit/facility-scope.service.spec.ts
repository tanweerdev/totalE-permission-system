import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { FacilityScopeService } from '../../src/facility/facility-scope.service';
import { UserPermission } from '../../src/auth/entities/user-permission.entity';
import { Facility } from '../../src/facility/entities/facility.entity';
import { FacilityContext } from '../../src/common/interfaces/facility-context.interface';

const mockPermissionRepo = () => ({
  find: jest.fn(),
});

const mockFacilityRepo = () => ({
  query: jest.fn(),
});

const mockCacheManager = () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  reset: jest.fn(),
});

describe('FacilityScopeService', () => {
  let service: FacilityScopeService;
  let permissionRepo: ReturnType<typeof mockPermissionRepo>;
  let facilityRepo: ReturnType<typeof mockFacilityRepo>;
  let cache: ReturnType<typeof mockCacheManager>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FacilityScopeService,
        { provide: getRepositoryToken(UserPermission), useFactory: mockPermissionRepo },
        { provide: getRepositoryToken(Facility), useFactory: mockFacilityRepo },
        { provide: CACHE_MANAGER, useFactory: mockCacheManager },
      ],
    }).compile();

    service = module.get(FacilityScopeService);
    permissionRepo = module.get(getRepositoryToken(UserPermission));
    facilityRepo = module.get(getRepositoryToken(Facility));
    cache = module.get(CACHE_MANAGER);
  });

  describe('computeAccessContext', () => {
    it('returns cached context when cache hit', async () => {
      cache.get.mockResolvedValue({
        userId: 42,
        featureScopes: {
          canViewAnalytics: [1, 2, 3],
          canViewPulse: [1, 2, 3],
          canViewSurvey: [],
          canExportAnalytics: [],
        },
        featureFlags: {
          canViewAnalytics: true,
          canViewPulse: true,
          canViewSurvey: false,
          canExportAnalytics: false,
          canManagePermissions: false,
        },
      });

      const result = await service.computeAccessContext(42);

      expect(result).toBeInstanceOf(FacilityContext);
      expect(result.toArray('canViewAnalytics')).toEqual(expect.arrayContaining([1, 2, 3]));
      expect(permissionRepo.find).not.toHaveBeenCalled();
    });

    it('returns empty context when user has no permissions', async () => {
      cache.get.mockResolvedValue(null);
      permissionRepo.find.mockResolvedValue([]);

      const result = await service.computeAccessContext(99);

      expect(result.isEmptyFor('canViewAnalytics')).toBe(true);
    });

    it('unions organization and direct facility grants per feature', async () => {
      cache.get.mockResolvedValue(null);
      permissionRepo.find.mockResolvedValue([
        { organizationId: 10, facilityId: null, canViewAnalytics: true, canViewPulse: true },
        { organizationId: null, facilityId: 99, canViewAnalytics: true, canViewPulse: false },
      ]);
      facilityRepo.query
        .mockResolvedValueOnce([
          { rootId: 10, facilityId: 1 },
          { rootId: 10, facilityId: 2 },
        ])
        .mockResolvedValueOnce([{ id: 99 }]);

      const result = await service.computeAccessContext(7);

      expect(result.toArray('canViewAnalytics')).toEqual(expect.arrayContaining([1, 2, 99]));
      expect(result.toArray('canViewPulse')).toEqual(expect.arrayContaining([1, 2]));
    });

    it('deduplicates overlapping organization results', async () => {
      cache.get.mockResolvedValue(null);
      permissionRepo.find.mockResolvedValue([
        { organizationId: 5, facilityId: null, canViewAnalytics: true },
        { organizationId: 10, facilityId: null, canViewAnalytics: true },
      ]);
      facilityRepo.query
        .mockResolvedValueOnce([
          { rootId: 5, facilityId: 1 },
          { rootId: 10, facilityId: 1 },
          { rootId: 10, facilityId: 2 },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.computeAccessContext(7);

      expect(result.toArray('canViewAnalytics')).toHaveLength(2);
    });

    it('caches the result after the first DB query', async () => {
      cache.get.mockResolvedValue(null);
      permissionRepo.find.mockResolvedValue([
        { organizationId: 1, facilityId: null, canViewAnalytics: true, canManagePermissions: true },
      ]);
      facilityRepo.query
        .mockResolvedValueOnce([{ rootId: 1, facilityId: 5 }])
        .mockResolvedValueOnce([]);

      await service.computeAccessContext(42);

      expect(cache.set).toHaveBeenCalledWith(
        'facility-scope:user:42',
        expect.objectContaining({
          userId: 42,
          featureScopes: expect.objectContaining({
            canViewAnalytics: [5],
          }),
          featureFlags: expect.objectContaining({
            canManagePermissions: true,
          }),
        }),
        expect.any(Number),
      );
    });
  });

  describe('invalidateCache', () => {
    it('deletes the users cache key', async () => {
      await service.invalidateCache(42);
      expect(cache.del).toHaveBeenCalledWith('facility-scope:user:42');
    });
  });

  describe('invalidateAllCaches', () => {
    it('resets the cache store when available', async () => {
      await service.invalidateAllCaches();
      expect(cache.reset).toHaveBeenCalled();
    });
  });
});
