const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: [
      process.env.SHOPIFY_STORE_DOMAIN,
      "https://www.omichef.com/"
    ],
    methods: ["GET", "POST"],
  })
);

let cachedToken = null;
let tokenCreatedAt = 0;
const TOKEN_VALIDITY_MS = 9 * 24 * 60 * 60 * 1000;

async function getShiprocketToken() {
  if (cachedToken && Date.now() - tokenCreatedAt < TOKEN_VALIDITY_MS) {
    return cachedToken;
  }

  const response = await axios.post(
    "https://apiv2.shiprocket.in/v1/external/auth/login",
    {
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }
  );

  cachedToken = response.data.token;
  tokenCreatedAt = Date.now();

  return cachedToken;
}

app.get("/api/delivery-estimate", async (req, res) => {
  try {
    const deliveryPostcode = String(req.query.pincode || "").trim();
    const weight = Number(req.query.weight || 0.5);
    const cod = Number(req.query.cod || 0);

    if (!/^[1-9][0-9]{5}$/.test(deliveryPostcode)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 6-digit pincode.",
      });
    }

    const token = await getShiprocketToken();

    const response = await axios.get(
      "https://apiv2.shiprocket.in/v1/external/courier/serviceability/",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          pickup_postcode: process.env.SHIPROCKET_PICKUP_PINCODE,
          delivery_postcode: deliveryPostcode,
          cod: cod,
          weight: weight,
        },
      }
    );

    const couriers =
      response.data?.data?.available_courier_companies || [];

    if (!couriers.length) {
      return res.json({
        success: true,
        serviceable: false,
        message: "Delivery is currently not available for this pincode.",
      });
    }

    const sortedCouriers = couriers
      .filter((courier) => courier.etd)
      .sort((a, b) => {
        const aDays = parseInt(String(a.etd).match(/\d+/)?.[0] || "99", 10);
        const bDays = parseInt(String(b.etd).match(/\d+/)?.[0] || "99", 10);
        return aDays - bDays;
      });

    const bestCourier = sortedCouriers[0] || couriers[0];

    return res.json({
      success: true,
      serviceable: true,
      pincode: deliveryPostcode,
      courier: bestCourier.courier_name,
      etd: bestCourier.etd || "2-6 days",
      rate: bestCourier.rate || null,
      cod_available:
        bestCourier.cod === 1 ||
        bestCourier.cod_charges !== undefined ||
        bestCourier.is_cod === 1,
      message: `Delivery available to ${deliveryPostcode}`,
    });
  } catch (error) {
    console.error(error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to check delivery right now. Please try again.",
    });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Shiprocket EDD backend running on port ${process.env.PORT || 3000}`);
});