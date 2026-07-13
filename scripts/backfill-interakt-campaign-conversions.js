require("dotenv").config();

const mongoose = require("mongoose");
const ConvertedCustomer = require("../models/ConvertedCustomer");

const {
  syncConvertedCustomerToInteraktCampaignCollections,
} = require("../services/interaktCampaignSync.service");

async function backfillInteraktCampaignConversions() {
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

  console.log("MongoDB connected");
  console.log("Backfill started...");

  const query = {
    $or: [
      {
        utmSource: "whatsapp",
        utmMedium: { $in: ["interakt", "interakt_campaign"] },
        utmCampaign: {
          $in: [
            "monsoon_ordered_customers_tilljune2026",
            "monsoon_ordered_customers_tilljune2026_ip",
            "monsoon_ordered_customers",
            "monsoon_abandoned_carts_tillnow_2026",
            "monsoon_abandoned_carts",
          ],
        },
      },
      {
        "campaignAttribution.recentCampaignKeys": {
          $in: [
            "monsoon_ordered_customers_tilljune2026",
            "monsoon_ordered_customers_tilljune2026_ip",
            "monsoon_abandoned_carts_tillnow_2026",
          ],
        },
      },
      {
        "campaignAttribution.recentTemplates": {
          $in: [
            "monsoon_ordered_customers_tilljune2026",
            "monsoon_ordered_customers_tilljune2026_ip",
            "orderplacedcustomertilljune",
            "monsoon_abandoned_carts_tillnow_2026",
            "abandoned_cart_tillnow",
          ],
        },
      },
      {
        "campaignAttribution.recentAudienceTypes": {
          $in: ["converted_customer", "abandoned_cart"],
        },
      },
    ],
  };

  const cursor = ConvertedCustomer.find(query).cursor();

  let scanned = 0;
  let orderedMatched = 0;
  let abandonedMatched = 0;

  for await (const customer of cursor) {
    scanned += 1;

    const result =
      await syncConvertedCustomerToInteraktCampaignCollections(customer);

    if (result.orderedCustomerMatched) orderedMatched += 1;
    if (result.abandonedCartMatched) abandonedMatched += 1;

    if (scanned % 500 === 0) {
      console.log(
        `Scanned: ${scanned}, Ordered matched: ${orderedMatched}, Abandoned matched: ${abandonedMatched}`
      );
    }
  }

  console.log("Backfill completed");
  console.log({
    scanned,
    orderedMatched,
    abandonedMatched,
  });

  await mongoose.disconnect();
}

backfillInteraktCampaignConversions().catch(async (error) => {
  console.error("Backfill failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});