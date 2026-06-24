const express = require("express");
const {
  receiveRazorpayAbandonedCart,
  receiveShopifyOrderCreate,
} = require("../controllers/abandonedCart.controller");

const router = express.Router();

router.post("/razorpay/abandoned-cart", receiveRazorpayAbandonedCart);
router.post("/shopify/orders-create", receiveShopifyOrderCreate);

module.exports = router;
