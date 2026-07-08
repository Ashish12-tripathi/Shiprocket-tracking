const AbandonedCart = require("../models/AbandonedCart");
const GameWinnerContact = require("../models/GameWinnerContact");
const GameVoterContact = require("../models/GameVoterContact");
const ConvertedCustomer = require("../models/ConvertedCustomer");
const CampaignLog = require("../models/CampaignLog");
const { sendInteraktCampaignTemplate } = require("./interakt.service");

function getName(contact) {
  return contact.customerName || contact.name || "Customer";
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

async function sendToContacts({
  contacts,
  campaignKey,
  audienceType,
  sourceCollection,
  templateName,
  buildBodyValues,
}) {
  const results = [];

  for (const contact of contacts) {
    try {
      if (!contact.phoneE164) {
        results.push({
          phone: null,
          skipped: true,
          reason: "Missing phoneE164",
          audienceType,
        });
        continue;
      }

      const alreadySent = await hasCampaignAlreadySent(campaignKey, contact.phoneE164);

      if (alreadySent) {
        results.push({
          phone: contact.phoneE164,
          skipped: true,
          reason: "Campaign already sent to this phone",
          audienceType,
        });
        continue;
      }

      const plainContact =
        typeof contact.toObject === "function" ? contact.toObject() : contact;

      const response = await sendInteraktCampaignTemplate(
        {
          ...plainContact,
          campaignKey,
        },
        templateName,
        buildBodyValues(plainContact)
      );

      await saveCampaignLog({
        campaignKey,
        audienceType,
        contact: plainContact,
        templateName,
        status: "sent",
        sourceCollection,
        rawResponse: response,
      });

      results.push({
        phone: plainContact.phoneE164,
        sent: true,
        audienceType,
      });
    } catch (error) {
      const message = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;

      const plainContact =
        typeof contact.toObject === "function" ? contact.toObject() : contact;

      await saveCampaignLog({
        campaignKey,
        audienceType,
        contact: plainContact,
        templateName,
        status: "failed",
        error: message,
        sourceCollection,
      });

      results.push({
        phone: plainContact.phoneE164,
        sent: false,
        audienceType,
        error: message,
      });
    }
  }

  return results;
}

async function sendConvertedCustomerCampaign({ campaignKey, templateName, limit = 500 }) {
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
    buildBodyValues: (contact) => [getName(contact)],
  });
}

async function sendGameWinnerCampaign({ campaignKey, templateName, limit = 500 }) {
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
    buildBodyValues: (contact) => [
      getName(contact),
      contact.dishName || "your dish",
    ],
  });
}

async function sendGameVoterCampaign({ campaignKey, templateName, limit = 500 }) {
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
    buildBodyValues: (contact) => [getName(contact)],
  });
}

async function sendAbandonedCartCampaign({ campaignKey, templateName, limit = 500 }) {
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
    buildBodyValues: (contact) => [
      getName(contact),
      contact.productName || "your Omichef product",
    ],
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
}) {
  if (!campaignKey) {
    throw new Error("campaignKey is required.");
  }

  const response = {};

  /*
    Priority order:
    1. Converted customers
    2. Game winners
    3. Game voters
    4. Abandoned cart users

    campaignlogs prevents duplicate send to same phone for same campaignKey.
  */

  if (convertedCustomerTemplateName) {
    const results = await sendConvertedCustomerCampaign({
      campaignKey,
      templateName: convertedCustomerTemplateName,
      limit: convertedCustomerLimit,
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