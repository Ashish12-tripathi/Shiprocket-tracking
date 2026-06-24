const AbandonedCart = require("../models/AbandonedCart");
const { minutesAgo } = require("../utils/dataExtractors");
const { sendInteraktTemplate } = require("./interakt.service");

async function processDueAbandonedCarts() {
  const {
    INTERAKT_TEMPLATE_1,
    INTERAKT_TEMPLATE_2,
    INTERAKT_TEMPLATE_3,
    MESSAGE_1_DELAY_MINUTES = "1",
    MESSAGE_2_DELAY_MINUTES = "2",
    MESSAGE_3_DELAY_MINUTES = "3",
  } = process.env;

  const carts = await AbandonedCart.find({
    converted: false,
    status: { $nin: ["converted", "stopped"] },
  })
    .sort({ createdAt: 1 })
    .limit(100);

  const results = [];

  for (const cart of carts) {
    try {
      let messageNumber = null;
      let templateName = null;

      if (!cart.message1Sent && minutesAgo(cart.createdAt, MESSAGE_1_DELAY_MINUTES)) {
        messageNumber = 1;
        templateName = INTERAKT_TEMPLATE_1;
      } else if (
        cart.message1Sent &&
        !cart.message2Sent &&
        minutesAgo(cart.createdAt, MESSAGE_2_DELAY_MINUTES)
      ) {
        messageNumber = 2;
        templateName = INTERAKT_TEMPLATE_2;
      } else if (
        cart.message2Sent &&
        !cart.message3Sent &&
        minutesAgo(cart.createdAt, MESSAGE_3_DELAY_MINUTES)
      ) {
        messageNumber = 3;
        templateName = INTERAKT_TEMPLATE_3;
      }

      if (!messageNumber) continue;

      await sendInteraktTemplate(cart, templateName);

      if (messageNumber === 1) {
        cart.message1Sent = true;
        cart.message1SentAt = new Date();
        cart.status = "message_1_sent";
      }

      if (messageNumber === 2) {
        cart.message2Sent = true;
        cart.message2SentAt = new Date();
        cart.status = "message_2_sent";
      }

      if (messageNumber === 3) {
        cart.message3Sent = true;
        cart.message3SentAt = new Date();
        cart.status = "stopped";
      }

      cart.lastError = null;
      await cart.save();

      results.push({
        cartId: cart._id,
        phone: cart.phoneE164,
        messageSent: messageNumber,
      });
    } catch (cartError) {
      cart.lastError = cartError.response?.data
        ? JSON.stringify(cartError.response.data)
        : cartError.message;

      await cart.save();

      results.push({
        cartId: cart._id,
        phone: cart.phoneE164,
        error: cart.lastError,
      });
    }
  }

  return results;
}

module.exports = {
  processDueAbandonedCarts,
};
