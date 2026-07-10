function parseUtmFromUrl(urlValue) {
  if (!urlValue || typeof urlValue !== "string") {
    return {};
  }

  try {
    const fakeBase = urlValue.startsWith("http")
      ? urlValue
      : `https://dummy.com${urlValue.startsWith("/") ? "" : "/"}${urlValue}`;

    const url = new URL(fakeBase);

    return {
      utmId: url.searchParams.get("utm_id") || undefined,
      utmSource: url.searchParams.get("utm_source") || undefined,
      utmMedium: url.searchParams.get("utm_medium") || undefined,
      utmCampaign: url.searchParams.get("utm_campaign") || undefined,
      utmTerm: url.searchParams.get("utm_term") || undefined,
      utmContent: url.searchParams.get("utm_content") || undefined,
    };
  } catch (error) {
    return {};
  }
}

function parseUtmFromNoteAttributes(noteAttributes) {
  if (!Array.isArray(noteAttributes)) {
    return {};
  }

  const result = {};

  for (const item of noteAttributes) {
    const key = String(item.name || item.key || "").trim();
    const value = item.value;

    if (key === "utm_id") result.utmId = value;
    if (key === "utm_source") result.utmSource = value;
    if (key === "utm_medium") result.utmMedium = value;
    if (key === "utm_campaign") result.utmCampaign = value;
    if (key === "utm_term") result.utmTerm = value;
    if (key === "utm_content") result.utmContent = value;
  }

  return result;
}

function cleanUtmValue(value) {
  if (!value) return undefined;
  return String(value).trim();
}

function extractUtmFromShopifyOrder(order) {
  const fromLandingSite = parseUtmFromUrl(order?.landing_site);
  const fromReferringSite = parseUtmFromUrl(order?.referring_site);
  const fromNoteAttributes = parseUtmFromNoteAttributes(order?.note_attributes);

  const merged = {
    utmId:
      fromNoteAttributes.utmId ||
      fromLandingSite.utmId ||
      fromReferringSite.utmId,

    utmSource:
      fromNoteAttributes.utmSource ||
      fromLandingSite.utmSource ||
      fromReferringSite.utmSource,

    utmMedium:
      fromNoteAttributes.utmMedium ||
      fromLandingSite.utmMedium ||
      fromReferringSite.utmMedium,

    utmCampaign:
      fromNoteAttributes.utmCampaign ||
      fromLandingSite.utmCampaign ||
      fromReferringSite.utmCampaign,

    utmTerm:
      fromNoteAttributes.utmTerm ||
      fromLandingSite.utmTerm ||
      fromReferringSite.utmTerm,

    utmContent:
      fromNoteAttributes.utmContent ||
      fromLandingSite.utmContent ||
      fromReferringSite.utmContent,
  };

  return {
    utmId: cleanUtmValue(merged.utmId),
    utmSource: cleanUtmValue(merged.utmSource),
    utmMedium: cleanUtmValue(merged.utmMedium),
    utmCampaign: cleanUtmValue(merged.utmCampaign),
    utmTerm: cleanUtmValue(merged.utmTerm),
    utmContent: cleanUtmValue(merged.utmContent),
  };
}

module.exports = {
  parseUtmFromUrl,
  extractUtmFromShopifyOrder,
};