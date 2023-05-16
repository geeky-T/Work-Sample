import { logger } from '@procurenetworks/backend-utils';
import assert from 'assert';
import mongoose from 'mongoose';
import { initiateAvailableSiteIdsScript } from '../scripts/availableAtSiteIds';

const {
  env: { MONGODB_URI: mongoDBUri },
} = process;
assert.ok(mongoDBUri, 'Missing Mongo DB URI Service Url in environment variables');

// let dbReference = null;

// eslint-disable-next-line no-unused-vars
// async function addTenantIdToOrderItems() {
//   const orderIds = await mongoose.connection.db
//     .collection('orderRequestItems')
//     .distinct('order_request_id', { tenantId: { $exists: false } });
//   const orders = await mongoose.connection.db
//     .collection('orderRequests')
//     .find(
//       { _id: { $in: orderIds }, tenant_id: { $exists: true } },
//       { projection: { tenant_id: 1 } },
//     )
//     .toArray();
//   console.log('total number of orders', orders.length);
//   let count = 0;
//   for (const order of orders) {
//     await mongoose.connection.db
//       .collection('orderRequestItems')
//       .updateMany({ order_request_id: order._id }, { $set: { tenantId: order.tenant_id } });
//     count += 1;
//     if (count % 10 === 0) {
//       console.log(`completed ${count} orders`);
//     }
//   }
// }

// // eslint-disable-next-line no-unused-vars
// const initialiseLeastItemStatus = async () => {
//   const orders = await mongoose.connection.db
//     .collection('orderRequests')
//     .find({ status: 'active', $or: [{ leastItemStatus: 'NotApplicable' }] }, { projection: { _id: 1, tenant_id: 1 } })
//     .toArray();
//   console.log('number of orders', orders.length);
//   let count = 0;
//   for (const order of orders) {
//     // eslint-disable-next-line no-await-in-loop
//     await OrderRequestServiceV2.updateLeastItemStatus({
//       orderRequestId: order._id as StringObjectID,
//     });
//     count += 1;
//     if (count % 20 === 0) {
//       console.log('Count reached', count);
//     }
//   }
//   console.log('leastItemStatus initialised for all orders');
// };

// CONNECTION EVENTS
// When successfully connected
mongoose.connection.on('connected', () => {
  logger.info(`Mongoose default connection open to ${process.env.MONGODB_URI}`);
  // setTimeout(initialiseLeastItemStatus, 5000);
  // closeOrderRequests();

  initiateAvailableSiteIdsScript();
});

// If the connection throws an error
mongoose.connection.on('error', (error: any) => {
  logger.error({ message: `Mongoose default connection error: ${error}` });
});

// When the connection is disconnected
mongoose.connection.on('disconnected', () => {
  logger.info('Mongoose default connection disconnected');
});

export const mongoConnect: (callback?: CallableFunction) => Promise<void> = async function mongoConnect(
  callback: CallableFunction | undefined,
) {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}`, {
      connectTimeoutMS: 30000,
      keepAlive: true,
    });
    mongoose.set('debug', Boolean(process.env.MONGOOSE_DEBUG_MODE));
  } catch (error: any) {
    logger.error({ message: `Error in connecting to mongo: ${error}` });
  }
  if (typeof callback === 'function') {
    callback();
  }
};

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    logger.info('Mongoose default connection disconnected through app termination');
    process.exit(0);
  });
});
