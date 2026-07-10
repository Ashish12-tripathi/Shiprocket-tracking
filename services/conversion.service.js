const ConvertedCustomer = require("../models/ConvertedCustomer");
const CampaignLog = require("../models/CampaignLog");

const {
  syncConvertedCustomerToInteraktCampaignCollections,
} = require("./interaktCampaignSync.service");

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

  return (
    full ||
    order?.billing_address?.name ||
    order?.shipping_address?.name ||
    "Customer"
  );
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

/*
  UTM extraction logic:
  This reads UTM data from Shopify order webhook fields.

  It checks:
  1. order.note_attributes
  2. order.landing_site
  3. order.referring_site

  This is important because your Interakt template is sending users
  through a UTM URL. If Shopify passes that UTM into the order webhook,
  this function will save it into convertedcustomers.
*/

function cleanUtmValue(value) {
  if (!value) return undefined;
  return String(value).trim() || undefined;
}

function parseUtmFromUrl(urlValue) {
  if (!urlValue || typeof urlValue !== "string") {
    return {};
  }

  try {
    const safeUrl = urlValue.startsWith("http")
      ? urlValue
      : `https://dummy.com${urlValue.startsWith("/") ? "" : "/"}${urlValue}`;

    const url = new URL(safeUrl);

    return {
      utmId: cleanUtmValue(url.searchParams.get("utm_id")),
      utmSource: cleanUtmValue(url.searchParams.get("utm_source")),
      utmMedium: cleanUtmValue(url.searchParams.get("utm_medium")),
      utmCampaign: cleanUtmValue(url.searchParams.get("utm_campaign")),
      utmTerm: cleanUtmValue(url.searchParams.get("utm_term")),
      utmContent: cleanUtmValue(url.searchParams.get("utm_content")),
    };
  } catch (error) {
    return {};
  }
}

function parseUtmFromNoteAttributes(noteAttributes) {
  if (!Array.isArray(noteAttributes)) {
    return {};
  }

  const result = {};

  for (const item of noteAttributes) {
    const key = String(item.name || item.key || "").trim().toLowerCase();
    const value = cleanUtmValue(item.value);

    if (!key || !value) continue;

    if (key === "utm_id") result.utmId = value;
    if (key === "utm_source") result.utmSource = value;
    if (key === "utm_medium") result.utmMedium = value;
    if (key === "utm_campaign") result.utmCampaign = value;
    if (key === "utm_term") result.utmTerm = value;
    if (key === "utm_content") result.utmContent = value;
  }

  return result;
}

function extractUtmFromShopifyOrder(order) {
  const fromNoteAttributes = parseUtmFromNoteAttributes(order?.note_attributes);
  const fromLandingSite = parseUtmFromUrl(order?.landing_site);
  const fromReferringSite = parseUtmFromUrl(order?.referring_site);

  return {
    utmId:
      fromNoteAttributes.utmId ||
      fromLandingSite.utmId ||
      fromReferringSite.utmId,

    utmSource:
      fromNoteAttributes.utmSource ||
      fromLandingSite.utmSource ||
      fromReferringSite.utmSource,

    utmMedium:
      fromNoteAttributes.utmMedium ||
      fromLandingSite.utmMedium ||
      fromReferringSite.utmMedium,

    utmCampaign:
      fromNoteAttributes.utmCampaign ||
      fromLandingSite.utmCampaign ||
      fromReferringSite.utmCampaign,

    utmTerm:
      fromNoteAttributes.utmTerm ||
      fromLandingSite.utmTerm ||
      fromReferringSite.utmTerm,

    utmContent:
      fromNoteAttributes.utmContent ||
      fromLandingSite.utmContent ||
      fromReferringSite.utmContent,
  };
}

function buildUtmSet({ order, latestCart }) {
  const orderUtmData = extractUtmFromShopifyOrder(order);

  /*
    Priority:
    1. Shopify order UTM
    2. matched abandoned cart UTM
    3. do not set field if empty

    This prevents empty UTM values from overwriting useful old data.
  */

  const utmSet = {};

  const utmId = orderUtmData.utmId || latestCart?.utmId;
  const utmSource = orderUtmData.utmSource || latestCart?.utmSource;
  const utmMedium = orderUtmData.utmMedium || latestCart?.utmMedium;
  const utmCampaign = orderUtmData.utmCampaign || latestCart?.utmCampaign;
  const utmTerm = orderUtmData.utmTerm || latestCart?.utmTerm;
  const utmContent = orderUtmData.utmContent || latestCart?.utmContent;

  if (utmId) utmSet.utmId = utmId;
  if (utmSource) utmSet.utmSource = utmSource;
  if (utmMedium) utmSet.utmMedium = utmMedium;
  if (utmCampaign) utmSet.utmCampaign = utmCampaign;
  if (utmTerm) utmSet.utmTerm = utmTerm;
  if (utmContent) utmSet.utmContent = utmContent;

  return utmSet;
}

async function saveConvertedCustomerFromShopifyOrder({
  order,
  matchedCarts = [],
}) {
  const rawPhone = getOrderPhone(order);
  const normalized = normalizeIndianPhone(rawPhone);
  const email = getOrderEmail(order);

  const latestCart = matchedCarts[0] || null;

  const phoneE164 = normalized?.phoneE164 || latestCart?.phoneE164 || null;
  const phoneNumber = normalized?.phoneNumber || latestCart?.phoneNumber || null;
  const countryCode =
    normalized?.countryCode || latestCart?.countryCode || "+91";

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

  const recentCampaignKeys = recentCampaignLogs
    .map((log) => log.campaignKey)
    .filter(Boolean);

  const recentTemplates = recentCampaignLogs
    .map((log) => log.templateName)
    .filter(Boolean);

  const recentAudienceTypes = recentCampaignLogs
    .map((log) => log.audienceType)
    .filter(Boolean);

  const sourceCartIds = matchedCarts.map((cart) => String(cart._id));

  const now = new Date();

  const utmSet = buildUtmSet({
    order,
    latestCart,
  });

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

        ...utmSet,

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

  /*
    New sync logic:
    After converted customer is saved/updated, fetch latest record
    and automatically copy it into the correct Interakt campaign DB
    if its UTM/campaign attribution matches one of your two campaigns.
  */

  let interaktCampaignSyncResult = null;

  try {
    const updatedConvertedCustomer = await ConvertedCustomer.findOne({
      customerKey,
    });

    if (updatedConvertedCustomer) {
      interaktCampaignSyncResult =
        await syncConvertedCustomerToInteraktCampaignCollections(
          updatedConvertedCustomer
        );
    }
  } catch (syncError) {
    console.error("Interakt campaign sync failed for converted customer:", {
      customerKey,
      phoneE164,
      email,
      error: syncError.message,
    });
  }

  return {
    saved: true,
    customerKey,
    phoneE164,
    email,
    matchedCartCount: matchedCarts.length,
    utmSaved: Object.keys(utmSet).length > 0,
    utmSet,
    interaktCampaignSyncResult,
  };
}

module.exports = {
  saveConvertedCustomerFromShopifyOrder,
};