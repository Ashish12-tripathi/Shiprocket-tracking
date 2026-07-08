const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const shiprocketRoutes = require("./routes/shiprocket.routes");
const abandonedCartRoutes = require("./routes/abandonedCart.routes");
const cronRoutes = require("./routes/cron.routes");
const campaignRoutes = require("./routes/campaign.routes");

const app = express();

app.use(express.json({ limit: "5mb" }));

const allowedOrigins = [
  process.env.SHOPIFY_STORE_DOMAIN,
  "https://www.omichef.com",
  "https://omichef.com",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/$/, "");

      if (allowedOrigins.includes(origin) || allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-omichef-secret"],
  })
);

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "Omichef Shiprocket EDD + Razorpay abandoned cart automation",
    time: new Date().toISOString(),
  });
});

app.use("/api", shiprocketRoutes);
app.use("/", abandonedCartRoutes);
app.use("/cron", cronRoutes);
app.use("/campaign", campaignRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

async function startServer() {
  await connectDB();

  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    console.log(`Omichef backend running on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error("Startup error:", error);
  process.exit(1);
});