import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Facility } from './entities/facility.entity';
import { FacilityService } from './facility.service';
import { FacilityScopeService } from './facility-scope.service';
import { FacilityScopeGuard } from '../common/guards/facility-scope.guard';
import { FeaturePermissionGuard } from '../common/guards/feature-permission.guard';
import { UserPermission } from '../auth/entities/user-permission.entity';
import { Organization } from '../org/entities/organization.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Facility, UserPermission, Organization]),
  ],
  providers: [FacilityService, FacilityScopeService, FacilityScopeGuard, FeaturePermissionGuard],
  exports: [FacilityService, FacilityScopeService, FacilityScopeGuard, FeaturePermissionGuard],
})
export class FacilityModule {}
