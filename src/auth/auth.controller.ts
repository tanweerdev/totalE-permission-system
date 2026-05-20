import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService, AuthTokenResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './auth.guard';
import { FacilityScopeGuard } from '../common/guards/facility-scope.guard';
import { FacilityCtx } from '../common/decorators/facility-context.decorator';
import { FacilityContext } from '../common/interfaces/facility-context.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto): Promise<AuthTokenResponse> {
    return this.authService.login(dto);
  }

  @Get('me/flags')
  @UseGuards(JwtAuthGuard, FacilityScopeGuard)
  getMyFlags(@FacilityCtx() ctx: FacilityContext) {
    return ctx.toJSON().featureFlags;
  }
}
