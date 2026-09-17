const { isAdmin } = require("../lib/auth");

module.exports = async function handler(req, res) {
  const ok = isAdmin(req);
  res.status(ok ? 200 : 401).json({ ok: ok });
};
