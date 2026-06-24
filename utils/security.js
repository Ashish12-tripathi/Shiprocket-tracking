function requireSecret(req, expectedSecret, label) {
  const secret = req.query.secret || req.headers["x-omichef-secret"];

  if (!expectedSecret) {
    throw new Error(`${label} secret is missing in ENV.`);
  }

  return secret === expectedSecret;
}

module.exports = {
  requireSecret,
};
