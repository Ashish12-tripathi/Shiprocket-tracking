const mongoose = require("mongoose");

const campaignLogSchema = new mongoose.Schema(
  {
    campaignKey: {
      type: String,
      required: true,
      index: true,
    },

    audienceType: {
      type: String,
      required: true,
      index: true,
    },

    phoneE164: {
      type: String,
      index: true,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
    },

    templateName: String,

    status: {
      type: String,
      enum: ["sent", "failed", "skipped"],
      default: "sent",
    },

    sentAt: Date,

    error: String,

    sourceCollection: String,
    sourceDocumentId: String,

    rawResponse: Object,
  },
  {
    timestamps: true,
  }
);

/*
  Prevent same campaign from being sent twice to the same phone number.
*/
campaignLogSchema.index(
  { campaignKey: 1, phoneE164: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model("CampaignLog", campaignLogSchema);