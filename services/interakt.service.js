const axios = require("axios");

const STATIC_IMAGE_ONLY_TEMPLATES = new Set([
  "monsoon_abandoned_carts_tillnow_2026",
  "monsoon_ordered_customers_tilljune2026",
  "monsoon_ordered_customers2_tilljune2026",
  "monsoon_abandoned_carts_tillnow2_2026",
]);

function isStaticImageOnlyTemplate(templateName) {
  return STATIC_IMAGE_ONLY_TEMPLATES.has(templateName);
}

function isMessage1Template(templateName) {
  return templateName === process.env.INTERAKT_TEMPLATE_1;
}

function isFollowUpTemplate(templateName) {
  return (
    templateName === process.env.INTERAKT_TEMPLATE_2 ||
    templateName === process.env.INTERAKT_TEMPLATE_3
  );
}

function isImageTemplate(templateName) {
  return (
    isMessage1Template(templateName) ||
    isFollowUpTemplate(templateName)
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
      `Invalid Indian WhatsApp number: ${rawPhone}`
    );
  }

  return {
    countryCode: "+91",
    phoneNumber: digits,
    phoneE164: `+91${digits}`,
  };
}


function getAbandonedCartImageUrl(cart, templateName) {

  // Message 1
  // Product image
  if (isMessage1Template(templateName)) {

    const productImage =
      cart.productImageUrl ||
      cart.imageUrl ||
      null;


    if (!productImage) {
      throw new Error(
        "Product image missing for message 1"
      );
    }


    return productImage;
  }


  // Message 2 and 3
  // Fixed campaign image
  if (isFollowUpTemplate(templateName)) {

    const followupImage =
      process.env.INTERAKT_FOLLOWUP_IMAGE_URL;


    if (!followupImage) {
      throw new Error(
        "INTERAKT_FOLLOWUP_IMAGE_URL missing"
      );
    }


    return followupImage;
  }


  return (
    cart.productImageUrl ||
    process.env.INTERAKT_FALLBACK_IMAGE_URL ||
    null
  );
}


function getCampaignImageUrl(contact = {}, options = {}) {

  const imageUrl =
    options.headerMediaUrl ||
    options.abandonedHeaderMediaUrl ||
    options.convertedCustomerHeaderMediaUrl ||
    options.convertedCustomerHeaderMediaUrl ||
    options.campaignImageUrl ||
    contact.headerMediaUrl ||
    contact.imageUrl ||
    process.env.INTERAKT_CAMPAIGN_IMAGE_URL ||
    process.env.INTERAKT_FALLBACK_IMAGE_URL ||
    null;


  if (!imageUrl) {
    throw new Error(
      "Campaign image missing"
    );
  }


  if (!isValidUrl(imageUrl)) {
    throw new Error(
      `Invalid campaign image URL ${imageUrl}`
    );
  }


  return imageUrl;
}


function getSafeCheckoutUrl(cart) {

  const checkoutUrl = cart.checkoutUrl;


  if (!checkoutUrl) {
    throw new Error(
      "Checkout URL missing"
    );
  }


  return checkoutUrl;
}


function ensureInteraktEnv(){

  if(!process.env.INTERAKT_API_KEY){
    throw new Error(
      "INTERAKT_API_KEY missing"
    );
  }


  if(!process.env.INTERAKT_API_URL){
    throw new Error(
      "INTERAKT_API_URL missing"
    );
  }
}



async function sendInteraktTemplate(cart, templateName){

  ensureInteraktEnv();


  const normalizedPhone =
    normalizeIndianPhoneForInterakt(cart);


  const customerName =
    cart.customerName || "there";


  const productName =
    cart.productName || "your Omichef cookware";


  const checkoutUrl =
    getSafeCheckoutUrl(cart);



  const imageUrl =
    getAbandonedCartImageUrl(
      cart,
      templateName
    );



  let payload;



  if(isImageTemplate(templateName)){


    payload = {

      countryCode:
        normalizedPhone.countryCode,

      phoneNumber:
        normalizedPhone.phoneNumber,

      callbackData:
        `abandoned_cart_${cart._id}`,

      type:"Template",


      template:{

        name:templateName,

        languageCode:
          process.env.INTERAKT_LANGUAGE || "en",


        headerValues:[
          imageUrl
        ],


        bodyValues:[
          customerName,
          productName
        ],


        buttonValues:{
          "0":[checkoutUrl]
        }

      }

    };


  } else {


    payload = {

      countryCode:
        normalizedPhone.countryCode,

      phoneNumber:
        normalizedPhone.phoneNumber,

      callbackData:
        `abandoned_cart_${cart._id}`,

      type:"Template",


      template:{

        name:templateName,

        languageCode:
          process.env.INTERAKT_LANGUAGE || "en",

        bodyValues:[
          customerName,
          productName,
          checkoutUrl
        ]

      }

    };

  }


  console.log(
    "INTERAKT PAYLOAD",
    JSON.stringify(payload,null,2)
  );



  const response =
    await axios.post(
      process.env.INTERAKT_API_URL,
      payload,
      {
        headers:{
          Authorization:
          `Basic ${process.env.INTERAKT_API_KEY}`,

          "Content-Type":
          "application/json",
        },

        timeout:20000,
      }
    );


  return {
    ok:true,
    data:response.data,
  };

}



async function sendInteraktCampaignTemplate(
  contact,
  templateName,
  bodyValues=[],
  options={}
){

  ensureInteraktEnv();


  const normalizedPhone =
    normalizeIndianPhoneForInterakt(contact);



  const campaignImageUrl =
    getCampaignImageUrl(
      contact,
      options
    );


  const payload={

    countryCode:
      normalizedPhone.countryCode,

    phoneNumber:
      normalizedPhone.phoneNumber,


    callbackData:
      `campaign_${contact.campaignKey || "manual"}`,


    type:"Template",


    template:{

      name:templateName,

      languageCode:
      process.env.INTERAKT_LANGUAGE || "en",


      headerValues:[
        campaignImageUrl
      ]

    }

  };



  if(
    Array.isArray(bodyValues)
    &&
    bodyValues.length>0
  ){

    payload.template.bodyValues =
      bodyValues;

  }



  if(options.sendDynamicButton){

    payload.template.buttonValues={
      "0":[options.buttonUrl]
    };

  }



  console.log(
    "INTERAKT CAMPAIGN PAYLOAD",
    JSON.stringify(payload,null,2)
  );



  const response =
    await axios.post(
      process.env.INTERAKT_API_URL,
      payload,
      {
        headers:{
          Authorization:
          `Basic ${process.env.INTERAKT_API_KEY}`,

          "Content-Type":
          "application/json",
        },

        timeout:20000,
      }
    );


  return {
    ok:true,
    data:response.data,
  };

}



module.exports={
  sendInteraktTemplate,
  sendInteraktCampaignTemplate,
};