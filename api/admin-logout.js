module.exports = async function handler(req, res) {
  res.setHeader("Set-Cookie", "rais_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0");
  res.status(200).json({ ok: true });
};
