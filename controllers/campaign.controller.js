const { requireSecret } = require("../utils/security");
const { sendMultiAudienceCampaign } = require("../services/campaign.service");

async function sendCampaignController(req, res) {
  try {
    const isAllowed = requireSecret(req, process.env.CAMPAIGN_SECRET, "CAMPAIGN");

    if (!isAllowed) {
      return res.status(401).json({
        ok: false,
        message: "Invalid campaign secret",
      });
    }

    const result = await sendMultiAudienceCampaign(req.body || {});

    return res.json({
      ok: true,
      campaignKey: req.body?.campaignKey,
      ...result,
    });
  } catch (error) {
    console.error("Campaign error:", error);

    return res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
}

module.exports = {
  sendCampaignController,
};