require("dotenv").config();

const mongoose = require("mongoose");
const GameWinnerContact = require("../models/GameWinnerContact");
const GameVoterContact = require("../models/GameVoterContact");

function normalizeIndianPhone(rawPhone) {
  if (!rawPhone) return null;

  let digits = String(rawPhone).replace(/\D/g, "");

  if (!digits) return null;

  if (digits.startsWith("91") && digits.length === 12) {
    digits = digits.slice(2);
  }

  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return {
      countryCode: "+91",
      phoneNumber: digits,
      phoneE164: `+91${digits}`,
    };
  }

  return null;
}

function makeContactKey(rawContact, normalized) {
  if (normalized?.phoneE164) {
    return `phone:${normalized.phoneE164}`;
  }

  return `raw:${String(rawContact || "").replace(/\s+/g, "").toLowerCase()}`;
}

function toSafeString(value) {
  if (!value) return "";

  if (typeof value === "object" && value.$oid) {
    return String(value.$oid);
  }

  return String(value);
}

function toSafeDate(value) {
  if (!value) return null;

  if (value instanceof Date) return value;

  if (typeof value === "object" && value.$date) {
    return new Date(value.$date);
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getWinnerContact(doc) {
  if (doc.winnerType === "team") {
    return doc.captainContact || doc.playerContact || "";
  }

  return doc.playerContact || doc.captainContact || "";
}

function getWinnerName(doc) {
  if (doc.winnerType === "team") {
    return doc.captainName || doc.winnerName || "Winner";
  }

  return doc.playerName || doc.winnerName || "Winner";
}

async function importWinnerContacts({ winnerDocs }) {
  let extracted = 0;
  let valid = 0;
  let invalid = 0;

  for (const doc of winnerDocs) {
    const rawContact = getWinnerContact(doc);

    if (!rawContact) continue;

    const normalized = normalizeIndianPhone(rawContact);
    const contactKey = makeContactKey(rawContact, normalized);

    const campaignId = doc.campaignId || "unknown_game_campaign";
    const challengeId = toSafeString(doc.challengeId);
    const publicChallengeId = doc.publicChallengeId || "";
    const name = getWinnerName(doc);

    const audienceTags = [
      "game_audience",
      "game_winner",
      `game_${campaignId}`,
      doc.winnerType ? `winner_type_${doc.winnerType}` : null,
    ].filter(Boolean);

    const gameRecord = {
      campaignId,
      challengeId,
      publicChallengeId,
      winnerType: doc.winnerType || "",
      winnerName: doc.winnerName || "",
      name,
      dishName: doc.dishName || "",
      totalVotes: Number(doc.totalVotes || 0),
      imageUrl: doc.imageUrl || "",
      declaredAt: toSafeDate(doc.declaredAt),
    };

    const update = {
      $set: {
        contactKey,
        rawContact: String(rawContact),
        name,
        source: "omichef_game_winner",
        audienceType: "game_winner",
        winnerType: doc.winnerType || "",
        winnerName: doc.winnerName || "",
        dishName: doc.dishName || "",
        totalVotes: Number(doc.totalVotes || 0),
        imageUrl: doc.imageUrl || "",
        declaredAt: toSafeDate(doc.declaredAt),
        lastImportedAt: new Date(),
        rawWinner: doc,
      },

      $setOnInsert: {
        optOut: false,
      },

      $addToSet: {
        audienceTags: { $each: audienceTags },
        gameCampaignIds: campaignId,
        challengeIds: challengeId,
        publicChallengeIds: publicChallengeId,
        gameRecords: gameRecord,
      },
    };

    if (normalized) {
      update.$set.phoneE164 = normalized.phoneE164;
      update.$set.phoneNumber = normalized.phoneNumber;
      update.$set.countryCode = normalized.countryCode;
      update.$set.validPhone = true;
      valid += 1;
    } else {
      update.$set.validPhone = false;
      invalid += 1;
    }

    await GameWinnerContact.updateOne({ contactKey }, update, { upsert: true });

    extracted += 1;
  }

  return { extracted, valid, invalid };
}

async function importVoterContacts({ voterDocs, winnerByPublicChallengeId }) {
  let extracted = 0;
  let valid = 0;
  let invalid = 0;

  for (const vote of voterDocs) {
    const rawContact = vote.voterContact;

    if (!rawContact) continue;

    const normalized = normalizeIndianPhone(rawContact);
    const contactKey = makeContactKey(rawContact, normalized);

    const relatedWinner = winnerByPublicChallengeId.get(String(vote.challengeId || ""));

    const campaignId =
      relatedWinner?.campaignId ||
      vote.campaignId ||
      "unknown_game_campaign";

    const challengeId = String(vote.challengeId || "");
    const name = vote.voterName || "Voter";

    const audienceTags = [
      "game_audience",
      "game_voter",
      `game_${campaignId}`,
      vote.votedForType ? `voted_for_${vote.votedForType}` : null,
    ].filter(Boolean);

    const gameRecord = {
      campaignId,
      challengeId,
      votedForId: vote.votedForId || "",
      votedForType: vote.votedForType || "",
      mode: vote.mode || "",
      votedAt: toSafeDate(vote.createdAt),
      relatedWinnerId: relatedWinner?._id ? toSafeString(relatedWinner._id) : "",
      relatedDishName: relatedWinner?.dishName || "",
      relatedWinnerName: relatedWinner?.winnerName || "",
    };

    const update = {
      $set: {
        contactKey,
        rawContact: String(rawContact),
        name,
        source: "omichef_game_voter",
        audienceType: "game_voter",
        lastVotedAt: toSafeDate(vote.createdAt),
        lastImportedAt: new Date(),
        rawVote: vote,
      },

      $setOnInsert: {
        optOut: false,
      },

      $addToSet: {
        audienceTags: { $each: audienceTags },
        gameCampaignIds: campaignId,
        challengeIds: challengeId,
        votedForIds: vote.votedForId || "",
        votedForTypes: vote.votedForType || "",
        gameRecords: gameRecord,
      },
    };

    if (normalized) {
      update.$set.phoneE164 = normalized.phoneE164;
      update.$set.phoneNumber = normalized.phoneNumber;
      update.$set.countryCode = normalized.countryCode;
      update.$set.validPhone = true;
      valid += 1;
    } else {
      update.$set.validPhone = false;
      invalid += 1;
    }

    await GameVoterContact.updateOne({ contactKey }, update, { upsert: true });

    extracted += 1;
  }

  return { extracted, valid, invalid };
}

async function main() {
  const {
    MONGODB_URI,
    GAME_SOURCE_MONGODB_URI,
    GAME_WINNERS_SOURCE_COLLECTION,
    GAME_VOTERS_SOURCE_COLLECTION,
  } = process.env;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI missing.");
  }

  if (!GAME_SOURCE_MONGODB_URI) {
    throw new Error("GAME_SOURCE_MONGODB_URI missing.");
  }

  if (!GAME_WINNERS_SOURCE_COLLECTION) {
    throw new Error("GAME_WINNERS_SOURCE_COLLECTION missing.");
  }

  if (!GAME_VOTERS_SOURCE_COLLECTION) {
    throw new Error("GAME_VOTERS_SOURCE_COLLECTION missing.");
  }

  await mongoose.connect(MONGODB_URI);

  const sourceConnection = await mongoose
    .createConnection(GAME_SOURCE_MONGODB_URI)
    .asPromise();

  const winnersCollection = sourceConnection.collection(GAME_WINNERS_SOURCE_COLLECTION);
  const votersCollection = sourceConnection.collection(GAME_VOTERS_SOURCE_COLLECTION);

  const winnerDocs = await winnersCollection.find({}).toArray();
  const voterDocs = await votersCollection.find({}).toArray();

  const winnerByPublicChallengeId = new Map();

  for (const winner of winnerDocs) {
    if (winner.publicChallengeId) {
      winnerByPublicChallengeId.set(String(winner.publicChallengeId), winner);
    }
  }

  const winnerImport = await importWinnerContacts({ winnerDocs });

  const voterImport = await importVoterContacts({
    voterDocs,
    winnerByPublicChallengeId,
  });

  console.log("Game audience import completed:", {
    winnersSourceCollection: GAME_WINNERS_SOURCE_COLLECTION,
    votersSourceCollection: GAME_VOTERS_SOURCE_COLLECTION,
    winnerDocuments: winnerDocs.length,
    voterDocuments: voterDocs.length,
    winnerContacts: winnerImport,
    voterContacts: voterImport,
    targetWinnerCollection: "gamewinnercontacts",
    targetVoterCollection: "gamevotercontacts",
  });

  await sourceConnection.close();
  await mongoose.connection.close();
}

main().catch(async (error) => {
  console.error("Game audience import failed:", error);

  try {
    await mongoose.connection.close();
  } catch (_) {}

  process.exit(1);
});