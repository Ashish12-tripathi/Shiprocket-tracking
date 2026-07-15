require("dotenv").config();

const mongoose = require("mongoose");
const ConvertedCustomer = require("../models/ConvertedCustomer");


function clean(value){
  if(!value) return undefined;
  return String(value).trim() || undefined;
}


function extractUtm(order){

  let result={};


  if(Array.isArray(order?.note_attributes)){

    for(const item of order.note_attributes){

      const key =
        String(item.name || "")
        .toLowerCase();


      if(key==="utm_source")
        result.utmSource=clean(item.value);


      if(key==="utm_medium")
        result.utmMedium=clean(item.value);


      if(key==="utm_campaign")
        result.utmCampaign=clean(item.value);


      if(key==="utm_content")
        result.utmContent=clean(item.value);
    }
  }


  if(order?.landing_site){

    const url=new URL(
      order.landing_site.startsWith("http")
      ? order.landing_site
      : "https://x.com"+order.landing_site
    );


    result.utmSource =
      result.utmSource ||
      clean(url.searchParams.get("utm_source"));


    result.utmMedium =
      result.utmMedium ||
      clean(url.searchParams.get("utm_medium"));


    result.utmCampaign =
      result.utmCampaign ||
      clean(url.searchParams.get("utm_campaign"));


    result.utmContent =
      result.utmContent ||
      clean(url.searchParams.get("utm_content"));
  }


  return result;
}



async function run(){

const mongoUri =
process.env.MONGODB_URI ||
process.env.MONGO_URI;


await mongoose.connect(mongoUri);


const customers =
ConvertedCustomer.find({
 rawOrder:{
  $exists:true
 }
}).cursor();


let updated=0;


for await(const customer of customers){


 const utm =
 extractUtm(customer.rawOrder);


 if(Object.keys(utm).length){


  await ConvertedCustomer.updateOne(
   {
    _id:customer._id
   },
   {
    $set:utm
   }
  );


  updated++;

 }

}


console.log({
 updated
});


await mongoose.disconnect();

}


run();