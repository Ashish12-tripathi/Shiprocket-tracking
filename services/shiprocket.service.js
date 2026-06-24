const axios = require("axios");

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

async function getDeliveryEstimate({ deliveryPostcode, weight, cod }) {
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
        cod,
        weight,
      },
    }
  );

  return response.data;
}

module.exports = {
  getDeliveryEstimate,
};