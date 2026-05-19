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

  describe('computeAuthorizedFacilities', () => {
    it('returns cached context when cache hit', async () => {
      cache.get.mockResolvedValue([1, 2, 3]);

      const result = await service.computeAuthorizedFacilities(42);

      expect(result).toBeInstanceOf(FacilityContext);
      expect(result.toArray()).toEqual(expect.arrayContaining([1, 2, 3]));
      expect(permissionRepo.find).not.toHaveBeenCalled();
    });

    it('returns empty context when user has no permissions', async () => {
      cache.get.mockResolvedValue(null);
      permissionRepo.find.mockResolvedValue([]);

      const result = await service.computeAuthorizedFacilities(99);

      expect(result.isEmpty()).toBe(true);
    });

    it('unions facilities from multiple permission grants (additive model)', async () => {
      cache.get.mockResolvedValue(null);
      permissionRepo.find.mockResolvedValue([
        { orgNodeId: 10 },
        { orgNodeId: 20 },
      ]);
      facilityRepo.query.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);

      const result = await service.computeAuthorizedFacilities(7);

      expect(result.toArray()).toEqual(expect.arrayContaining([1, 2, 3]));
    });

    it('deduplicates facilities when permission nodes overlap in the hierarchy', async () => {
      cache.get.mockResolvedValue(null);
      permissionRepo.find.mockResolvedValue([
        { orgNodeId: 5 },
        { orgNodeId: 10 },
      ]);
      facilityRepo.query.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 1 }]);

      const result = await service.computeAuthorizedFacilities(7);

      expect(result.toArray()).toHaveLength(2);
      expect(result.contains(1)).toBe(true);
    });

    it('caches the result after the first DB query', async () => {
      cache.get.mockResolvedValue(null);
      permissionRepo.find.mockResolvedValue([{ orgNodeId: 1 }]);
      facilityRepo.query.mockResolvedValue([{ id: 5 }]);

      await service.computeAuthorizedFacilities(42);

      expect(cache.set).toHaveBeenCalledWith('facility-scope:user:42', [5], expect.any(Number));
    });
  });

  describe('invalidateCache', () => {
    it('deletes the users cache key', async () => {
      await service.invalidateCache(42);
      expect(cache.del).toHaveBeenCalledWith('facility-scope:user:42');
    });
  });
});
