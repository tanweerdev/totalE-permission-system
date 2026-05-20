import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  PermissionFeature,
  UserPermission,
} from '../auth/entities/user-permission.entity';
import { Facility } from './entities/facility.entity';
import {
  FacilityContext,
  ScopedPermissionFeature,
} from '../common/interfaces/facility-context.interface';

const CACHE_TTL_SECONDS = 300;
const SCOPED_FEATURES: ScopedPermissionFeature[] = [
  'canViewAnalytics',
  'canViewPulse',
  'canViewSurvey',
  'canExportAnalytics',
];
const ALL_FEATURES: PermissionFeature[] = [
  'canViewAnalytics',
  'canViewPulse',
  'canViewSurvey',
  'canExportAnalytics',
  'canManagePermissions',
];

interface CachedFacilityContext {
  userId: number;
  featureScopes: Record<ScopedPermissionFeature, number[]>;
  featureFlags: Record<PermissionFeature, boolean>;
}

interface OrganizationFacilityRow {
  rootId: number;
  facilityId: number;
}

@Injectable()
export class FacilityScopeService {
  private readonly logger = new Logger(FacilityScopeService.name);

  constructor(
    @InjectRepository(UserPermission)
    private readonly permissionRepo: Repository<UserPermission>,
    @InjectRepository(Facility)
    private readonly facilityRepo: Repository<Facility>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async computeAccessContext(userId: number): Promise<FacilityContext> {
    const cacheKey = `facility-scope:user:${userId}`;
    const cached = await this.cacheManager.get<CachedFacilityContext>(cacheKey);

    if (cached) {
      this.logger.debug(`Facility scope cache hit for user ${userId}`);
      return FacilityContext.fromCached(cached);
    }

    const permissions = await this.permissionRepo.find({
      where: { userId, isActive: true },
    });

    if (!permissions.length) {
      return FacilityContext.empty(userId);
    }

    const featureFlags = ALL_FEATURES.reduce<Record<PermissionFeature, boolean>>(
      (acc, feature) => {
        acc[feature] = permissions.some(permission => permission[feature]);
        return acc;
      },
      {
        canViewAnalytics: false,
        canViewPulse: false,
        canViewSurvey: false,
        canExportAnalytics: false,
        canManagePermissions: false,
      },
    );

    const organizationIdsByFeature = this.collectOrganizationIdsByFeature(permissions);
    const facilityIdsByFeature = this.collectDirectFacilityIdsByFeature(permissions);

    const allOrganizationIds = [...new Set(SCOPED_FEATURES.flatMap(feature => organizationIdsByFeature[feature]))];
    const allDirectFacilityIds = [...new Set(SCOPED_FEATURES.flatMap(feature => facilityIdsByFeature[feature]))];

    const organizationFacilities = await this.resolveFacilitiesForOrganizations(allOrganizationIds);
    const activeDirectFacilityIds = await this.resolveDirectFacilities(allDirectFacilityIds);

    const featureScopes = SCOPED_FEATURES.reduce<Record<ScopedPermissionFeature, number[]>>(
      (acc, feature) => {
        const ids = new Set<number>();

        organizationIdsByFeature[feature].forEach(rootId => {
          organizationFacilities.get(rootId)?.forEach(facilityId => ids.add(facilityId));
        });

        facilityIdsByFeature[feature].forEach(facilityId => {
          if (activeDirectFacilityIds.has(facilityId)) {
            ids.add(facilityId);
          }
        });

        acc[feature] = Array.from(ids);
        return acc;
      },
      {
        canViewAnalytics: [],
        canViewPulse: [],
        canViewSurvey: [],
        canExportAnalytics: [],
      },
    );

    const context = new FacilityContext(userId, featureScopes, featureFlags);

    await this.cacheManager.set(cacheKey, context.toJSON(), CACHE_TTL_SECONDS * 1000);
    this.logger.debug(`Resolved scoped facilities for user ${userId}`);

    return context;
  }

  async invalidateCache(userId: number): Promise<void> {
    await this.cacheManager.del(`facility-scope:user:${userId}`);
  }

  async invalidateAllCaches(): Promise<void> {
    if (typeof this.cacheManager.reset === 'function') {
      await this.cacheManager.reset();
    }
  }

  private collectOrganizationIdsByFeature(
    permissions: UserPermission[],
  ): Record<ScopedPermissionFeature, number[]> {
    const result: Record<ScopedPermissionFeature, number[]> = {
      canViewAnalytics: [],
      canViewPulse: [],
      canViewSurvey: [],
      canExportAnalytics: [],
    };

    permissions.forEach(permission => {
      if (!permission.organizationId) {
        return;
      }

      SCOPED_FEATURES.forEach(feature => {
        if (permission[feature]) {
          result[feature].push(permission.organizationId as number);
        }
      });
    });

    return result;
  }

  private collectDirectFacilityIdsByFeature(
    permissions: UserPermission[],
  ): Record<ScopedPermissionFeature, number[]> {
    const result: Record<ScopedPermissionFeature, number[]> = {
      canViewAnalytics: [],
      canViewPulse: [],
      canViewSurvey: [],
      canExportAnalytics: [],
    };

    permissions.forEach(permission => {
      if (!permission.facilityId) {
        return;
      }

      SCOPED_FEATURES.forEach(feature => {
        if (permission[feature]) {
          result[feature].push(permission.facilityId as number);
        }
      });
    });

    return result;
  }

  private async resolveFacilitiesForOrganizations(
    organizationIds: number[],
  ): Promise<Map<number, Set<number>>> {
    const result = new Map<number, Set<number>>();

    if (!organizationIds.length) {
      return result;
    }

    const rows = await this.facilityRepo.query(
      `
      WITH RECURSIVE subtree AS (
        SELECT id, parent_id, id AS root_id
        FROM organizations
        WHERE id = ANY($1::int[])
          AND is_active = true

        UNION ALL

        SELECT o.id, o.parent_id, s.root_id
        FROM organizations o
        INNER JOIN subtree s ON o.parent_id = s.id
        WHERE o.is_active = true
      )
      SELECT DISTINCT subtree.root_id AS "rootId", f.id AS "facilityId"
      FROM subtree
      INNER JOIN facilities f ON f.organization_id = subtree.id
      WHERE f.is_active = true
      `,
      [organizationIds],
    );

    (rows as OrganizationFacilityRow[]).forEach(({ rootId, facilityId }) => {
      const ids = result.get(Number(rootId)) ?? new Set<number>();
      ids.add(Number(facilityId));
      result.set(Number(rootId), ids);
    });

    return result;
  }

  private async resolveDirectFacilities(facilityIds: number[]): Promise<Set<number>> {
    if (!facilityIds.length) {
      return new Set<number>();
    }

    const rows: Array<{ id: number }> = await this.facilityRepo.query(
      `
      SELECT id
      FROM facilities
      WHERE id = ANY($1::int[])
        AND is_active = true
      `,
      [facilityIds],
    );

    return new Set(rows.map(row => Number(row.id)));
  }
}
