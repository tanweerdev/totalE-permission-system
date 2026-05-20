import {
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  ParseBoolPipe,
  Body,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { FacilityScopeGuard } from '../common/guards/facility-scope.guard';
import { FeaturePermissionGuard } from '../common/guards/feature-permission.guard';
import { RequireFeatures } from '../common/decorators/feature-permission.decorator';
import { AdminService } from './admin.service';
import { CreateUserPermissionDto } from './dto/create-user-permission.dto';
import { UpdateUserPermissionDto } from './dto/update-user-permission.dto';
import { UpdateFacilityOrganizationDto } from './dto/update-facility-organization.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, FacilityScopeGuard, FeaturePermissionGuard)
@RequireFeatures('canManagePermissions')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('organizations')
  listOrganizations() {
    return this.adminService.listOrganizations();
  }

  @Get('organizations/:orgId/facilities')
  listFacilitiesByOrg(@Param('orgId', ParseIntPipe) orgId: number) {
    return this.adminService.listFacilitiesByOrg(orgId);
  }

  @Get('users')
  listUsers(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('search') search?: string,
  ) {
    return this.adminService.listUsers(page, limit, search);
  }

  @Get('users/:userId/permissions')
  listUserPermissions(
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.adminService.listUserPermissions(userId);
  }

  @Post('users/:userId/permissions')
  addUserPermission(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: CreateUserPermissionDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.adminService.addUserPermission(userId, dto, req.user.id);
  }

  @Patch('permissions/:permissionId')
  updateUserPermission(
    @Param('permissionId', ParseIntPipe) permissionId: number,
    @Body() dto: UpdateUserPermissionDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.adminService.updateUserPermission(permissionId, dto, req.user.id);
  }

  @Delete('permissions/:permissionId')
  removeUserPermission(
    @Param('permissionId', ParseIntPipe) permissionId: number,
    @Request() req: { user: { id: number } },
  ) {
    return this.adminService.removeUserPermission(permissionId, req.user.id);
  }

  @Patch('permissions/:permissionId/active')
  setUserPermissionActiveState(
    @Param('permissionId', ParseIntPipe) permissionId: number,
    @Body('isActive', ParseBoolPipe) isActive: boolean,
    @Request() req: { user: { id: number } },
  ) {
    return this.adminService.setUserPermissionActiveState(permissionId, isActive, req.user.id);
  }

  @Patch('facilities/:facilityId/organization')
  updateFacilityOrganization(
    @Param('facilityId', ParseIntPipe) facilityId: number,
    @Body() dto: UpdateFacilityOrganizationDto,
  ) {
    return this.adminService.updateFacilityOrganization(facilityId, dto);
  }
}
