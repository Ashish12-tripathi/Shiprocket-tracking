const InteraktOrderedCustomerConversion = require("../models/InteraktOrderedCustomerConversion");
const InteraktAbandonedCartConversion = require("../models/InteraktAbandonedCartConversion");


const ORDERED_CUSTOMER_CAMPAIGNS = [
  {
    campaignKey:
      "monsoon_ordered_customers_tilljune2026_ip",

    templateName:
      "monsoon_ordered_customers_tilljune2026_ip",

    audienceType:
      "converted_customer",

    utmCampaign:
      "monsoon_ordered_customers_tilljune2026_ip",

    utmContent:
      "monsoon_ordered_customers_tilljune2026_ip",
  },

  {
    campaignKey:
      "monsoon_ordered_customers2_tilljune2026",

    templateName:
      "monsoon_ordered_customers2_tilljune2026",

    audienceType:
      "converted_customer",

    utmCampaign:
      "monsoon_ordered_customers2_tilljune2026",

    utmContent:
      "monsoon_ordered_customers2_tilljune2026",
  },
];


const ABANDONED_CART_CAMPAIGNS = [
  {
    campaignKey:
      "monsoon_abandoned_carts_tillnow_2026",

    templateName:
      "monsoon_abandoned_carts_tillnow_2026",

    audienceType:
      "abandoned_cart",

    utmCampaign:
      "monsoon_abandoned_carts_tillnow_2026",

    utmContent:
      "monsoon_abandoned_carts_tillnow_2026",
  },

  {
    campaignKey:
      "monsoon_abandoned_carts_tillnow2_2026",

    templateName:
      "monsoon_abandoned_carts_tillnow2_2026",

    audienceType:
      "abandoned_cart",

    utmCampaign:
      "monsoon_abandoned_carts_tillnow2_2026",

    utmContent:
      "monsoon_abandoned_carts_tillnow2_2026",
  },
];


function normalizeString(value) {
  if (!value) return "";

  return String(value)
    .trim()
    .toLowerCase();
}


function getCampaignMatchType(
  convertedCustomer,
  campaignConfig
) {

  const utmSource =
    normalizeString(convertedCustomer.utmSource);

  const utmMedium =
    normalizeString(convertedCustomer.utmMedium);

  const utmCampaign =
    normalizeString(convertedCustomer.utmCampaign);

  const utmContent =
    normalizeString(convertedCustomer.utmContent);


  const expectedCampaign =
    normalizeString(campaignConfig.utmCampaign);


  const expectedContent =
    normalizeString(campaignConfig.utmContent);

const sourceMatch =
  [
    "whatsapp",
    "wa",
  ].includes(utmSource);


  const mediumMatch =
[
  "interakt",
  "interakt_campaign",
  "interakt_abandoned_cart",
  "interakt_ordered_customer",
].includes(utmMedium);


  const campaignMatch =
    utmCampaign === expectedCampaign;


  const contentMatch =
    utmContent === expectedContent;


  if (
    sourceMatch &&
    mediumMatch &&
    (campaignMatch || contentMatch)
  ) {
    return "utm";
  }


  return null;
}


function buildCampaignConversionPayload(
  convertedCustomer,
  campaignConfig,
  matchedBy
) {

  return {

    customerKey:
      convertedCustomer.customerKey,


    convertedCustomerId:
      convertedCustomer._id,


    phoneE164:
      convertedCustomer.phoneE164,

    phoneNumber:
      convertedCustomer.phoneNumber,

    countryCode:
      convertedCustomer.countryCode,


    email:
      convertedCustomer.email,


    customerName:
      convertedCustomer.customerName,


    totalOrders:
      convertedCustomer.totalOrders || 0,


    totalSpent:
      convertedCustomer.totalSpent || 0,


    currency:
      convertedCustomer.currency || "INR",


    firstConvertedAt:
      convertedCustomer.firstConvertedAt,


    lastConvertedAt:
      convertedCustomer.lastConvertedAt,


    lastOrderId:
      convertedCustomer.lastOrderId,


    lastOrderName:
      convertedCustomer.lastOrderName,


    lastOrderAt:
      convertedCustomer.lastOrderAt,


    lastProductName:
      convertedCustomer.lastProductName,


    lastCartValue:
      convertedCustomer.lastCartValue,


    lastCheckoutUrl:
      convertedCustomer.lastCheckoutUrl,


    lastMatchedCartId:
      convertedCustomer.lastMatchedCartId,


    sourceCartIds:
      convertedCustomer.sourceCartIds || [],


    campaignKey:
      campaignConfig.campaignKey,


    templateName:
      campaignConfig.templateName,


    audienceType:
      campaignConfig.audienceType,


    utmId:
      convertedCustomer.utmId,


    utmSource:
      convertedCustomer.utmSource,


    utmMedium:
      convertedCustomer.utmMedium,


    utmCampaign:
      convertedCustomer.utmCampaign,


    utmTerm:
      convertedCustomer.utmTerm,


    utmContent:
      convertedCustomer.utmContent,


    matchedBy,


    optOut:
      Boolean(convertedCustomer.optOut),


    rawOrder:
      convertedCustomer.rawOrder,
  };
}



async function upsertCampaignConversion(
  Model,
  convertedCustomer,
  campaignConfig,
  matchedBy
) {

  if (
    !convertedCustomer ||
    !convertedCustomer.customerKey
  ) {
    return null;
  }


  const payload =
    buildCampaignConversionPayload(
      convertedCustomer,
      campaignConfig,
      matchedBy
    );


  return Model.updateOne(
    {
      customerKey:
        convertedCustomer.customerKey,
    },

    {
      $set:
        payload,
    },

    {
      upsert:true,
    }
  );
}



async function syncConvertedCustomerToInteraktCampaignCollections(
  convertedCustomer
) {

  if (!convertedCustomer) {

    return {
      orderedCustomerMatched:false,
      abandonedCartMatched:false,
    };

  }


  const result = {

    orderedCustomerMatched:false,

    abandonedCartMatched:false,

  };


  // ORDERED CUSTOMER CHECK

  for (
    const campaign of ORDERED_CUSTOMER_CAMPAIGNS
  ) {


    const matchType =
      getCampaignMatchType(
        convertedCustomer,
        campaign
      );


    if(matchType){

      await upsertCampaignConversion(
        InteraktOrderedCustomerConversion,
        convertedCustomer,
        campaign,
        matchType
      );


      result.orderedCustomerMatched=true;

      break;

    }

  }



  // ABANDONED CART CHECK

  for (
    const campaign of ABANDONED_CART_CAMPAIGNS
  ) {


    const matchType =
      getCampaignMatchType(
        convertedCustomer,
        campaign
      );


    if(matchType){

      await upsertCampaignConversion(
        InteraktAbandonedCartConversion,
        convertedCustomer,
        campaign,
        matchType
      );


      result.abandonedCartMatched=true;

      break;

    }

  }



  return result;
}


module.exports = {

  ORDERED_CUSTOMER_CAMPAIGNS,

  ABANDONED_CART_CAMPAIGNS,

  syncConvertedCustomerToInteraktCampaignCollections,

};