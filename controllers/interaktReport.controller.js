const InteraktOrderedCustomerConversion = require("../models/InteraktOrderedCustomerConversion");
const InteraktAbandonedCartConversion = require("../models/InteraktAbandonedCartConversion");

async function getInteraktCampaignReport(req, res) {
  try {
    const orderedCustomers = await InteraktOrderedCustomerConversion.aggregate([
      {
        $group: {
          _id: "$campaignKey",
          customers: { $sum: 1 },
          totalOrders: { $sum: "$totalOrders" },
          totalRevenue: { $sum: "$totalSpent" },
          firstConversion: { $min: "$firstConvertedAt" },
          lastConversion: { $max: "$lastConvertedAt" },
        },
      },
    ]);

    const abandonedCartCustomers =
      await InteraktAbandonedCartConversion.aggregate([
        {
          $group: {
            _id: "$campaignKey",
            customers: { $sum: 1 },
            totalOrders: { $sum: "$totalOrders" },
            totalRevenue: { $sum: "$totalSpent" },
            firstConversion: { $min: "$firstConvertedAt" },
            lastConversion: { $max: "$lastConvertedAt" },
          },
        },
      ]);

    return res.json({
      success: true,
      orderedCustomerCampaign: orderedCustomers[0] || {
        customers: 0,
        totalOrders: 0,
        totalRevenue: 0,
      },
      abandonedCartCampaign: abandonedCartCustomers[0] || {
        customers: 0,
        totalOrders: 0,
        totalRevenue: 0,
      },
    });
  } catch (error) {
    console.error("Interakt campaign report error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate Interakt campaign report",
      error: error.message,
    });
  }
}

module.exports = {
  getInteraktCampaignReport,
};