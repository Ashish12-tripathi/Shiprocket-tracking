const AbandonedCart = require("../models/AbandonedCart");
const GameWinnerContact = require("../models/GameWinnerContact");
const GameVoterContact = require("../models/GameVoterContact");
const ConvertedCustomer = require("../models/ConvertedCustomer");
const CampaignLog = require("../models/CampaignLog");
const { sendInteraktCampaignTemplate } = require("./interakt.service");

const STATIC_IMAGE_ONLY_TEMPLATES = new Set([
  "monsoon_abandoned_carts_tillnow_2026",
  "monsoon_ordered_customers_tilljune2026_ip",
]);

function getName(contact) {
  return contact.customerName || contact.name || "Customer";
}

function normalizeIndianPhone(contact = {}) {
  const rawPhone =
    contact.phoneE164 ||
    contact.phoneNumber ||
    contact.phone ||
    contact.mobile ||
    contact.customerPhone ||
    "";

  let digits = String(rawPhone).replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  if (digits.startsWith("91") && digits.length === 12) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("0") && digits.length === 11) {
    digits = digits.slice(1);
  }

  if (!/^[6-9][0-9]{9}$/.test(digits)) {
    return null;
  }

  return {
    countryCode: "+91",
    phoneNumber: digits,
    phoneE164: `+91${digits}`,
  };
}

function isValidUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

function toBoolean(value) {
  return value === true || value === "true";
}

function appendCampaignUtm(url, campaignKey, audienceType, templateName) {
  if (!url || !isValidUrl(url)) {
    return url;
  }

  try {
    const parsedUrl = new URL(url);

    if (!parsedUrl.searchParams.get("utm_id")) {
      parsedUrl.searchParams.set("utm_id", campaignKey);
    }

    if (!parsedUrl.searchParams.get("utm_source")) {
      parsedUrl.searchParams.set("utm_source", "whatsapp");
    }

    if (!parsedUrl.searchParams.get("utm_medium")) {
      parsedUrl.searchParams.set("utm_medium", "interakt_campaign");
    }

    if (!parsedUrl.searchParams.get("utm_campaign")) {
      parsedUrl.searchParams.set("utm_campaign", campaignKey);
    }

    if (!parsedUrl.searchParams.get("utm_term")) {
      parsedUrl.searchParams.set("utm_term", audienceType);
    }

    if (!parsedUrl.searchParams.get("utm_content")) {
      parsedUrl.searchParams.set("utm_content", templateName);
    }

    return parsedUrl.toString();
  } catch (error) {
    return url;
  }
}

async function hasCampaignAlreadySent(campaignKey, phoneE164) {
  if (!campaignKey || !phoneE164) return true;

  const existing = await CampaignLog.findOne({
    campaignKey,
    phoneE164,
    status: "sent",
  });

  return Boolean(existing);
}

async function saveCampaignLog({
  campaignKey,
  audienceType,
  contact,
  templateName,
  status,
  error,
  sourceCollection,
  rawResponse,
}) {
  await CampaignLog.findOneAndUpdate(
    {
      campaignKey,
      phoneE164: contact.phoneE164,
    },
    {
      $set: {
        campaignKey,
        audienceType,
        phoneE164: contact.phoneE164,
        email: contact.email || null,
        templateName,
        status,
        sentAt: new Date(),
        error: error || null,
        sourceCollection,
        sourceDocumentId: String(contact._id),
        rawResponse: rawResponse || null,
      },
    },
    {
      upsert: true,
      new: true,
    }
  );
}

function getHeaderMediaUrlForAudience(audienceType, campaignOptions = {}) {
  if (audienceType === "abandoned_cart") {
    return (
      campaignOptions.abandonedHeaderMediaUrl ||
      campaignOptions.headerMediaUrl ||
      campaignOptions.campaignImageUrl ||
      null
    );
  }

  if (audienceType === "converted_customer") {
    return (
      campaignOptions.convertedCustomerHeaderMediaUrl ||
      campaignOptions.headerMediaUrl ||
      campaignOptions.campaignImageUrl ||
      null
    );
  }

  if (audienceType === "game_winner") {
    return (
      campaignOptions.gameWinnerHeaderMediaUrl ||
      campaignOptions.headerMediaUrl ||
      campaignOptions.campaignImageUrl ||
      null
    );
  }

  if (audienceType === "game_voter") {
    return (
      campaignOptions.gameVoterHeaderMediaUrl ||
      campaignOptions.headerMediaUrl ||
      campaignOptions.campaignImageUrl ||
      null
    );
  }

  return campaignOptions.headerMediaUrl || campaignOptions.campaignImageUrl || null;
}

function getBodyValuesForTemplate({ templateName, audienceType, contact }) {
  if (STATIC_IMAGE_ONLY_TEMPLATES.has(templateName)) {
    return [];
  }

  if (audienceType === "abandoned_cart") {
    return [
      getName(contact),
      contact.productName || "your Omichef product",
    ];
  }

  if (audienceType === "converted_customer") {
    return [getName(contact)];
  }

  if (audienceType === "game_winner") {
    return [
      getName(contact),
      contact.dishName || "your dish",
    ];
  }

  if (audienceType === "game_voter") {
    return [getName(contact)];
  }

  return [];
}

async function sendToContacts({
  contacts,
  campaignKey,
  audienceType,
  sourceCollection,
  templateName,
  campaignOptions = {},
}) {
  const results = [];

  for (const contact of contacts) {
    const plainContact =
      typeof contact.toObject === "function" ? contact.toObject() : contact;

    try {
      const normalizedPhone = normalizeIndianPhone(plainContact);

      if (!normalizedPhone) {
        const message = `Invalid or missing Indian phone number: ${
          plainContact.phoneE164 || plainContact.phoneNumber || "empty"
        }`;

        const failedContact = {
          ...plainContact,
          phoneE164: plainContact.phoneE164 || null,
        };

        if (failedContact.phoneE164) {
          await saveCampaignLog({
            campaignKey,
            audienceType,
            contact: failedContact,
            templateName,
            status: "failed",
            error: message,
            sourceCollection,
          });
        }

        results.push({
          phone: plainContact.phoneE164 || plainContact.phoneNumber || null,
          sent: false,
          skipped: true,
          reason: message,
          audienceType,
        });

        continue;
      }

      const contactForSend = {
        ...plainContact,
        ...normalizedPhone,
        campaignKey,
      };

      const alreadySent = await hasCampaignAlreadySent(
        campaignKey,
        contactForSend.phoneE164
      );

      if (alreadySent) {
        results.push({
          phone: contactForSend.phoneE164,
          skipped: true,
          reason: "Campaign already sent to this phone",
          audienceType,
        });

        continue;
      }

      const isStaticImageOnlyTemplate =
        STATIC_IMAGE_ONLY_TEMPLATES.has(templateName);

      const shouldSendDynamicButton =
        !isStaticImageOnlyTemplate &&
        (toBoolean(campaignOptions.sendDynamicButton) ||
          toBoolean(campaignOptions.hasDynamicButton));

      let buttonUrl = null;

      if (shouldSendDynamicButton) {
        const checkoutUrl =
          campaignOptions.buttonUrl ||
          campaignOptions.checkoutUrl ||
          contactForSend.checkoutUrl ||
          contactForSend.lastCheckoutUrl ||
          null;

        buttonUrl = checkoutUrl
          ? appendCampaignUtm(checkoutUrl, campaignKey, audienceType, templateName)
          : null;
      }

      const bodyValues = getBodyValuesForTemplate({
        templateName,
        audienceType,
        contact: contactForSend,
      });

      const response = await sendInteraktCampaignTemplate(
        contactForSend,
        templateName,
        bodyValues,
        {
          headerMediaUrl: getHeaderMediaUrlForAudience(
            audienceType,
            campaignOptions
          ),

          abandonedHeaderMediaUrl:
            campaignOptions.abandonedHeaderMediaUrl || null,

          convertedCustomerHeaderMediaUrl:
            campaignOptions.convertedCustomerHeaderMediaUrl || null,

          gameWinnerHeaderMediaUrl:
            campaignOptions.gameWinnerHeaderMediaUrl || null,

          gameVoterHeaderMediaUrl:
            campaignOptions.gameVoterHeaderMediaUrl || null,

          campaignImageUrl: campaignOptions.campaignImageUrl || null,

          sendDynamicButton: shouldSendDynamicButton,
          hasDynamicButton: shouldSendDynamicButton,

          buttonUrl,
          checkoutUrl: buttonUrl,
        }
      );

      await saveCampaignLog({
        campaignKey,
        audienceType,
        contact: contactForSend,
        templateName,
        status: "sent",
        sourceCollection,
        rawResponse: response,
      });

      results.push({
        phone: contactForSend.phoneE164,
        sent: true,
        audienceType,
      });
    } catch (error) {
      const message = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;

      const normalizedPhone = normalizeIndianPhone(plainContact);

      const contactForLog = {
        ...plainContact,
        ...(normalizedPhone || {}),
        phoneE164:
          normalizedPhone?.phoneE164 ||
          plainContact.phoneE164 ||
          plainContact.phoneNumber ||
          null,
      };

      if (contactForLog.phoneE164) {
        await saveCampaignLog({
          campaignKey,
          audienceType,
          contact: contactForLog,
          templateName,
          status: "failed",
          error: message,
          sourceCollection,
        });
      }

      results.push({
        phone: contactForLog.phoneE164,
        sent: false,
        audienceType,
        error: message,
      });
    }
  }

  return results;
}

async function sendConvertedCustomerCampaign({
  campaignKey,
  templateName,
  limit = 500,
  campaignOptions = {},
}) {
  const contacts = await ConvertedCustomer.find({
    optOut: false,
    phoneE164: { $exists: true, $ne: null },
  })
    .sort({ lastConvertedAt: -1 })
    .limit(Number(limit));

  return sendToContacts({
    contacts,
    campaignKey,
    audienceType: "converted_customer",
    sourceCollection: "convertedcustomers",
    templateName,
    campaignOptions,
  });
}

async function sendGameWinnerCampaign({
  campaignKey,
  templateName,
  limit = 500,
  campaignOptions = {},
}) {
  const contacts = await GameWinnerContact.find({
    validPhone: true,
    optOut: false,
    phoneE164: { $exists: true, $ne: null },
  })
    .sort({ createdAt: -1 })
    .limit(Number(limit));

  return sendToContacts({
    contacts,
    campaignKey,
    audienceType: "game_winner",
    sourceCollection: "gamewinnercontacts",
    templateName,
    campaignOptions,
  });
}

async function sendGameVoterCampaign({
  campaignKey,
  templateName,
  limit = 500,
  campaignOptions = {},
}) {
  const contacts = await GameVoterContact.find({
    validPhone: true,
    optOut: false,
    phoneE164: { $exists: true, $ne: null },
  })
    .sort({ lastVotedAt: -1 })
    .limit(Number(limit));

  return sendToContacts({
    contacts,
    campaignKey,
    audienceType: "game_voter",
    sourceCollection: "gamevotercontacts",
    templateName,
    campaignOptions,
  });
}

async function sendAbandonedCartCampaign({
  campaignKey,
  templateName,
  limit = 500,
  campaignOptions = {},
}) {
  const contacts = await AbandonedCart.aggregate([
    {
      $match: {
        phoneE164: { $exists: true, $ne: null },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $group: {
        _id: "$phoneE164",
        doc: { $first: "$$ROOT" },
      },
    },
    {
      $limit: Number(limit),
    },
    {
      $replaceRoot: {
        newRoot: "$doc",
      },
    },
  ]);

  return sendToContacts({
    contacts,
    campaignKey,
    audienceType: "abandoned_cart",
    sourceCollection: "abandonedcarts",
    templateName,
    campaignOptions,
  });
}

async function sendMultiAudienceCampaign({
  campaignKey,

  convertedCustomerTemplateName,
  gameWinnerTemplateName,
  gameVoterTemplateName,
  abandonedTemplateName,

  convertedCustomerLimit = 500,
  gameWinnerLimit = 500,
  gameVoterLimit = 500,
  abandonedLimit = 500,

  headerMediaUrl,
  campaignImageUrl,

  convertedCustomerHeaderMediaUrl,
  gameWinnerHeaderMediaUrl,
  gameVoterHeaderMediaUrl,
  abandonedHeaderMediaUrl,

  convertedCustomerButtonUrl,
  gameWinnerButtonUrl,
  gameVoterButtonUrl,
  abandonedButtonUrl,

  convertedCustomerSendDynamicButton = false,
  gameWinnerSendDynamicButton = false,
  gameVoterSendDynamicButton = false,
  abandonedSendDynamicButton = false,
}) {
  if (!campaignKey) {
    throw new Error("campaignKey is required.");
  }

  const response = {};

  if (convertedCustomerTemplateName) {
    const results = await sendConvertedCustomerCampaign({
      campaignKey,
      templateName: convertedCustomerTemplateName,
      limit: convertedCustomerLimit,
      campaignOptions: {
        headerMediaUrl,
        campaignImageUrl,
        convertedCustomerHeaderMediaUrl,
        buttonUrl: convertedCustomerButtonUrl,
        sendDynamicButton: convertedCustomerSendDynamicButton,
      },
    });

    response.convertedCustomers = {
      processed: results.length,
      results,
    };
  }

  if (gameWinnerTemplateName) {
    const results = await sendGameWinnerCampaign({
      campaignKey,
      templateName: gameWinnerTemplateName,
      limit: gameWinnerLimit,
      campaignOptions: {
        headerMediaUrl,
        campaignImageUrl,
        gameWinnerHeaderMediaUrl,
        buttonUrl: gameWinnerButtonUrl,
        sendDynamicButton: gameWinnerSendDynamicButton,
      },
    });

    response.gameWinners = {
      processed: results.length,
      results,
    };
  }

  if (gameVoterTemplateName) {
    const results = await sendGameVoterCampaign({
      campaignKey,
      templateName: gameVoterTemplateName,
      limit: gameVoterLimit,
      campaignOptions: {
        headerMediaUrl,
        campaignImageUrl,
        gameVoterHeaderMediaUrl,
        buttonUrl: gameVoterButtonUrl,
        sendDynamicButton: gameVoterSendDynamicButton,
      },
    });

    response.gameVoters = {
      processed: results.length,
      results,
    };
  }

  if (abandonedTemplateName) {
    const results = await sendAbandonedCartCampaign({
      campaignKey,
      templateName: abandonedTemplateName,
      limit: abandonedLimit,
      campaignOptions: {
        headerMediaUrl,
        campaignImageUrl,
        abandonedHeaderMediaUrl,
        buttonUrl: abandonedButtonUrl,
        sendDynamicButton: abandonedSendDynamicButton,
      },
    });

    response.abandonedCarts = {
      processed: results.length,
      results,
    };
  }

  return response;
}

module.exports = {
  sendMultiAudienceCampaign,
  sendConvertedCustomerCampaign,
  sendGameWinnerCampaign,
  sendGameVoterCampaign,
  sendAbandonedCartCampaign,
};