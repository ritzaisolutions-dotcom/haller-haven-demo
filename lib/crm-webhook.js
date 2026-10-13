/**
 * Optional CRM hand-off. When CRM_WEBHOOK_URL is set, every inquiry is POSTed there as JSON
 * (after the SMTP mail succeeded). Works with Zapier/Make/n8n or a CRM's own webhook intake.
 * Never throws — the visitor's submit must not fail because the CRM is slow or down.
 */

var TIMEOUT_MS = 4000;

function crmWebhookUrl() {
  var url = String(process.env.CRM_WEBHOOK_URL || "").trim();
  return /^https:\/\//.test(url) ? url : "";
}

async function sendToCrm(payload) {
  var url = crmWebhookUrl();
  if (!url) return { sent: false, reason: "unconfigured" };
  var ctrl = new AbortController();
  var timer = setTimeout(function () {
    ctrl.abort();
  }, TIMEOUT_MS);
  try {
    var headers = { "Content-Type": "application/json" };
    if (process.env.CRM_WEBHOOK_SECRET) headers["X-Webhook-Secret"] = process.env.CRM_WEBHOOK_SECRET;
    var r = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(Object.assign({ source: "haller-website", receivedAt: new Date().toISOString() }, payload)),
      signal: ctrl.signal
    });
    if (!r.ok) {
      console.error("crm_webhook", r.status);
      return { sent: false, reason: "http_" + r.status };
    }
    return { sent: true };
  } catch (e) {
    console.error("crm_webhook", e && (e.name === "AbortError" ? "timeout" : e.message));
    return { sent: false, reason: "error" };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { sendToCrm, crmWebhookUrl };
