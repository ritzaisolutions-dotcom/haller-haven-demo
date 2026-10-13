/**
 * Inquiry hand-off to n8n. When CRM_WEBHOOK_URL is set, every inquiry is POSTed there as JSON;
 * the n8n workflow "Haller · Website-Anfrage" mails it into the sales@ inbox, where
 * "Haller · Qualifizierung" turns it into a lead. CRM_WEBHOOK_SECRET goes out as X-Webhook-Secret.
 * Never throws — callers decide what a failed hand-off means for the visitor.
 */

var TIMEOUT_MS = 4000;

function crmWebhookUrl() {
  var url = String(process.env.CRM_WEBHOOK_URL || "").trim();
  return /^https:\/\//.test(url) ? url : "";
}

async function sendToCrm(payload, opts) {
  var url = crmWebhookUrl();
  if (!url) return { sent: false, reason: "unconfigured" };
  var timeoutMs = (opts && opts.timeoutMs) || TIMEOUT_MS;
  var ctrl = new AbortController();
  var timer = setTimeout(function () {
    ctrl.abort();
  }, timeoutMs);
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
