function normalizeIndianPhone(rawPhone) {
  if (!rawPhone) return null;

  let cleaned = String(rawPhone)
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .replace(/[()]/g, "");

  if (cleaned.startsWith("0091")) {
    cleaned = cleaned.replace(/^0091/, "");
  }

  if (cleaned.startsWith("+91")) {
    cleaned = cleaned.replace("+91", "");
  } else if (cleaned.startsWith("91") && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith("+")) {
    const noPlus = cleaned.substring(1);
    return {
      countryCode: "+",
      phoneNumber: noPlus,
      phoneE164: `+${noPlus}`,
    };
  }

  cleaned = cleaned.replace(/\D/g, "");

  if (cleaned.length !== 10) return null;

  return {
    countryCode: "+91",
    phoneNumber: cleaned,
    phoneE164: `+91${cleaned}`,
  };
}

module.exports = {
  normalizeIndianPhone,
};