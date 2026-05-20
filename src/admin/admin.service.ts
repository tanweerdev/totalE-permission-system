import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { UserPermission } from '../auth/entities/user-permission.entity';
import { Organization } from '../org/entities/organization.entity';
import { Facility } from '../facility/entities/facility.entity';
import { FacilityScopeService } from '../facility/facility-scope.service';
import { CreateUserPermissionDto } from './dto/create-user-permission.dto';
import { UpdateUserPermissionDto } from './dto/update-user-permission.dto';
import { UpdateFacilityOrganizationDto } from './dto/update-facility-organization.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserPermission)
    private readonly permissionRepo: Repository<UserPermission>,
    @InjectRepository(Organization)
    private readonly organizationRepo: Repository<Organization>,
    @InjectRepository(Facility)
    private readonly facilityRepo: Repository<Facility>,
    private readonly facilityScopeService: FacilityScopeService,
  ) {}
  
  async listOrganizations(): Promise<{ id: number; name: string; level: number; parentId: number | null }[]> {
    const orgs = await this.organizationRepo.find({
      where: { isActive: true },
      select: ['id', 'name', 'level', 'parentId'],
      order: { level: 'ASC', name: 'ASC' },
    });
    return orgs.map(o => ({ id: o.id, name: o.name, level: o.level, parentId: o.parentId }));
  }

  async listFacilitiesByOrg(organizationId: number): Promise<{ id: number; name: string; code: string }[]> {
    const facilities = await this.facilityRepo.find({
      where: { organizationId, isActive: true },
      select: ['id', 'name', 'code'],
      order: { name: 'ASC' },
    });
    return facilities.map(f => ({ id: f.id, name: f.name, code: f.code }));
  }

  async listUsers(
    page: number,
    limit: number,
    search?: string,
  ): Promise<{ data: { id: number; email: string; isActive: boolean }[]; total: number; page: number; limit: number }> {
    const qb = this.userRepo.createQueryBuilder('u')
      .select(['u.id', 'u.email', 'u.isActive'])
      .orderBy('u.id', 'ASC');

    if (search?.trim()) {
      qb.where('u.email ILIKE :search', { search: `%${search.trim()}%` });
    }

    const total = await qb.getCount();
    const users = await qb.skip((page - 1) * limit).take(limit).getMany();

    return {
      data: users.map(u => ({ id: u.id, email: u.email, isActive: u.isActive })),
      total,
      page,
      limit,
    };
  }

  async listUserPermissions(targetUserId: number): Promise<(UserPermission & { organizationName: string | null; facilityName: string | null })[]> {
    await this.ensureUserExists(targetUserId);

    const rows = await this.permissionRepo
      .createQueryBuilder('p')
      .leftJoin('p.organization', 'org')
      .leftJoin('p.facility', 'fac')
      .addSelect(['org.name', 'fac.name'])
      .where('p.userId = :userId', { userId: targetUserId })
      .orderBy('p.id', 'ASC')
      .getMany();

    return rows.map((p: any) => ({
      ...p,
      organizationName: p.organization?.name ?? null,
      facilityName: p.facility?.name ?? null,
    }));
  }

  async addUserPermission(
    targetUserId: number,
    dto: CreateUserPermissionDto,
    requestingUserId: number,
  ): Promise<UserPermission> {
    if (targetUserId === requestingUserId && dto.canManagePermissions) {
      throw new BadRequestException('Admin cannot grant manage-permissions to themselves');
    }

    await this.ensureUserExists(targetUserId);
    await this.validatePermissionTarget(dto.organizationId ?? null, dto.facilityId ?? null);
    this.ensureFeatureSelection(dto);

    const permission = await this.permissionRepo.save(
      this.permissionRepo.create({
        userId: targetUserId,
        organizationId: dto.organizationId ?? null,
        facilityId: dto.facilityId ?? null,
        canViewAnalytics: dto.canViewAnalytics,
        canViewPulse: dto.canViewPulse,
        canViewSurvey: dto.canViewSurvey,
        canExportAnalytics: dto.canExportAnalytics,
        canManagePermissions: dto.canManagePermissions,
        isActive: true,
      }),
    );

    await this.facilityScopeService.invalidateCache(targetUserId);
    return permission;
  }

  async updateUserPermission(
    permissionId: number,
    dto: UpdateUserPermissionDto,
    requestingUserId: number,
  ): Promise<UserPermission> {
    const permission = await this.permissionRepo.findOne({
      where: { id: permissionId },
    });
    if (!permission) {
      throw new NotFoundException(`Permission ${permissionId} not found`);
    }

    if (permission.userId === requestingUserId && dto.canManagePermissions === true) {
      throw new BadRequestException('Admin cannot grant manage-permissions to themselves');
    }

    const organizationId =
      dto.organizationId !== undefined
        ? dto.organizationId
        : dto.facilityId !== undefined
          ? null
          : permission.organizationId;
    const facilityId =
      dto.facilityId !== undefined
        ? dto.facilityId
        : dto.organizationId !== undefined
          ? null
          : permission.facilityId;

    await this.validatePermissionTarget(organizationId ?? null, facilityId ?? null);

    const nextState = this.permissionRepo.merge(permission, {
      organizationId: organizationId ?? null,
      facilityId: facilityId ?? null,
      canViewAnalytics: dto.canViewAnalytics ?? permission.canViewAnalytics,
      canViewPulse: dto.canViewPulse ?? permission.canViewPulse,
      canViewSurvey: dto.canViewSurvey ?? permission.canViewSurvey,
      canExportAnalytics: dto.canExportAnalytics ?? permission.canExportAnalytics,
      canManagePermissions: dto.canManagePermissions ?? permission.canManagePermissions,
      isActive: dto.isActive ?? permission.isActive,
    });

    this.ensurePersistedFeatureSelection(nextState);

    const updated = await this.permissionRepo.save(nextState);
    await this.facilityScopeService.invalidateCache(permission.userId);
    return updated;
  }

  async removeUserPermission(
    permissionId: number,
    requestingUserId: number,
  ): Promise<{ message: string }> {
    return this.setUserPermissionActiveState(permissionId, false, requestingUserId);
  }

  async setUserPermissionActiveState(
    permissionId: number,
    isActive: boolean,
    requestingUserId: number,
  ): Promise<{ message: string }> {
    const permission = await this.permissionRepo.findOne({
      where: { id: permissionId },
    });
    if (!permission) {
      throw new NotFoundException(`Permission ${permissionId} not found`);
    }

    if (permission.userId === requestingUserId && permission.canManagePermissions && !isActive) {
      throw new BadRequestException('Admin cannot deactivate their own manage-permissions grant');
    }

    permission.isActive = isActive;
    await this.permissionRepo.save(permission);
    await this.facilityScopeService.invalidateCache(permission.userId);

    return {
      message: `Permission ${permissionId} is now ${isActive ? 'active' : 'inactive'}`,
    };
  }

  async updateFacilityOrganization(
    facilityId: number,
    dto: UpdateFacilityOrganizationDto,
  ): Promise<{ message: string }> {
    const facility = await this.facilityRepo.findOne({
      where: { id: facilityId, isActive: true },
    });
    if (!facility) {
      throw new NotFoundException(`Facility ${facilityId} not found`);
    }

    const organization = await this.organizationRepo.findOne({
      where: { id: dto.organizationId, isActive: true },
    });
    if (!organization) {
      throw new NotFoundException(`Organization ${dto.organizationId} not found`);
    }

    await this.facilityRepo.update({ id: facilityId }, { organizationId: organization.id });
    await this.facilityScopeService.invalidateAllCaches();

    return {
      message: `Facility "${facility.name}" updated to organization "${organization.name}" (level ${organization.level})`,
    };
  }

  private async ensureUserExists(userId: number): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }
  }

  private async validatePermissionTarget(
    organizationId: number | null,
    facilityId: number | null,
  ): Promise<void> {
    if ((organizationId == null && facilityId == null) || (organizationId != null && facilityId != null)) {
      throw new BadRequestException('Permission must target either an organization or a facility');
    }

    if (organizationId != null) {
      const organization = await this.organizationRepo.findOne({
        where: { id: organizationId, isActive: true },
      });
      if (!organization) {
        throw new NotFoundException(`Organization ${organizationId} not found`);
      }
    }

    if (facilityId != null) {
      const facility = await this.facilityRepo.findOne({
        where: { id: facilityId, isActive: true },
      });
      if (!facility) {
        throw new NotFoundException(`Facility ${facilityId} not found`);
      }
    }
  }

  private ensureFeatureSelection(dto: CreateUserPermissionDto): void {
    if (
      !dto.canViewAnalytics &&
      !dto.canViewPulse &&
      !dto.canViewSurvey &&
      !dto.canExportAnalytics &&
      !dto.canManagePermissions
    ) {
      throw new BadRequestException('At least one feature permission must be enabled');
    }
  }

  private ensurePersistedFeatureSelection(permission: UserPermission): void {
    if (
      !permission.canViewAnalytics &&
      !permission.canViewPulse &&
      !permission.canViewSurvey &&
      !permission.canExportAnalytics &&
      !permission.canManagePermissions
    ) {
      throw new BadRequestException('At least one feature permission must be enabled');
    }
  }
}
