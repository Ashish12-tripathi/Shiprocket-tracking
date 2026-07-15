require("dotenv").config();

const mongoose = require("mongoose");
const ConvertedCustomer = require("../models/ConvertedCustomer");

const {
  syncConvertedCustomerToInteraktCampaignCollections,
} = require("../services/interaktCampaignSync.service");


async function run() {

  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI;


  await mongoose.connect(mongoUri);

  console.log("Mongo connected");


  const testCustomer = await ConvertedCustomer.create({

    customerKey:
      "test_interakt_abandoned_conversion_001",

    phoneE164:
      "+919999999999",

    phoneNumber:
      "9999999999",

    countryCode:
      "+91",

    email:
      "test_interakt_abandoned@gmail.com",

    customerName:
      "Interakt Test Customer",


    totalOrders:1,

    totalSpent:1499,


    lastConvertedAt:
      new Date(),


    lastOrderName:
      "#TEST-ORDER-001",


    utmSource:
      "whatsapp",

    utmMedium:
      "interakt_campaign",

    utmCampaign:
      "monsoon_abandoned_carts_tillnow2_2026",

    utmContent:
      "monsoon_abandoned_carts_tillnow2_2026",


    campaignAttribution:{

      recentCampaignKeys:[
        "monsoon_abandoned_carts_tillnow2_2026"
      ],

      recentTemplates:[
        "monsoon_abandoned_carts_tillnow2_2026"
      ],

      recentAudienceTypes:[
        "abandoned_cart"
      ]

    }

  });


  console.log(
    "Created test customer:",
    testCustomer.customerKey
  );


  const result =
    await syncConvertedCustomerToInteraktCampaignCollections(
      testCustomer
    );


  console.log(
    "SYNC RESULT:",
    result
  );


  await mongoose.disconnect();

}


run().catch(err=>{

 console.error(err);

 process.exit(1);

});