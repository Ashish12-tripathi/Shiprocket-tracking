require("dotenv").config();

console.log("Game audience cron file loaded");

const cron = require("node-cron");
const connectDB = require("./config/db");
const { processDueAbandonedCarts } = require("./services/cron.service");
const { importGameAudience } = require("./scripts/import-game-audience-from-db");

let isRunning = false;
let isImportRunning = false;

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

async function runGameAudienceImportJob() {
  if (isImportRunning) {
    console.log("Previous game audience import is still running. Skipping this run.");
    return;
  }

  if (process.env.AUTO_IMPORT_GAME_AUDIENCE === "false") {
    console.log("Game audience import disabled via AUTO_IMPORT_GAME_AUDIENCE=false");
    return;
  }

  isImportRunning = true;

  try {
    console.log("Game audience import cron started:", new Date().toISOString());
    await importGameAudience();
    console.log("Game audience import cron completed:", new Date().toISOString());
  } catch (error) {
    console.error("Game audience import cron failed:", {
      message: error.message,
      stack: error.stack,
      time: new Date().toISOString(),
    });
  } finally {
    isImportRunning = false;
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
      async () => {
        await runCronJob();
      },
      {
        timezone: process.env.CRON_TIMEZONE || "Asia/Kolkata",
        scheduled: true,
      }
    );

    cron.schedule(
      "*/1 * * * *",
      async () => {
        await runGameAudienceImportJob();
      },
      {
        timezone: process.env.CRON_TIMEZONE || "Asia/Kolkata",
        scheduled: true,
      }
    );

    console.log("Game audience import cron scheduled every 1 minute.");
    console.log("Game audience cron schedule registered");

    await runCronJob();
    await runGameAudienceImportJob();
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