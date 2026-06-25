const express = require("express");
const {
  receiveRazorpayAbandonedCart,
  receiveShopifyOrderCreate,
} = require("../controllers/abandonedCart.controller");

const router = express.Router();

/* Clean Razorpay URL validation route */
router.get("/rzp-abandoned-cart/:secret", (req, res) => {
  if (req.params.secret !== process.env.RZP_WEBHOOK_SECRET) {
    return res.status(401).send("Invalid webhook secret");
  }

  return res.status(200).send("Razorpay abandoned cart webhook endpoint is active.");
});

/* Clean Razorpay webhook POST route */
router.post("/rzp-abandoned-cart/:secret", receiveRazorpayAbandonedCart);

/* Old routes kept for backward compatibility */
router.post("/razorpay/abandoned-cart", receiveRazorpayAbandonedCart);
router.post("/razorpay/abandoned-cart/:secret", receiveRazorpayAbandonedCart);

router.post("/shopify/orders-create", receiveShopifyOrderCreate);
router.post("/shopify/orders-create/:secret", receiveShopifyOrderCreate);

module.exports = router;