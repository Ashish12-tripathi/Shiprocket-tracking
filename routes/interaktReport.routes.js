const express = require("express");

const {
  getInteraktCampaignReport,
} = require("../controllers/interaktReport.controller");

const router = express.Router();

router.get("/campaign-report", getInteraktCampaignReport);

module.exports = router;