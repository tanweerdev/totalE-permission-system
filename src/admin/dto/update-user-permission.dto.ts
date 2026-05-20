import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  ValidateIf,
} from 'class-validator';

export class UpdateUserPermissionDto {
  @ValidateIf(dto => dto.facilityId !== undefined || dto.organizationId !== undefined)
  @IsInt()
  @IsPositive()
  @IsOptional()
  organizationId?: number;

  @ValidateIf(dto => dto.organizationId !== undefined || dto.facilityId !== undefined)
  @IsInt()
  @IsPositive()
  @IsOptional()
  facilityId?: number;

  @IsBoolean()
  @IsOptional()
  canViewAnalytics?: boolean;

  @IsBoolean()
  @IsOptional()
  canViewPulse?: boolean;

  @IsBoolean()
  @IsOptional()
  canViewSurvey?: boolean;

  @IsBoolean()
  @IsOptional()
  canExportAnalytics?: boolean;

  @IsBoolean()
  @IsOptional()
  canManagePermissions?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
