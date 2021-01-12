import axios from "axios";

import Logger from "@reactioncommerce/logger";
import { NOTIFICATION_HOOK, NOTIFICATION_CHANNEL } from "./../simpleSchemas.js";

/**
 * @summary Given a new order, sends appropriate notifications to all interested parties.
 * @param {Object} context App context
 * @param {Object} context.collections Map of MongoDB collections
 * @param {Object} order The order doc
 * @returns {undefined}
 */
export default async function sendNewOrderNotifications(context, order) {
  const { collections: { Shops, AppSettings } } = context;

  // Send notification to user who made the order
  if (order.accountId) {
    const shop = await Shops.findOne({
      _id: order.shopId
    }, {
      projection: {
        slug: 1
      }
    });

    const shopSettings = await AppSettings.findOne({
      shopId: order.shopId
    }, {
      projection: {
        notificationOptions: 1
      }
    });

    let message;
    const result = "There is no notifications options";
    let channel;
    let identifier;
    let isNotificationLogged = false;
    if (!!shopSettings && !!shopSettings.notificationOptions) {
      const notificationSettings = shopSettings.notificationOptions.find((no) => no.hook === NOTIFICATION_HOOK.AFTER_ORDER_CREATED && !!no.state);

      if (notificationSettings) {
        // eslint-disable-next-line prefer-destructuring
        channel = notificationSettings.channel;
        // eslint-disable-next-line prefer-destructuring
        identifier = notificationSettings.identifier;

        message = createNewOrderMessage(order);
        // TODO: template to message.
        // eslint-disable-next-line promise/always-return
        sendNotificationsByChannel(channel, identifier, message).then((res) => {
          const log = `${res} ::: ${identifier} ::: ${channel} ::: ${message}`;
          createNotification(context, order, shop, log);
        }).catch((err) => {
          const log = `Error ::: ${identifier} ::: ${channel} ::: ${err.message}`;
          createNotification(context, order, shop, log);
        });

        // sendNotificationsByChannel is async but we assume that notifcation was logged
        isNotificationLogged = true;
      }
    }

    if (!isNotificationLogged) {
      isNotificationLogged = true;
      createNotification(context, order, shop, result);
    }
  }


  // TODO: Send notification to all who want to know about new orders coming in for this shop.
  // First we need to add a way to add accounts to a list of people who want to be notified about
  // all new orders. Then call this for each account:
  //
  // context.mutations.createNotification(context, {
  //   accountId,
  //   type: "forAdmin",
  //   url: "/operator/orders"
  // });
}

/**
 * @summary Create and log notification
 * @param {Object} context Context
 * @param {Object} order Order
 * @param {Object} shop Shop
 * @param {Object} result value to be logged as notification
 * @returns {undefined} Nothing
 */
function createNotification(context, order, shop, result) {
  // accountId, details, type, url, userId, message = ""
  context.mutations.createNotification(context, {
    accountId: order.accountId,
    type: "newOrder",
    url: `${shop.slug ? `/${shop.slug}` : ""}/notifications`,
    details: order.referenceId,
    message: result
  }).catch((error) => {
    Logger.error("Error in createNotification within sendNewOrderNotifications", error);
  });
}


// TODO: Move to a generic place, this will be used in more "place" than just "after new order"
/**
 * @summary Create a message for new orders
 * @param {Object} order The order doc
 * @returns {String} Message to be sent
 */
function createNewOrderMessage(order) {
  const NEW_LINE = "%0a";
  const { email, referenceId, shipping, payments } = order;

  let message = `Proximcity  - Nova encomenda (${referenceId})${NEW_LINE}`;

  if (!!shipping && !!shipping.length) {
    const { address, items } = shipping[0];
    // From
    if (address.fullName) { message = `${message} De: ${address.fullName}${NEW_LINE}`; }

    // Contacts
    if (address.phone || email) { message = `${message} Contactos: ${address.phone} - ${email}${NEW_LINE}`; }

    // Items
    message = `${message}${items.map((it) => `(${it.quantity}) ${it.title}${NEW_LINE}`)}`;
  }

  if (!!payments && !!payments.length) {
    const { amount } = payments[0];
    message = `${message}Total: ${Number(amount).toFixed(2)}${NEW_LINE}`;
  }


  return message;
}

// TODO: Move to a generic place, this will be used in more "place" than just "after new order"
/**
 * @summary Send a notification through the correct channel
 * @param {NOTIFICATION_CHANNEL} channel Channel through where notification will be sent
 * @param {String} identifier phone number, email, ...
 * @param {String} message notification message
 * @param {Object} order The order doc
 * @returns {undefined}
 */
async function sendNotificationsByChannel(channel, identifier, message) {
  let resultMessage = "";
  switch (channel) {
    case NOTIFICATION_CHANNEL.SMS:
      resultMessage = await sendSMS(message, identifier);

      break;

    default:
      break;
  }

  return resultMessage;
}

/**
 * @summary Send a notification through SMS channel
 * @param {String} message notification message
 * @param {String} phoneNumber Customer phone number
 * @returns {undefined}
 */
async function sendSMS(message, phoneNumber) {
  const { SMS_CHANNEL_ENDPOINT, SMS_CHANNEL_U, SMS_CHANNEL_P, SMS_CHANNEL_TAG } = process.env;
  try {
    const resp = await
    axios
      .get(`${SMS_CHANNEL_ENDPOINT}?username=${SMS_CHANNEL_U}&pass=${SMS_CHANNEL_P}&header=${SMS_CHANNEL_TAG}&recipient=${phoneNumber}&message=${message}`);

    // 0-CREDENCIAIS INVALIDAS
    // 1-ENTREGUE NO CENTRO DE MENSAGENS
    // 2-CAMPOS EM FALTA
    // 3-ERRO NO ACESSO AO CENTRO DE MENSAGENS
    // 4-ERRO NO ACESSO AO CENTRO DE MENSAGENS PARAMETROS INVALIDOS
    const { status, data } = resp || {};
    return `(${status}) ${JSON.stringify(data)}`;
  } catch (error) {
    const msg = error && error.message;
    return `SMS channel error: ${msg || "-"}`;
  }
}


