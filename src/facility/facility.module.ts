import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Facility } from './entities/facility.entity';
import { FacilityService } from './facility.service';
import { FacilityScopeService } from './facility-scope.service';
import { FacilityScopeGuard } from '../common/guards/facility-scope.guard';
import { UserPermission } from '../auth/entities/user-permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Facility, UserPermission]),
  ],
  providers: [FacilityService, FacilityScopeService, FacilityScopeGuard],
  exports: [FacilityService, FacilityScopeService, FacilityScopeGuard],
})
export class FacilityModule {}
