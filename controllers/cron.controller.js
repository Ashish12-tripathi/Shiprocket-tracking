const { requireSecret } = require("../utils/security");
const { processDueAbandonedCarts } = require("../services/cron.service");

async function processAbandonedCartsCron(req, res) {
  try {
    if (!requireSecret(req, process.env.CRON_SECRET, "Cron")) {
      return res.status(401).json({
        ok: false,
        error: "Invalid cron secret",
      });
    }

    const results = await processDueAbandonedCarts();

    return res.json({
      ok: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Cron error:", error);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
}

module.exports = {
  processAbandonedCartsCron,
};
