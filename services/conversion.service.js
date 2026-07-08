const ConvertedCustomer = require("../models/ConvertedCustomer");
const CampaignLog = require("../models/CampaignLog");

function normalizeIndianPhone(rawPhone) {
  if (!rawPhone) return null;

  let digits = String(rawPhone).replace(/\D/g, "");

  if (!digits) return null;

  if (digits.startsWith("91") && digits.length === 12) {
    digits = digits.slice(2);
  }

  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return {
      countryCode: "+91",
      phoneNumber: digits,
      phoneE164: `+91${digits}`,
    };
  }

  return null;
}

function getOrderPhone(order) {
  return (
    order.phone ||
    order?.customer?.phone ||
    order?.billing_address?.phone ||
    order?.shipping_address?.phone ||
    null
  );
}

function getOrderEmail(order) {
  const email =
    order.email ||
    order.contact_email ||
    order?.customer?.email ||
    null;

  return email ? String(email).toLowerCase() : null;
}

function getOrderCustomerName(order) {
  const first =
    order?.customer?.first_name ||
    order?.billing_address?.first_name ||
    order?.shipping_address?.first_name ||
    "";

  const last =
    order?.customer?.last_name ||
    order?.billing_address?.last_name ||
    order?.shipping_address?.last_name ||
    "";

  const full = `${first} ${last}`.trim();

  return full || order?.billing_address?.name || order?.shipping_address?.name || "Customer";
}

function getOrderTotal(order) {
  const value =
    order.total_price ||
    order.current_total_price ||
    order.subtotal_price ||
    0;

  const numberValue = Number(value);

  return Number.isNaN(numberValue) ? 0 : numberValue;
}

function getLastMessageNumber(cart) {
  if (!cart) return 0;
  if (cart.message3Sent) return 3;
  if (cart.message2Sent) return 2;
  if (cart.message1Sent) return 1;
  return 0;
}

function getLastMessageSentAt(cart) {
  if (!cart) return null;
  if (cart.message3SentAt) return cart.message3SentAt;
  if (cart.message2SentAt) return cart.message2SentAt;
  if (cart.message1SentAt) return cart.message1SentAt;
  return null;
}

async function saveConvertedCustomerFromShopifyOrder({ order, matchedCarts = [] }) {
  const rawPhone = getOrderPhone(order);
  const normalized = normalizeIndianPhone(rawPhone);
  const email = getOrderEmail(order);

  const latestCart = matchedCarts[0] || null;

  const phoneE164 = normalized?.phoneE164 || latestCart?.phoneE164 || null;
  const phoneNumber = normalized?.phoneNumber || latestCart?.phoneNumber || null;
  const countryCode = normalized?.countryCode || latestCart?.countryCode || "+91";

  const customerKey = phoneE164
    ? `phone:${phoneE164}`
    : email
      ? `email:${email}`
      : null;

  if (!customerKey) {
    return {
      saved: false,
      reason: "No phone/email found for converted customer.",
    };
  }

  const recentCampaignLogs = phoneE164
    ? await CampaignLog.find({
        phoneE164,
        status: "sent",
      })
        .sort({ sentAt: -1 })
        .limit(20)
    : [];

  const recentCampaignKeys = recentCampaignLogs.map((log) => log.campaignKey).filter(Boolean);
  const recentTemplates = recentCampaignLogs.map((log) => log.templateName).filter(Boolean);
  const recentAudienceTypes = recentCampaignLogs.map((log) => log.audienceType).filter(Boolean);

  const sourceCartIds = matchedCarts.map((cart) => String(cart._id));

  const now = new Date();

  await ConvertedCustomer.updateOne(
    { customerKey },
    {
      $set: {
        customerKey,

        phoneE164,
        phoneNumber,
        countryCode,

        email: email || latestCart?.email || null,
        customerName: getOrderCustomerName(order),

        currency: latestCart?.currency || order.currency || "INR",

        lastConvertedAt: now,
        lastOrderId: String(order.id || ""),
        lastOrderName: String(order.name || order.order_number || ""),
        lastOrderAt: now,

        lastProductName: latestCart?.productName || null,
        lastCartValue: latestCart?.cartValue || null,
        lastCheckoutUrl: latestCart?.checkoutUrl || null,

        lastMatchedCartId: latestCart?._id ? String(latestCart._id) : null,

        abandonedMessageAttribution: {
          message1Sent: Boolean(latestCart?.message1Sent),
          message2Sent: Boolean(latestCart?.message2Sent),
          message3Sent: Boolean(latestCart?.message3Sent),
          message1SentAt: latestCart?.message1SentAt || null,
          message2SentAt: latestCart?.message2SentAt || null,
          message3SentAt: latestCart?.message3SentAt || null,
          lastMessageNumberBeforeConversion: getLastMessageNumber(latestCart),
          lastMessageSentAt: getLastMessageSentAt(latestCart),
        },

        campaignAttribution: {
          recentCampaignKeys,
          recentTemplates,
          recentAudienceTypes,
        },

        utmSource: latestCart?.utmSource || null,
        utmMedium: latestCart?.utmMedium || null,
        utmCampaign: latestCart?.utmCampaign || null,

        rawOrder: order,
      },

      $setOnInsert: {
        firstConvertedAt: now,
        optOut: false,
      },

      $inc: {
        totalOrders: 1,
        totalSpent: getOrderTotal(order),
      },

      $addToSet: {
        sourceCartIds: {
          $each: sourceCartIds,
        },
      },
    },
    {
      upsert: true,
    }
  );

  return {
    saved: true,
    customerKey,
    phoneE164,
    email,
    matchedCartCount: matchedCarts.length,
  };
}

module.exports = {
  saveConvertedCustomerFromShopifyOrder,
};