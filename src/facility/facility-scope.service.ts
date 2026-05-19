import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { UserPermission } from '../auth/entities/user-permission.entity';
import { Facility } from './entities/facility.entity';
import { FacilityContext } from '../common/interfaces/facility-context.interface';

const CACHE_TTL_SECONDS = 300;

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

  async computeAuthorizedFacilities(userId: number): Promise<FacilityContext> {
    const cacheKey = `facility-scope:user:${userId}`;
    const cached = await this.cacheManager.get<number[]>(cacheKey);

    if (cached !== undefined && cached !== null) {
      this.logger.debug(`Facility scope cache hit for user ${userId}`);
      return new FacilityContext(userId, cached);
    }

    const permissions = await this.permissionRepo.find({
      where: { userId, isActive: true },
      select: ['orgNodeId'],
    });

    if (!permissions.length) {
      return new FacilityContext(userId, []);
    }

    const orgNodeIds = [...new Set(permissions.map(p => p.orgNodeId))];
    const facilityIds = await this.resolveFacilitiesForNodes(orgNodeIds);

    await this.cacheManager.set(cacheKey, facilityIds, CACHE_TTL_SECONDS * 1000);
    this.logger.debug(`Resolved ${facilityIds.length} facilities for user ${userId}`);

    return new FacilityContext(userId, facilityIds);
  }

  private async resolveFacilitiesForNodes(orgNodeIds: number[]): Promise<number[]> {
    if (!orgNodeIds.length) return [];

    const rows: Array<{ id: number }> = await this.facilityRepo.query(
      `
      WITH RECURSIVE subtree AS (
        SELECT id, "parentId"
        FROM org_nodes
        WHERE id = ANY($1::int[])

        UNION ALL

        SELECT n.id, n."parentId"
        FROM org_nodes n
        INNER JOIN subtree s ON n."parentId" = s.id
      )
      SELECT DISTINCT f.id
      FROM facilities f
      WHERE f."orgNodeId" IN (SELECT id FROM subtree)
        AND f."isActive" = true
      `,
      [orgNodeIds],
    );

    return rows.map(r => r.id);
  }

  async invalidateCache(userId: number): Promise<void> {
    await this.cacheManager.del(`facility-scope:user:${userId}`);
  }
}
