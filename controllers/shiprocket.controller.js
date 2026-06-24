const { getDeliveryEstimate } = require("../services/shiprocket.service");

async function deliveryEstimateController(req, res) {
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

    const shiprocketData = await getDeliveryEstimate({
      deliveryPostcode,
      weight,
      cod,
    });

    const couriers = shiprocketData?.data?.available_courier_companies || [];

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
    console.error("Shiprocket EDD error:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to check delivery right now. Please try again.",
    });
  }
}

module.exports = {
  deliveryEstimateController,
};
