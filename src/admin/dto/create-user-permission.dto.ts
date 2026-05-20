import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  ValidateIf,
} from 'class-validator';

export class CreateUserPermissionDto {
  @ValidateIf(dto => dto.facilityId == null)
  @IsInt()
  @IsPositive()
  @IsOptional()
  organizationId?: number;

  @ValidateIf(dto => dto.organizationId == null)
  @IsInt()
  @IsPositive()
  @IsOptional()
  facilityId?: number;

  @IsBoolean()
  canViewAnalytics: boolean;

  @IsBoolean()
  canViewPulse: boolean;

  @IsBoolean()
  canViewSurvey: boolean;

  @IsBoolean()
  canExportAnalytics: boolean;

  @IsBoolean()
  canManagePermissions: boolean;
}
