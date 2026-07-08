const mongoose = require("mongoose");

const gameWinnerContactSchema = new mongoose.Schema(
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
      default: "omichef_game_winner",
    },

    audienceType: {
      type: String,
      default: "game_winner",
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

    publicChallengeIds: {
      type: [String],
      default: [],
    },

    winnerType: String,
    winnerName: String,
    dishName: String,
    totalVotes: Number,
    imageUrl: String,
    declaredAt: Date,

    gameRecords: {
      type: [Object],
      default: [],
    },

    optOut: {
      type: Boolean,
      default: false,
    },

    lastImportedAt: Date,

    rawWinner: Object,
  },
  {
    timestamps: true,
  }
);

gameWinnerContactSchema.index({ validPhone: 1, optOut: 1 });
gameWinnerContactSchema.index({ audienceTags: 1 });
gameWinnerContactSchema.index({ gameCampaignIds: 1 });
gameWinnerContactSchema.index({ publicChallengeIds: 1 });

module.exports = mongoose.model("GameWinnerContact", gameWinnerContactSchema);