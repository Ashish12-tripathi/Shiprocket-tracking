const InteraktOrderedCustomerConversion = require("../models/InteraktOrderedCustomerConversion");
const InteraktAbandonedCartConversion = require("../models/InteraktAbandonedCartConversion");

const ORDERED_CUSTOMER_CAMPAIGN = {
  campaignKey: "monsoon_ordered_customers_tilljune2026",
  templateName: "orderplacedcustomertilljune",
  audienceType: "converted_customer",
  utmCampaign: "monsoon_ordered_customers",
  utmContent: "orderplacedcustomertilljune",
};

const ABANDONED_CART_CAMPAIGN = {
  campaignKey: "monsoon_abandoned_carts_tillnow_2026",
  templateName: "abandoned_cart_tillnow",
  audienceType: "abandoned_cart",
  utmCampaign: "monsoon_abandoned_carts",
  utmContent: "abandoned_cart_tillnow",
};

function normalizeString(value) {
  if (!value) return "";
  return String(value).trim().toLowerCase();
}

function includesValue(arrayValue, expectedValue) {
  if (!Array.isArray(arrayValue)) return false;

  const normalizedExpected = normalizeString(expectedValue);

  return arrayValue.some((item) => normalizeString(item) === normalizedExpected);
}

function getCampaignMatchType(convertedCustomer, campaignConfig) {
  const utmCampaign = normalizeString(convertedCustomer.utmCampaign);
  const utmContent = normalizeString(convertedCustomer.utmContent);
  const utmSource = normalizeString(convertedCustomer.utmSource);
  const utmMedium = normalizeString(convertedCustomer.utmMedium);

  const expectedUtmCampaign = normalizeString(campaignConfig.utmCampaign);
  const expectedUtmContent = normalizeString(campaignConfig.utmContent);

  const campaignKeys =
    convertedCustomer?.campaignAttribution?.recentCampaignKeys || [];
  const templates =
    convertedCustomer?.campaignAttribution?.recentTemplates || [];
  const audienceTypes =
    convertedCustomer?.campaignAttribution?.recentAudienceTypes || [];

  const matchedByUtmCampaign =
    utmCampaign && expectedUtmCampaign && utmCampaign === expectedUtmCampaign;

  const matchedByUtmContent =
    utmContent && expectedUtmContent && utmContent === expectedUtmContent;

  const matchedByCampaignKey = includesValue(
    campaignKeys,
    campaignConfig.campaignKey
  );

  const matchedByTemplate = includesValue(templates, campaignConfig.templateName);

  const matchedByAudienceType = includesValue(
    audienceTypes,
    campaignConfig.audienceType
  );

  const isWhatsappInterakt =
    utmSource === "whatsapp" &&
    ["interakt", "interakt_campaign"].includes(utmMedium);

  if ((matchedByUtmCampaign || matchedByUtmContent) && isWhatsappInterakt) {
    return "utm";
  }

  if (matchedByCampaignKey || matchedByTemplate || matchedByAudienceType) {
    return "campaignAttribution";
  }

  return null;
}

function buildCampaignConversionPayload(convertedCustomer, campaignConfig, matchedBy) {
  return {
    customerKey: convertedCustomer.customerKey,
    convertedCustomerId: convertedCustomer._id,

    phoneE164: convertedCustomer.phoneE164,
    phoneNumber: convertedCustomer.phoneNumber,
    countryCode: convertedCustomer.countryCode,

    email: convertedCustomer.email,
    customerName: convertedCustomer.customerName,

    totalOrders: convertedCustomer.totalOrders || 0,
    totalSpent: convertedCustomer.totalSpent || 0,
    currency: convertedCustomer.currency || "INR",

    firstConvertedAt: convertedCustomer.firstConvertedAt,
    lastConvertedAt: convertedCustomer.lastConvertedAt,

    lastOrderId: convertedCustomer.lastOrderId,
    lastOrderName: convertedCustomer.lastOrderName,
    lastOrderAt: convertedCustomer.lastOrderAt,

    lastProductName: convertedCustomer.lastProductName,
    lastCartValue: convertedCustomer.lastCartValue,
    lastCheckoutUrl: convertedCustomer.lastCheckoutUrl,
    lastMatchedCartId: convertedCustomer.lastMatchedCartId,

    sourceCartIds: convertedCustomer.sourceCartIds || [],

    campaignKey: campaignConfig.campaignKey,
    templateName: campaignConfig.templateName,
    audienceType: campaignConfig.audienceType,

    utmId: convertedCustomer.utmId,
    utmSource: convertedCustomer.utmSource,
    utmMedium: convertedCustomer.utmMedium,
    utmCampaign: convertedCustomer.utmCampaign,
    utmTerm: convertedCustomer.utmTerm,
    utmContent: convertedCustomer.utmContent,

    matchedBy,

    optOut: Boolean(convertedCustomer.optOut),

    rawOrder: convertedCustomer.rawOrder,
  };
}

async function upsertCampaignConversion(Model, convertedCustomer, campaignConfig, matchedBy) {
  if (!convertedCustomer || !convertedCustomer.customerKey) {
    return null;
  }

  const payload = buildCampaignConversionPayload(
    convertedCustomer,
    campaignConfig,
    matchedBy
  );

  return Model.updateOne(
    {
      customerKey: convertedCustomer.customerKey,
    },
    {
      $set: payload,
    },
    {
      upsert: true,
    }
  );
}

async function syncConvertedCustomerToInteraktCampaignCollections(convertedCustomer) {
  if (!convertedCustomer) {
    return {
      orderedCustomerMatched: false,
      abandonedCartMatched: false,
    };
  }

  const orderedMatchType = getCampaignMatchType(
    convertedCustomer,
    ORDERED_CUSTOMER_CAMPAIGN
  );

  const abandonedMatchType = getCampaignMatchType(
    convertedCustomer,
    ABANDONED_CART_CAMPAIGN
  );

  const result = {
    orderedCustomerMatched: false,
    abandonedCartMatched: false,
  };

  if (orderedMatchType) {
    await upsertCampaignConversion(
      InteraktOrderedCustomerConversion,
      convertedCustomer,
      ORDERED_CUSTOMER_CAMPAIGN,
      orderedMatchType
    );

    result.orderedCustomerMatched = true;
  }

  if (abandonedMatchType) {
    await upsertCampaignConversion(
      InteraktAbandonedCartConversion,
      convertedCustomer,
      ABANDONED_CART_CAMPAIGN,
      abandonedMatchType
    );

    result.abandonedCartMatched = true;
  }

  return result;
}

module.exports = {
  ORDERED_CUSTOMER_CAMPAIGN,
  ABANDONED_CART_CAMPAIGN,
  syncConvertedCustomerToInteraktCampaignCollections,
};