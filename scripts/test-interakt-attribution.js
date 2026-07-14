require("dotenv").config();

const mongoose = require("mongoose");

const {
  syncConvertedCustomerToInteraktCampaignCollections,
} = require("../services/interaktCampaignSync.service");


async function run(){

const mongoUri =
process.env.MONGODB_URI ||
process.env.MONGO_URI;


await mongoose.connect(mongoUri);

console.log("Mongo connected");


// TEST 1: Meta Ads customer
const metaCustomer = {

    _id:new mongoose.Types.ObjectId(),

    customerKey:"test-meta-user",

    phoneE164:"+919999999999",

    email:"meta@test.com",

    customerName:"Meta User",

    totalOrders:1,

    totalSpent:1000,


    utmSource:"Meta_Ads",

    utmMedium:"Catalog_Ads",

    utmCampaign:"Catalog Advantage_On_New",


    campaignAttribution:{
        recentCampaignKeys:[
          "monsoon_ordered_customers_tilljune2026_ip"
        ],
        recentTemplates:[
          "monsoon_ordered_customers_tilljune2026_ip"
        ],
        recentAudienceTypes:[
          "converted_customer"
        ]
    }

};


const metaResult =
await syncConvertedCustomerToInteraktCampaignCollections(metaCustomer);


console.log(
"Meta Ads Result:",
metaResult
);



// TEST 2: Interakt customer

const interaktCustomer = {

    _id:new mongoose.Types.ObjectId(),

    customerKey:"test-interakt-user",

    phoneE164:"+918888888888",

    email:"interakt@test.com",

    customerName:"Interakt User",

    totalOrders:1,

    totalSpent:1000,


    utmSource:"whatsapp",

    utmMedium:"interakt_campaign",

    utmCampaign:
    "monsoon_ordered_customers_tilljune2026_ip",

    utmContent:
    "monsoon_ordered_customers_tilljune2026_ip",

};


const interaktResult =
await syncConvertedCustomerToInteraktCampaignCollections(
    interaktCustomer
);


console.log(
"Interakt Result:",
interaktResult
);


await mongoose.disconnect();

}


run().catch(err=>{
console.error(err);
process.exit(1);
});