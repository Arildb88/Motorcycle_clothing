import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  RESORT_ATTRIBUTION,
  RESORT_DIRECTORY,
  ResortDirectoryUnavailableError,
  type ResortDirectoryPort,
  type ResortDiscoveryResponse,
} from './resort.types';

@Injectable()
export class ResortsService {
  constructor(
    @Inject(RESORT_DIRECTORY) private readonly directory: ResortDirectoryPort,
  ) {}

  search(query: string): Promise<ResortDiscoveryResponse> {
    return this.respond(() => this.directory.searchByName(query));
  }

  nearby(lat: number, lon: number): Promise<ResortDiscoveryResponse> {
    return this.respond(() => this.directory.nearby(lat, lon));
  }

  private async respond(
    load: () => Promise<ResortDiscoveryResponse['resorts']>,
  ): Promise<ResortDiscoveryResponse> {
    try {
      const resorts = await load();
      return {
        attribution: RESORT_ATTRIBUTION,
        distanceKind: 'straight_line',
        resorts,
      };
    } catch (err) {
      if (err instanceof ResortDirectoryUnavailableError) {
        throw new ServiceUnavailableException({
          statusCode: 503,
          code: 'RESORTS_UNAVAILABLE',
          message: 'Ski resort search is temporarily unavailable.',
          error: 'Service Unavailable',
        });
      }
      throw err;
    }
  }
}
