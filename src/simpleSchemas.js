import SimpleSchema from "simpl-schema";

/**
 * @name Notification
 * @memberof Schemas
 * @type {SimpleSchema}
 * @summary Notification sends messages corresponding to the type:
 * - `orderCanceled`  : "Your order was canceled."
 * - `forAdmin`       : "You have a new order."
 * - `newOrder`       : "You just made an order."
 * - `orderDelivered` : "Your order has been delivered."
 * - `orderProcessing`: "Your order is being processed."
 * - `orderShipped`   : "Your order has been shipped."
 * @property {String} message required
 * @property {String} type required, types: `orderCanceled`, `forAdmin`, `newOrder`, `orderDelivered`, `orderProcessing`, `orderShipped`
 * @property {String} url required
 * @property {String} to required
 * @property {Boolean} hasDetails required
 * @property {String} details required
 * @property {String} status required, default: `unread`
 * @property {Date} timeSent required
 */
export const Notification = new SimpleSchema({
  _id: {
    type: String,
    optional: false
  },
  message: {
    type: String,
    optional: false
  },
  type: {
    type: String,
    optional: false
  },
  url: {
    type: String,
    optional: false
  },
  to: {
    type: String,
    optional: false
  },
  hasDetails: {
    type: Boolean,
    optional: false
  },
  details: {
    type: String,
    optional: true
  },
  status: String,
  timeSent: Date
});

export const NotificationOptions = new SimpleSchema({
  "notificationOptions": {
    type: Array,
    optional: true
  },
  "notificationOptions.$": {
    type: Object,
    optional: false,
    blackbox: true
  }
});

export const NOTIFICATION_HOOK = {
  AFTER_ORDER_CREATED: "AFTER_ORDER_CREATED"
};

export const NOTIFICATION_CHANNEL = {
  SMS: "SMS"
};
