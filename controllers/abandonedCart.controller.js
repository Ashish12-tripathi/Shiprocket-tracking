const AbandonedCart = require("../models/AbandonedCart");
const { requireSecret } = require("../utils/security");
const { normalizeIndianPhone } = require("../utils/phone");
const {
  getRazorpayPhone,
  getRazorpayName,
  getRazorpayEmail,
  getFirstProductName,
  getFirstProductImageUrl,
  getCartValue,
  getShopifyOrderPhone,
  getShopifyOrderEmail,
} = require("../utils/dataExtractors");

async function receiveRazorpayAbandonedCart(req, res) {
  try {
    if (!requireSecret(req, process.env.RZP_WEBHOOK_SECRET, "Razorpay webhook")) {
      return res.status(401).json({
        ok: false,
        error: "Invalid Razorpay secret",
      });
    }

    const payload = req.body;

    const phoneData = normalizeIndianPhone(getRazorpayPhone(payload));
    const checkoutUrl = payload.abandoned_checkout_url;

    if (!phoneData) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: "Phone missing or invalid",
      });
    }

    if (!checkoutUrl) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: "abandoned_checkout_url missing",
      });
    }

    const cartToken = payload.cart_token || payload.token || null;

    const productName = getFirstProductName(payload);
    const productImageUrl = getFirstProductImageUrl(payload);

    const updateData = {
      source: "razorpay_magic_checkout",
      razorpayToken: payload.token || null,
      cartToken,
      shopId: payload.shop_id || null,
      platform: payload.platform || null,

      checkoutUrl,

      customerName: getRazorpayName(payload),
      email: getRazorpayEmail(payload),

      phoneE164: phoneData.phoneE164,
      countryCode: phoneData.countryCode,
      phoneNumber: phoneData.phoneNumber,

      productName,
      productImageUrl,
      cartValue: getCartValue(payload),
      currency: payload.currency || "INR",

      utmSource: payload?.utm_parameters?.utm_source || null,
      utmMedium: payload?.utm_parameters?.utm_medium || null,
      utmCampaign: payload?.utm_parameters?.utm_campaign || null,

      rawPayload: payload,
    };

    const existing = await AbandonedCart.findOne({
      $or: [
        cartToken ? { cartToken } : null,
        { checkoutUrl },
        { phoneE164: phoneData.phoneE164, checkoutUrl },
      ].filter(Boolean),
    });

    let cart;

    if (existing) {
      // Do not reset message sent flags if Razorpay sends the same abandoned cart again.
      // Only refresh the cart/customer/product details.
      Object.assign(existing, updateData);
      cart = await existing.save();
    } else {
      cart = await AbandonedCart.create(updateData);
    }

    return res.status(200).json({
      ok: true,
      saved: true,
      cartId: cart._id,
      phone: cart.phoneE164,
      checkoutUrl: cart.checkoutUrl,
      productName: cart.productName,
      productImageUrl: cart.productImageUrl || null,
    });
  } catch (error) {
    console.error("Razorpay abandoned cart webhook error:", error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
}

async function receiveShopifyOrderCreate(req, res) {
  try {
    if (!requireSecret(req, process.env.SHOPIFY_WEBHOOK_SECRET, "Shopify webhook")) {
      return res.status(401).json({
        ok: false,
        error: "Invalid Shopify secret",
      });
    }

    const order = req.body;

    const phoneData = normalizeIndianPhone(getShopifyOrderPhone(order));
    const email = getShopifyOrderEmail(order);

    const orConditions = [];

    if (phoneData?.phoneE164) {
      orConditions.push({ phoneE164: phoneData.phoneE164 });
    }

    if (email) {
      orConditions.push({ email });
    }

    if (!orConditions.length) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: "No phone/email found on order",
      });
    }

   const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

// Delete this record automatically 10 days after conversion
const deleteAfterAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

const result = await AbandonedCart.updateMany(
  {
    converted: false,
    createdAt: { $gte: sevenDaysAgo },
    $or: orConditions,
  },
  {
    $set: {
      converted: true,
      convertedAt: new Date(),
      status: "converted",
      shopifyOrderId: String(order.id || ""),
      shopifyOrderName: String(order.name || order.order_number || ""),
      deleteAfterAt: deleteAfterAt,
    },
  }
);
    return res.status(200).json({
      ok: true,
      convertedUpdated: result.modifiedCount || 0,
    });
  } catch (error) {
    console.error("Shopify order webhook error:", error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
}

module.exports = {
  receiveRazorpayAbandonedCart,
  receiveShopifyOrderCreate,
};