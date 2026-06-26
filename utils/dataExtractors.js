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

/*
  Picks the best cart item for abandoned cart messaging.

  Priority:
  1. First line item that has an image URL
  2. First line item in the cart
  3. null fallback

  This is important because Razorpay can send multiple line_items,
  and sometimes line_items[0] may not contain the product image,
  while line_items[1] or another item does.
*/
function getFirstProductWithImage(payload) {
  const items = Array.isArray(payload.line_items) ? payload.line_items : [];

  return (
    items.find(
      (item) =>
        item?.image_url ||
        item?.image ||
        item?.product_image ||
        item?.product_image_url ||
        item?.featured_image ||
        item?.thumbnail
    ) ||
    items[0] ||
    null
  );
}

function getFirstProductName(payload) {
  const item = getFirstProductWithImage(payload);

  return item?.name || item?.title || "your Omichef cookware";
}

function getFirstProductImageUrl(payload) {
  const item = getFirstProductWithImage(payload);

  return (
    item?.image_url ||
    item?.image ||
    item?.product_image ||
    item?.product_image_url ||
    item?.featured_image ||
    item?.thumbnail ||
    null
  );
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
  getFirstProductWithImage,
  getFirstProductName,
  getFirstProductImageUrl,
  getCartValue,
  getShopifyOrderPhone,
  getShopifyOrderEmail,
  minutesAgo,
};