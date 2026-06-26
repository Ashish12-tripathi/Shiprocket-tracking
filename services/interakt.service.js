const axios = require("axios");

function isImageTemplate(templateName) {
  return (
    templateName === process.env.INTERAKT_TEMPLATE_1 &&
    process.env.INTERAKT_TEMPLATE_1_IMAGE === "true"
  );
}

function isValidUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

function getSafeImageUrl(cart) {
  const imageUrl = cart.productImageUrl || process.env.INTERAKT_FALLBACK_IMAGE_URL || null;

  if (!imageUrl) return null;

  if (!isValidUrl(imageUrl)) {
    console.warn("Invalid product image URL:", imageUrl);
    return null;
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

async function sendInteraktTemplate(cart, templateName) {
  const customerName = cart.customerName || "there";
  const productName = cart.productName || "your Omichef cookware";
  const checkoutUrl = getSafeCheckoutUrl(cart);
  const productImageUrl = getSafeImageUrl(cart);

  console.log("INTERAKT SEND DEBUG:", {
    DRY_RUN: process.env.DRY_RUN,
    templateName,
    phone: cart.phoneE164,
    customerName,
    productName,
    productImageUrl,
    checkoutUrl,
  });

  if (process.env.DRY_RUN === "true") {
    console.log("[DRY_RUN] Would send Interakt template:", {
      to: cart.phoneE164,
      templateName,
      name: customerName,
      product: productName,
      productImageUrl,
      checkoutUrl,
    });

    return {
      dryRun: true,
      message: "Dry run only. Real WhatsApp was not sent.",
    };
  }

  if (!process.env.INTERAKT_API_KEY) {
    throw new Error("INTERAKT_API_KEY missing.");
  }

  if (!process.env.INTERAKT_API_URL) {
    throw new Error("INTERAKT_API_URL missing.");
  }

  if (!templateName) {
    throw new Error("Interakt template name missing.");
  }

  let payload;

  /*
    Template 1:
    Image header + 2 body variables + dynamic checkout button.

    Interakt Template:
    Name: razorpay_abandoned_cart_image_1
    Header: Image
    Body variables:
      {{1}} = customerName
      {{2}} = productName
    Button:
      Complete Checkout
      Dynamic URL: https://api.interakt.ai/cta?redirect={{1}}
  */
  if (isImageTemplate(templateName)) {
    if (!productImageUrl) {
      throw new Error(
        "Product image URL missing for image template. Add productImageUrl or INTERAKT_FALLBACK_IMAGE_URL."
      );
    }

    payload = {
      countryCode: cart.countryCode || "+91",
      phoneNumber: cart.phoneNumber,
      callbackData: `abandoned_cart_${cart._id}`,
      type: "Template",
      template: {
        name: templateName,
        languageCode: process.env.INTERAKT_LANGUAGE || "en",

        // Header image URL
        headerValues: [productImageUrl],

        // Body variables: {{1}}, {{2}}
        bodyValues: [customerName, productName],

        // Dynamic button URL variable.
        // If Interakt gives button error, try changing "0" to "1".
        buttonValues: {
          "0": [checkoutUrl],
        },
      },
    };
  } else {
    /*
      Template 2 and Template 3:
      Text-only templates with 3 body variables.

      Body variables:
        {{1}} = customerName
        {{2}} = productName
        {{3}} = checkoutUrl
    */
    payload = {
      countryCode: cart.countryCode || "+91",
      phoneNumber: cart.phoneNumber,
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

module.exports = {
  sendInteraktTemplate,
};