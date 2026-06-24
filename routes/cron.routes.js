const express = require("express");
const { processAbandonedCartsCron } = require("../controllers/cron.controller");

const router = express.Router();

router.get("/process-abandoned-carts", processAbandonedCartsCron);

module.exports = router;
