require("dotenv").config();

const mongoose = require("mongoose");
const ConvertedCustomer = require("../models/ConvertedCustomer");

const {
  syncConvertedCustomerToInteraktCampaignCollections,
} = require("../services/interaktCampaignSync.service");


async function run(){

  const mongoUri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI;


  await mongoose.connect(mongoUri);

  console.log("Mongo connected");


  const customers =
    ConvertedCustomer.find({
      utmSource:"whatsapp",
      utmMedium:{
        $in:[
          "interakt",
          "interakt_campaign"
        ]
      },

      utmCampaign:{
        $in:[
          "monsoon_ordered_customers2_tilljune2026",
          "monsoon_ordered_customers_tilljune2026_ip"
        ]
      }

    }).cursor();



  let count=0;


  for await(const customer of customers){

    const result =
      await syncConvertedCustomerToInteraktCampaignCollections(
        customer
      );


    console.log(
      customer.phoneE164,
      result
    );


    count++;

  }


  console.log(
    "Completed:",
    count
  );


  await mongoose.disconnect();

}


run()
.catch(err=>{
 console.error(err);
 process.exit(1);
});