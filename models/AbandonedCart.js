const mongoose = require("mongoose");

const abandonedCartSchema = new mongoose.Schema(
  {
    source: { type: String, default: "razorpay_magic_checkout" },

    razorpayToken: String,
    cartToken: String,
    shopId: String,
    platform: String,

    checkoutUrl: { type: String, required: true },

    customerName: String,
    email: String,

    phoneE164: { type: String, required: true },
    countryCode: { type: String, default: "+91" },
    phoneNumber: { type: String, required: true },

    productName: String,
    cartValue: Number,
    currency: String,

    utmSource: String,
    utmMedium: String,
    utmCampaign: String,

    status: {
      type: String,
      enum: ["pending", "message_1_sent", "message_2_sent", "stopped", "converted"],
      default: "pending",
    },

    converted: { type: Boolean, default: false },
    convertedAt: Date,
    shopifyOrderId: String,
    shopifyOrderName: String,

    message1Sent: { type: Boolean, default: false },
    message1SentAt: Date,

    message2Sent: { type: Boolean, default: false },
    message2SentAt: Date,

    message3Sent: { type: Boolean, default: false },
    message3SentAt: Date,

    lastError: String,
    rawPayload: Object,
  },
  { timestamps: true }
);

abandonedCartSchema.index({ phoneE164: 1, cartToken: 1 });
abandonedCartSchema.index({ checkoutUrl: 1 });
abandonedCartSchema.index({ converted: 1, status: 1, createdAt: 1 });

module.exports = mongoose.model("AbandonedCart", abandonedCartSchema);
