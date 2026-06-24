OMiCHEF MERGED BACKEND SETUP

Routes:
GET  /health
GET  /api/delivery-estimate?pincode=110001&weight=0.5&cod=0
POST /razorpay/abandoned-cart?secret=YOUR_RZP_WEBHOOK_SECRET
POST /shopify/orders-create?secret=YOUR_SHOPIFY_WEBHOOK_SECRET
GET  /cron/process-abandoned-carts?secret=YOUR_CRON_SECRET

Install:
npm install

Run:
npm start

Deploy:
Build command: npm install
Start command: npm start

After deploy:
1. Test: https://YOUR-BACKEND/health
2. Razorpay webhook: https://YOUR-BACKEND/razorpay/abandoned-cart?secret=YOUR_RZP_WEBHOOK_SECRET
3. Shopify order webhook: https://YOUR-BACKEND/shopify/orders-create?secret=YOUR_SHOPIFY_WEBHOOK_SECRET
4. Cron every 5 min:
curl -fsS "https://YOUR-BACKEND/cron/process-abandoned-carts?secret=YOUR_CRON_SECRET"

Keep DRY_RUN=true while testing.
Set DRY_RUN=false only after live test is confirmed.


CRON SEPARATION NOTE:
Cron is now separated into:
- routes/cron.routes.js
- controllers/cron.controller.js
- services/cron.service.js

Cron URL remains:
GET /cron/process-abandoned-carts?secret=YOUR_CRON_SECRET
