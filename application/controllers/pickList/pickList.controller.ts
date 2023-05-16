import { Entity, PickListEntity, UserContext } from '@procurenetworks/inter-service-contracts';
import { PickListServiceV2 } from '@services/pickList/pickList.service';

export class PickListController {
  /* Queries */

  /* Mutations */
  static async createPickList(
    createPickListInput: PickListEntity.CreatePickListInput,
    userContext: UserContext,
  ): Promise<Entity.MutationResponse> {
    // PermissionValidator.verifyOrderRequestPickPermissions(userContext);
    return PickListServiceV2.createPickList(createPickListInput, userContext);
  }
}
