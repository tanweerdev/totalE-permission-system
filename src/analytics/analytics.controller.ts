import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { FacilityScopeGuard } from '../common/guards/facility-scope.guard';
import { FeaturePermissionGuard } from '../common/guards/feature-permission.guard';
import { FacilityCtx } from '../common/decorators/facility-context.decorator';
import { RequireFeatures } from '../common/decorators/feature-permission.decorator';
import { FacilityContext } from '../common/interfaces/facility-context.interface';
import { AnalyticsService } from './analytics.service';
import { FacilityService } from '../facility/facility.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { AnalyticsExportDto } from './dto/analytics-export.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard, FacilityScopeGuard, FeaturePermissionGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly facilityService: FacilityService,
  ) {}

  @Get('facilities')
  @RequireFeatures('canViewAnalytics')
  async getFacilities(@FacilityCtx() ctx: FacilityContext) {
    return this.facilityService.getAuthorizedDropdown(ctx);
  }

  @Get('pulse')
  @RequireFeatures('canViewAnalytics', 'canViewPulse')
  async getPulse(
    @FacilityCtx() ctx: FacilityContext,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getPulseAnalytics(ctx, query);
  }

  @Get('survey')
  @RequireFeatures('canViewAnalytics', 'canViewSurvey')
  async getSurvey(
    @FacilityCtx() ctx: FacilityContext,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getSurveyAnalytics(ctx, query);
  }

  @Post('export')
  @HttpCode(HttpStatus.OK)
  @RequireFeatures('canViewAnalytics', 'canExportAnalytics')
  async exportData(
    @FacilityCtx() ctx: FacilityContext,
    @Body() dto: AnalyticsExportDto,
  ) {
    return this.analyticsService.exportData(ctx, dto);
  }
}
