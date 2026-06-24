function getRazorpayPhone(payload) {
  return (
    payload.phone ||
    payload?.customer?.phone ||
    payload?.customer?.Shipping_address?.Phone ||
    payload?.customer?.shipping_address?.phone ||
    null
  );
}

function getRazorpayName(payload) {
  const first =
    payload?.customer?.first_name ||
    payload?.customer?.Shipping_address?.First_name ||
    payload?.customer?.shipping_address?.first_name ||
    "";

  const last =
    payload?.customer?.last_name ||
    payload?.customer?.Shipping_address?.Last_name ||
    payload?.customer?.shipping_address?.last_name ||
    "";

  const full = `${first} ${last}`.trim();

  return full || payload?.customer?.Shipping_address?.Name || "there";
}

function getRazorpayEmail(payload) {
  const email = payload.email || payload?.customer?.email || null;
  return email ? String(email).toLowerCase() : null;
}

function getFirstProductName(payload) {
  const item = Array.isArray(payload.line_items) ? payload.line_items[0] : null;
  return item?.name || item?.title || "your Omichef cookware";
}

function getCartValue(payload) {
  const value = payload.line_items_total || payload.total || payload.amount;
  if (!value) return null;

  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
}

function getShopifyOrderPhone(order) {
  return (
    order.phone ||
    order?.customer?.phone ||
    order?.billing_address?.phone ||
    order?.shipping_address?.phone ||
    null
  );
}

function getShopifyOrderEmail(order) {
  const email = order.email || order.contact_email || order?.customer?.email || null;
  return email ? String(email).toLowerCase() : null;
}

function minutesAgo(date, minutes) {
  return Date.now() - new Date(date).getTime() >= Number(minutes) * 60 * 1000;
}

module.exports = {
  getRazorpayPhone,
  getRazorpayName,
  getRazorpayEmail,
  getFirstProductName,
  getCartValue,
  getShopifyOrderPhone,
  getShopifyOrderEmail,
  minutesAgo,
};
