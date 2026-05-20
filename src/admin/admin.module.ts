import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { UserPermission } from '../auth/entities/user-permission.entity';
import { Organization } from '../org/entities/organization.entity';
import { Facility } from '../facility/entities/facility.entity';
import { FacilityModule } from '../facility/facility.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserPermission, Organization, Facility]),
    FacilityModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
