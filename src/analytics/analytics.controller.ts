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
import { FacilityCtx } from '../common/decorators/facility-context.decorator';
import { FacilityContext } from '../common/interfaces/facility-context.interface';
import { AnalyticsService } from './analytics.service';
import { FacilityService } from '../facility/facility.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { AnalyticsExportDto } from './dto/analytics-export.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard, FacilityScopeGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly facilityService: FacilityService,
  ) {}

  @Get('facilities')
  async getFacilities(@FacilityCtx() ctx: FacilityContext) {
    return this.facilityService.getAuthorizedDropdown(ctx);
  }

  @Get('pulse')
  async getPulse(
    @FacilityCtx() ctx: FacilityContext,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getPulseAnalytics(ctx, query);
  }

  @Get('survey')
  async getSurvey(
    @FacilityCtx() ctx: FacilityContext,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getSurveyAnalytics(ctx, query);
  }

  @Post('export')
  @HttpCode(HttpStatus.OK)
  async exportData(
    @FacilityCtx() ctx: FacilityContext,
    @Body() dto: AnalyticsExportDto,
  ) {
    return this.analyticsService.exportData(ctx, dto);
  }
}
