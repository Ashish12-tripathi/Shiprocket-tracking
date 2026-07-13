require("dotenv").config();

const mongoose = require("mongoose");
const ConvertedCustomer = require("../models/ConvertedCustomer");

const {
  syncConvertedCustomerToAbandonedMessageAttributedCollection,
} = require("../services/abandonedMessageAttributionSync.service");

async function run() {
  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.DATABASE_URL ||
    process.env.DB_URI ||
    process.env.MONGO_URL;

  if (!mongoUri) {
    throw new Error("Mongo connection string missing. Add MONGODB_URI in .env");
  }

  await mongoose.connect(mongoUri);
  console.log("Mongo connected");

  const cursor = ConvertedCustomer.find({
    "abandonedMessageAttribution.lastMessageNumberBeforeConversion": {
      $gt: 0,
    },
  }).cursor();

  let scanned = 0;
  let matched = 0;

  for await (const customer of cursor) {
    scanned += 1;

    const result =
      await syncConvertedCustomerToAbandonedMessageAttributedCollection(
        customer
      );

    if (result.matched) matched += 1;

    if (scanned % 500 === 0) {
      console.log({
        scanned,
        matched,
      });
    }
  }

  console.log("Backfill completed:", {
    scanned,
    matched,
  });

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Backfill failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});