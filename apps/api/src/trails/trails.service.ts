import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  TRAIL_ATTRIBUTION,
  TRAIL_DIRECTORY,
  TrailDirectoryUnavailableError,
  type TrailDirectoryPort,
  type TrailDiscoveryResponse,
} from './trail.types';

@Injectable()
export class TrailsService {
  constructor(
    @Inject(TRAIL_DIRECTORY) private readonly directory: TrailDirectoryPort,
  ) {}

  async nearby(lat: number, lon: number): Promise<TrailDiscoveryResponse> {
    try {
      const trails = await this.directory.nearby(lat, lon);
      return {
        attribution: TRAIL_ATTRIBUTION,
        distanceKind: 'straight_line',
        trails,
      };
    } catch (err) {
      if (err instanceof TrailDirectoryUnavailableError) {
        throw new ServiceUnavailableException({
          statusCode: 503,
          code: 'TRAILS_UNAVAILABLE',
          message: 'Ski trail search is temporarily unavailable.',
          error: 'Service Unavailable',
        });
      }
      throw err;
    }
  }
}
