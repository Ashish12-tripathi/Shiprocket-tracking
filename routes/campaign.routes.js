const express = require("express");
const { sendCampaignController } = require("../controllers/campaign.controller");

const router = express.Router();

router.post("/send", sendCampaignController);

module.exports = router;