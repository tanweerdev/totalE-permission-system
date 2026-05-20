import { IsInt, IsPositive } from 'class-validator';

export class UpdateFacilityOrganizationDto {
  @IsInt()
  @IsPositive()
  organizationId: number;
}
