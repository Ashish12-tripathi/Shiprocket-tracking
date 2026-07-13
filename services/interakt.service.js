const axios = require("axios");

const STATIC_IMAGE_ONLY_TEMPLATES = new Set([
  "monsoon_abandoned_carts_tillnow_2026",
  "monsoon_ordered_customers_tilljune2026",
]);

function isStaticImageOnlyTemplate(templateName) {
  return STATIC_IMAGE_ONLY_TEMPLATES.has(templateName);
}

function isImageTemplate(templateName) {
  return (
    templateName === process.env.INTERAKT_TEMPLATE_1 &&
    process.env.INTERAKT_TEMPLATE_1_IMAGE === "true"
  );
}

function isValidUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

function normalizeIndianPhoneForInterakt(contact = {}) {
  const rawPhone =
    contact.phoneE164 ||
    contact.phoneNumber ||
    contact.phone ||
    contact.mobile ||
    contact.customerPhone ||
    "";

  let digits = String(rawPhone).replace(/\D/g, "");

  if (!digits) {
    throw new Error("Phone number missing for Interakt message.");
  }

  if (digits.startsWith("91") && digits.length === 12) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("0") && digits.length === 11) {
    digits = digits.slice(1);
  }

  if (!/^[6-9][0-9]{9}$/.test(digits)) {
    throw new Error(
      `Invalid Indian WhatsApp number for Interakt: ${rawPhone}. Normalized value: ${digits}`
    );
  }

  return {
    countryCode: "+91",
    phoneNumber: digits,
    phoneE164: `+91${digits}`,
  };
}

function getSafeImageUrl(cart = {}) {
  const imageUrl =
    cart.productImageUrl ||
    cart.imageUrl ||
    cart.headerMediaUrl ||
    cart.abandonedHeaderMediaUrl ||
    cart.campaignImageUrl ||
    process.env.INTERAKT_CAMPAIGN_IMAGE_URL ||
    process.env.INTERAKT_FALLBACK_IMAGE_URL ||
    null;

  if (!imageUrl) return null;

  if (!isValidUrl(imageUrl)) {
    console.warn("Invalid product/campaign image URL:", imageUrl);
    return null;
  }

  return imageUrl;
}

function getCampaignImageUrl(contact = {}, options = {}) {
  const imageUrl =
    options.headerMediaUrl ||
    options.abandonedHeaderMediaUrl ||
    options.convertedCustomerHeaderMediaUrl ||
    options.gameWinnerHeaderMediaUrl ||
    options.gameVoterHeaderMediaUrl ||
    options.campaignImageUrl ||
    contact.headerMediaUrl ||
    contact.abandonedHeaderMediaUrl ||
    contact.campaignImageUrl ||
    contact.productImageUrl ||
    contact.imageUrl ||
    process.env.INTERAKT_CAMPAIGN_IMAGE_URL ||
    process.env.INTERAKT_FALLBACK_IMAGE_URL ||
    null;

  if (!imageUrl) {
    throw new Error(
      "Campaign image URL missing. Pass headerMediaUrl/abandonedHeaderMediaUrl or add INTERAKT_CAMPAIGN_IMAGE_URL in .env."
    );
  }

  if (!isValidUrl(imageUrl)) {
    throw new Error(`Invalid campaign image URL: ${imageUrl}`);
  }

  return imageUrl;
}

function getSafeCheckoutUrl(cart) {
  const checkoutUrl = cart.checkoutUrl;

  if (!checkoutUrl) {
    throw new Error("Checkout URL missing.");
  }

  if (!isValidUrl(checkoutUrl)) {
    throw new Error(`Invalid checkout URL: ${checkoutUrl}`);
  }

  return checkoutUrl;
}

function ensureInteraktEnv() {
  if (!process.env.INTERAKT_API_KEY) {
    throw new Error("INTERAKT_API_KEY missing.");
  }

  if (!process.env.INTERAKT_API_URL) {
    throw new Error("INTERAKT_API_URL missing.");
  }
}

async function sendInteraktTemplate(cart, templateName) {
  ensureInteraktEnv();

  if (!templateName) {
    throw new Error("Interakt template name missing.");
  }

  const customerName = cart.customerName || "there";
  const productName = cart.productName || "your Omichef cookware";
  const normalizedPhone = normalizeIndianPhoneForInterakt(cart);

  const productImageUrl = getSafeImageUrl(cart);

  console.log("INTERAKT SEND DEBUG:", {
    DRY_RUN: process.env.DRY_RUN,
    templateName,
    originalPhone: cart.phoneE164 || cart.phoneNumber,
    normalizedPhone,
    customerName,
    productName,
    productImageUrl,
  });

  let payload;

  /*
    Static image-only templates:
    Header: Image
    Body variables: 0
    Button: Static URL

    Send only headerValues.
  */
  if (isStaticImageOnlyTemplate(templateName)) {
    if (!productImageUrl) {
      throw new Error(
        "Image URL missing for static image template. Add productImageUrl, INTERAKT_CAMPAIGN_IMAGE_URL, or INTERAKT_FALLBACK_IMAGE_URL."
      );
    }

    payload = {
      countryCode: normalizedPhone.countryCode,
      phoneNumber: normalizedPhone.phoneNumber,
      callbackData: `template_${cart._id || "manual"}`,
      type: "Template",
      template: {
        name: templateName,
        languageCode: process.env.INTERAKT_LANGUAGE || "en",
        headerValues: [productImageUrl],
      },
    };
  } else if (isImageTemplate(templateName)) {
    const checkoutUrl = getSafeCheckoutUrl(cart);

    if (!productImageUrl) {
      throw new Error(
        "Product image URL missing for image template. Add productImageUrl, INTERAKT_CAMPAIGN_IMAGE_URL, or INTERAKT_FALLBACK_IMAGE_URL."
      );
    }

    payload = {
      countryCode: normalizedPhone.countryCode,
      phoneNumber: normalizedPhone.phoneNumber,
      callbackData: `abandoned_cart_${cart._id}`,
      type: "Template",
      template: {
        name: templateName,
        languageCode: process.env.INTERAKT_LANGUAGE || "en",
        headerValues: [productImageUrl],
        bodyValues: [customerName, productName],
        buttonValues: {
          "0": [checkoutUrl],
        },
      },
    };
  } else {
    const checkoutUrl = getSafeCheckoutUrl(cart);

    payload = {
      countryCode: normalizedPhone.countryCode,
      phoneNumber: normalizedPhone.phoneNumber,
      callbackData: `abandoned_cart_${cart._id}`,
      type: "Template",
      template: {
        name: templateName,
        languageCode: process.env.INTERAKT_LANGUAGE || "en",
        bodyValues: [customerName, productName, checkoutUrl],
      },
    };
  }

  console.log("INTERAKT API PAYLOAD:", JSON.stringify(payload, null, 2));

  if (process.env.DRY_RUN === "true") {
    return {
      dryRun: true,
      message: "Dry run only. Real WhatsApp was not sent.",
      payload,
    };
  }

  const response = await axios.post(process.env.INTERAKT_API_URL, payload, {
    headers: {
      Authorization: `Basic ${process.env.INTERAKT_API_KEY}`,
      "Content-Type": "application/json",
    },
    timeout: 20000,
  });

  console.log("INTERAKT API RESPONSE:", JSON.stringify(response.data, null, 2));

  return {
    ok: true,
    data: response.data,
  };
}

async function sendInteraktCampaignTemplate(
  contact,
  templateName,
  bodyValues = [],
  options = {}
) {
  ensureInteraktEnv();

  if (!templateName) {
    throw new Error("Campaign template name missing.");
  }

  const normalizedPhone = normalizeIndianPhoneForInterakt(contact);
  const campaignImageUrl = getCampaignImageUrl(contact, options);

  const isStaticTemplate = isStaticImageOnlyTemplate(templateName);

  const payload = {
    countryCode: normalizedPhone.countryCode,
    phoneNumber: normalizedPhone.phoneNumber,
    callbackData: `campaign_${contact.campaignKey || "manual"}`,
    type: "Template",
    template: {
      name: templateName,
      languageCode: process.env.INTERAKT_LANGUAGE || "en",
      headerValues: [campaignImageUrl],
    },
  };

  /*
    IMPORTANT:
    For monsoon_abandoned_carts_tillnow_2026:
    - Do not send bodyValues
    - Do not send buttonValues
    because your Interakt template has 0 body variables and a static button.
  */
  if (!isStaticTemplate && Array.isArray(bodyValues) && bodyValues.length > 0) {
    payload.template.bodyValues = bodyValues;
  }

  const shouldSendDynamicButton =
    !isStaticTemplate &&
    (options.sendDynamicButton === true || options.hasDynamicButton === true);

  const buttonUrl =
    options.buttonUrl ||
    options.checkoutUrl ||
    contact.checkoutUrl ||
    contact.lastCheckoutUrl ||
    null;

  if (shouldSendDynamicButton && buttonUrl) {
    if (!isValidUrl(buttonUrl)) {
      throw new Error(`Invalid campaign button/checkout URL: ${buttonUrl}`);
    }

    payload.template.buttonValues = {
      "0": [buttonUrl],
    };
  }

  console.log("INTERAKT CAMPAIGN PHONE DEBUG:", {
    originalPhone: contact.phoneE164 || contact.phoneNumber,
    normalizedPhone,
  });

  console.log("INTERAKT CAMPAIGN TEMPLATE DEBUG:", {
    templateName,
    isStaticTemplate,
    bodyValuesLength: Array.isArray(bodyValues) ? bodyValues.length : 0,
    willSendBodyValues: Boolean(payload.template.bodyValues),
    willSendButtonValues: Boolean(payload.template.buttonValues),
  });

  console.log("INTERAKT CAMPAIGN PAYLOAD:", JSON.stringify(payload, null, 2));

  if (process.env.DRY_RUN === "true") {
    return {
      dryRun: true,
      message: "Dry run only. Campaign WhatsApp was not sent.",
      payload,
    };
  }

  const response = await axios.post(process.env.INTERAKT_API_URL, payload, {
    headers: {
      Authorization: `Basic ${process.env.INTERAKT_API_KEY}`,
      "Content-Type": "application/json",
    },
    timeout: 20000,
  });

  console.log(
    "INTERAKT CAMPAIGN RESPONSE:",
    JSON.stringify(response.data, null, 2)
  );

  return {
    ok: true,
    data: response.data,
  };
}

module.exports = {
  sendInteraktTemplate,
  sendInteraktCampaignTemplate,
};