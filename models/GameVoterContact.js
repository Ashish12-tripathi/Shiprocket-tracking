const mongoose = require("mongoose");

const gameVoterContactSchema = new mongoose.Schema(
  {
    contactKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    phoneE164: {
      type: String,
      index: true,
    },

    phoneNumber: String,

    countryCode: {
      type: String,
      default: "+91",
    },

    rawContact: String,

    validPhone: {
      type: Boolean,
      default: false,
    },

    name: String,

    source: {
      type: String,
      default: "omichef_game_voter",
    },

    audienceType: {
      type: String,
      default: "game_voter",
    },

    audienceTags: {
      type: [String],
      default: [],
    },

    gameCampaignIds: {
      type: [String],
      default: [],
    },

    challengeIds: {
      type: [String],
      default: [],
    },

    votedForIds: {
      type: [String],
      default: [],
    },

    votedForTypes: {
      type: [String],
      default: [],
    },

    lastVotedAt: Date,

    gameRecords: {
      type: [Object],
      default: [],
    },

    optOut: {
      type: Boolean,
      default: false,
    },

    lastImportedAt: Date,

    rawVote: Object,
  },
  {
    timestamps: true,
  }
);

gameVoterContactSchema.index({ validPhone: 1, optOut: 1 });
gameVoterContactSchema.index({ audienceTags: 1 });
gameVoterContactSchema.index({ gameCampaignIds: 1 });
gameVoterContactSchema.index({ challengeIds: 1 });

module.exports = mongoose.model("GameVoterContact", gameVoterContactSchema);