const axios = require("axios");

async function sendInteraktTemplate(cart, templateName) {
  const {
    DRY_RUN = "false",
    INTERAKT_API_KEY,
    INTERAKT_API_URL = "https://api.interakt.ai/v1/public/message/",
    INTERAKT_LANGUAGE = "en",
  } = process.env;

  if (DRY_RUN === "true") {
    console.log("[DRY_RUN] Would send Interakt template:", {
      to: cart.phoneE164,
      templateName,
      name: cart.customerName,
      product: cart.productName,
      checkoutUrl: cart.checkoutUrl,
    });

    return { dryRun: true };
  }

  if (!INTERAKT_API_KEY) {
    throw new Error("INTERAKT_API_KEY missing.");
  }

  if (!templateName) {
    throw new Error("Interakt template name missing.");
  }

  const payload = {
    countryCode: cart.countryCode || "+91",
    phoneNumber: cart.phoneNumber,
    callbackData: `abandoned_cart_${cart._id}`,
    type: "Template",
    template: {
      name: templateName,
      languageCode: INTERAKT_LANGUAGE,
      bodyValues: [
        cart.customerName || "there",
        cart.productName || "your Omichef cookware",
        cart.checkoutUrl,
      ],
    },
  };

  const response = await axios.post(INTERAKT_API_URL, payload, {
    headers: {
      Authorization: `Basic ${INTERAKT_API_KEY}`,
      "Content-Type": "application/json",
    },
    timeout: 20000,
  });

  return response.data;
}

module.exports = {
  sendInteraktTemplate,
};