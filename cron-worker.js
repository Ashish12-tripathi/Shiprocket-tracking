require("dotenv").config();

const cron = require("node-cron");
const connectDB = require("./config/db");
const { processDueAbandonedCarts } = require("./services/cron.service");

let isRunning = false;

async function runCronJob() {
  if (isRunning) {
    console.log("Previous abandoned cart cron is still running. Skipping this run.");
    return;
  }

  isRunning = true;

  try {
    console.log("Abandoned cart cron started:", new Date().toISOString());

    const result = await processDueAbandonedCarts();

    console.log("Abandoned cart cron completed:", {
      processed: result.processed,
      results: result.results,
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Abandoned cart cron failed:", {
      message: error.message,
      stack: error.stack,
      time: new Date().toISOString(),
    });
  } finally {
    isRunning = false;
  }
}

async function startCronWorker() {
  try {
    await connectDB();

    const intervalMinutes = Number(process.env.CRON_INTERVAL_MINUTES || 10);

    if (!intervalMinutes || intervalMinutes < 1 || intervalMinutes > 59) {
      throw new Error("Invalid CRON_INTERVAL_MINUTES. Use a number between 1 and 59.");
    }

    console.log(`Abandoned cart cron worker started. Running every ${intervalMinutes} minutes.`);

    cron.schedule(
      `*/${intervalMinutes} * * * *`,
      runCronJob,
      {
        timezone: process.env.CRON_TIMEZONE || "Asia/Kolkata",
      }
    );
  } catch (error) {
    console.error("Cron worker startup failed:", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  console.log("Cron worker stopped by SIGINT.");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Cron worker stopped by SIGTERM.");
  process.exit(0);
});

startCronWorker();