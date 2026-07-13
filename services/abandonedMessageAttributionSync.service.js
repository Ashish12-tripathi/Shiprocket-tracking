const AbandonedMessageAttributedConversion = require("../models/AbandonedMessageAttributedConversion");

function getLastMessageNumberBeforeConversion(convertedCustomer) {
  const value =
    convertedCustomer?.abandonedMessageAttribution
      ?.lastMessageNumberBeforeConversion;

  const numberValue = Number(value);

  return Number.isNaN(numberValue) ? 0 : numberValue;
}

function shouldSyncAbandonedMessageAttributedConversion(convertedCustomer) {
  return getLastMessageNumberBeforeConversion(convertedCustomer) > 0;
}

function buildPayload(convertedCustomer) {
  const attribution = convertedCustomer.abandonedMessageAttribution || {};

  return {
    customerKey: convertedCustomer.customerKey,
    convertedCustomerId: convertedCustomer._id,

    phoneE164: convertedCustomer.phoneE164,
    phoneNumber: convertedCustomer.phoneNumber,
    countryCode: convertedCustomer.countryCode || "+91",

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

    attributionType: "abandoned_message",

    lastMessageNumberBeforeConversion:
      attribution.lastMessageNumberBeforeConversion || 0,

    lastMessageSentAt: attribution.lastMessageSentAt || null,

    message1Sent: Boolean(attribution.message1Sent),
    message2Sent: Boolean(attribution.message2Sent),
    message3Sent: Boolean(attribution.message3Sent),

    message1SentAt: attribution.message1SentAt || null,
    message2SentAt: attribution.message2SentAt || null,
    message3SentAt: attribution.message3SentAt || null,

    abandonedMessageAttribution: attribution,
    campaignAttribution: convertedCustomer.campaignAttribution || {},

    utmId: convertedCustomer.utmId,
    utmSource: convertedCustomer.utmSource,
    utmMedium: convertedCustomer.utmMedium,
    utmCampaign: convertedCustomer.utmCampaign,
    utmTerm: convertedCustomer.utmTerm,
    utmContent: convertedCustomer.utmContent,

    optOut: Boolean(convertedCustomer.optOut),

    rawOrder: convertedCustomer.rawOrder,

    syncedAt: new Date(),
  };
}

async function syncConvertedCustomerToAbandonedMessageAttributedCollection(
  convertedCustomer
) {
  if (!convertedCustomer || !convertedCustomer.customerKey) {
    return {
      matched: false,
      reason: "missing_converted_customer_or_customerKey",
    };
  }

  if (!shouldSyncAbandonedMessageAttributedConversion(convertedCustomer)) {
    return {
      matched: false,
      reason: "lastMessageNumberBeforeConversion_not_greater_than_0",
    };
  }

  const payload = buildPayload(convertedCustomer);

  await AbandonedMessageAttributedConversion.updateOne(
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

  return {
    matched: true,
    lastMessageNumberBeforeConversion:
      payload.lastMessageNumberBeforeConversion,
  };
}

module.exports = {
  syncConvertedCustomerToAbandonedMessageAttributedCollection,
};