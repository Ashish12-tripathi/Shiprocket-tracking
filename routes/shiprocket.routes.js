const express = require("express");
const { deliveryEstimateController } = require("../controllers/shiprocket.controller");

const router = express.Router();

router.get("/delivery-estimate", deliveryEstimateController);

module.exports = router;
