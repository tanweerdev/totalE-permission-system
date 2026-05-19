import { IsIn, IsOptional, IsArray, IsInt, IsDateString, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

export class AnalyticsExportDto {
  @IsDateString()
  dateFrom: string;

  @IsDateString()
  dateTo: string;

  @IsIn(['pulse', 'survey', 'combined'])
  dataType: 'pulse' | 'survey' | 'combined';

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsInt({ each: true })
  @Type(() => Number)
  facilityIds?: number[];
}
