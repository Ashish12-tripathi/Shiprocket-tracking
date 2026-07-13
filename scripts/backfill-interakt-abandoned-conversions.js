require("dotenv").config();

const mongoose = require("mongoose");
const ConvertedCustomer = require("../models/ConvertedCustomer");
const {
  syncConvertedCustomerToInteraktCampaignCollections,
} = require("../services/interaktCampaignSync.service");

async function run() {
  const mongoUri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.DATABASE_URL ||
  process.env.DB_URI ||
  process.env.MONGO_URL;

if (!mongoUri) {
  throw new Error(
    "Mongo connection string missing. Add MONGODB_URI or MONGO_URI in .env"
  );
}

await mongoose.connect(mongoUri);

  const query = {
    $or: [
      {
        utmSource: "whatsapp",
        utmMedium: { $in: ["interakt", "interakt_campaign"] },
        utmCampaign: {
          $in: [
            "monsoon_abandoned_carts_tillnow_2026",
            "monsoon_abandoned_carts",
          ],
        },
      },
      {
        "campaignAttribution.recentCampaignKeys":
          "monsoon_abandoned_carts_tillnow_2026",
      },
      {
        "campaignAttribution.recentTemplates": {
          $in: [
            "monsoon_abandoned_carts_tillnow_2026",
            "abandoned_cart_tillnow",
          ],
        },
      },
      {
        "campaignAttribution.recentAudienceTypes": "abandoned_cart",
      },
    ],
  };

  const cursor = ConvertedCustomer.find(query).cursor();

  let scanned = 0;
  let abandonedMatched = 0;
  let orderedMatched = 0;

  for await (const customer of cursor) {
    scanned++;

    const result =
      await syncConvertedCustomerToInteraktCampaignCollections(customer);

    if (result.abandonedCartMatched) abandonedMatched++;
    if (result.orderedCustomerMatched) orderedMatched++;

    if (scanned % 100 === 0) {
      console.log({
        scanned,
        abandonedMatched,
        orderedMatched,
      });
    }
  }

  console.log("Backfill done:", {
    scanned,
    abandonedMatched,
    orderedMatched,
  });

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Backfill failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
