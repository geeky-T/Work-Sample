import { Ability, OrderRequestEntity, StrictAbilityACL } from '@procurenetworks/inter-service-contracts';
import { FilterQuery } from 'mongoose';

class OrderRequestAbilityClass extends Ability<OrderRequestEntity.OrderRequestPermission> {
  getEntity(): string {
    return 'order';
  }

  permittedOn = (
    acl: StrictAbilityACL<OrderRequestEntity.OrderRequestPermission>,
  ): Promise<FilterQuery<OrderRequestEntity.OrderRequestSchema>> => {
    return this.buildConditions(acl);
  };
}

export const OrderRequestAbility = new OrderRequestAbilityClass();
