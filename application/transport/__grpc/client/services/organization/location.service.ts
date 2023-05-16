import { logger } from '@procurenetworks/backend-utils';
import { LocationEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import { OrganizationServiceRPCClient } from './rpcClient';

export class LocationService extends OrganizationServiceRPCClient {
  /** Queries */
  static async getLocationsByIdsAcrossTenants(
    input: LocationEntity.GetLocationsByIdsAcrossTenantsInput,
    userContext: UserContext,
  ): Promise<LocationEntity.GetLocationsByIdsAcrossTenantsPayload> {
    logger.debug({
      message: 'Location Service. GetLocationsByIdsAcrossTenantsInput',
      payload: { input },
    });
    const payload = await this.rpcCall<
      LocationEntity.GetLocationsByIdsAcrossTenantsInput,
      LocationEntity.GetLocationsByIdsAcrossTenantsPayload
    >('getLocationsByIdsAcrossTenants')(input, userContext);
    return payload;
  }

  static async getAllLocations(
    input: LocationEntity.GetAllLocationsInput,
    userContext: UserContext,
  ): Promise<LocationEntity.GetAllLocationsPayload> {
    logger.debug({ message: 'Location Service. getAllLocations', payload: { input } });
    const payload = await this.rpcCall<LocationEntity.GetAllLocationsInput, LocationEntity.GetAllLocationsPayload>(
      'getAllLocations',
    )(input, userContext);
    return payload;
  }

  static async getPaginatedLocations(
    input: LocationEntity.GetPaginatedLocationsInput,
    userContext: UserContext,
  ): Promise<LocationEntity.PaginatedLocationsPayload> {
    logger.debug({ message: 'Location Service. getPaginatedLocations', payload: { input } });
    const payload = await this.rpcCall<LocationEntity.GetPaginatedLocationsInput, LocationEntity.PaginatedLocationsPayload>(
      'getPaginatedLocations',
    )(input, userContext);
    return payload;
  }
}
