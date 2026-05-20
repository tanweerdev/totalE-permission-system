import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { FacilityScopeService } from '../../facility/facility-scope.service';
import { FACILITY_CONTEXT_KEY } from '../decorators/facility-context.decorator';
@Injectable()
export class FacilityScopeGuard implements CanActivate {
  private readonly logger = new Logger(FacilityScopeGuard.name);

  constructor(private readonly facilityScopeService: FacilityScopeService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const user = request.user;
    if (!user?.id) {
      throw new UnauthorizedException('Authenticated user required');
    }

    try {
      request[FACILITY_CONTEXT_KEY] =
        await this.facilityScopeService.computeAccessContext(user.id);
    } catch (err) {
      this.logger.error(`Failed to compute facility scope for user ${user.id}`, err);
      throw new InternalServerErrorException('Could not determine access scope');
    }

    return true;
  }
}
