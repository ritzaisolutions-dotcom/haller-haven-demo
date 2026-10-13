const net = require("net");
const tls = require("tls");

function envMail() {
  var host = process.env.SMTP_HOST || "";
  var user = process.env.SMTP_USER || "";
  var pass = process.env.SMTP_PASS || "";
  var to = process.env.INQUIRY_TO || process.env.SMTP_TO || user;
  var from = process.env.SMTP_FROM || user;
  var port = Number(process.env.SMTP_PORT || 465);
  var secure = process.env.SMTP_SECURE !== "0" && port === 465;
  if (!host || !user || !pass || !to) return null;
  return { host: host, port: port, user: user, pass: pass, to: to, from: from, secure: secure };
}

function b64(s) {
  return Buffer.from(String(s), "utf8").toString("base64");
}

function encodeHeader(s) {
  var t = String(s || "").replace(/[\r\n]+/g, " ");
  if (/^[\x20-\x7E]*$/.test(t)) return t;
  return "=?UTF-8?B?" + b64(t) + "?=";
}

function quoteAddr(addr) {
  return String(addr || "").replace(/[<>\r\n]/g, "");
}

function sendSmtp(opts, mail) {
  return new Promise(function (resolve, reject) {
    var socket;
    var buf = "";
    var step = 0;
    var timed = setTimeout(function () {
      fail(new Error("smtp_timeout"));
    }, 20000);

    function fail(err) {
      clearTimeout(timed);
      try {
        socket.destroy();
      } catch (e) {}
      reject(err);
    }

    function write(cmd) {
      socket.write(cmd + "\r\n");
    }

    function onLine(line) {
      var code = Number(line.slice(0, 3));
      if (step === 0) {
        if (code !== 220) return fail(new Error("smtp_banner"));
        write("EHLO haller-haven");
        step = 1;
        return;
      }
      if (step === 1) {
        if (code !== 250) return fail(new Error("smtp_ehlo"));
        write("AUTH LOGIN");
        step = 2;
        return;
      }
      if (step === 2) {
        if (code !== 334) return fail(new Error("smtp_auth"));
        write(b64(opts.user));
        step = 3;
        return;
      }
      if (step === 3) {
        if (code !== 334) return fail(new Error("smtp_user"));
        write(b64(opts.pass));
        step = 4;
        return;
      }
      if (step === 4) {
        if (code !== 235) return fail(new Error("smtp_login"));
        write("MAIL FROM:<" + quoteAddr(opts.from) + ">");
        step = 5;
        return;
      }
      if (step === 5) {
        if (code !== 250) return fail(new Error("smtp_from"));
        write("RCPT TO:<" + quoteAddr(opts.to) + ">");
        step = 6;
        return;
      }
      if (step === 6) {
        if (code !== 250 && code !== 251) return fail(new Error("smtp_rcpt"));
        write("DATA");
        step = 7;
        return;
      }
      if (step === 7) {
        if (code !== 354) return fail(new Error("smtp_data"));
        socket.write(mail);
        socket.write("\r\n.\r\n");
        step = 8;
        return;
      }
      if (step === 8) {
        if (code !== 250) return fail(new Error("smtp_send"));
        write("QUIT");
        step = 9;
        return;
      }
      if (step === 9) {
        clearTimeout(timed);
        try {
          socket.end();
        } catch (e) {}
        resolve(true);
      }
    }

    function onData(chunk) {
      buf += chunk.toString("utf8");
      var parts = buf.split(/\r?\n/);
      buf = parts.pop() || "";
      parts.forEach(function (line) {
        if (/^\d{3}[\s-]/.test(line) && line.charAt(3) !== "-") onLine(line);
      });
    }

    function attach(s) {
      socket = s;
      socket.setEncoding("utf8");
      socket.on("data", onData);
      socket.on("error", fail);
    }

    if (opts.secure) {
      attach(
        tls.connect({ host: opts.host, port: opts.port, servername: opts.host }, function () {})
      );
    } else {
      var plain = net.connect({ host: opts.host, port: opts.port }, function () {});
      attach(plain);
    }
  });
}

// Fields printed in the fixed head block, so the generic list skips them.
var HEAD_KEYS = { subject: 1, name: 1, email: 1, phone: 1, objekt_ids: 1, message: 1 };

function oneLine(v) {
  return String(v == null ? "" : v).replace(/[\r\n]+/g, " ").trim();
}

/**
 * Kauf / Miete / Bewertung / Suchprofil from the form fields, or "" when unclear.
 * deal (Suchprofil) wins, then the form kind, then the intent select.
 */
function anliegen(fields) {
  var deal = String(fields.deal || "").toLowerCase();
  if (deal === "kauf") return "Kauf";
  if (deal === "miete") return "Miete";
  if (fields.kind === "bewertung") return "Bewertung";
  if (fields.kind === "suchprofil") return "Suchprofil";
  var intent = String(fields.intent || "").toLowerCase();
  if (intent === "kaufen" || intent === "besichtigung" || intent === "finanzierung") return "Kauf";
  if (intent === "vermietung" || intent === "mieten") return "Miete";
  if (intent === "verkaufen") return "Verkauf";
  return "";
}

/**
 * Plain-text mail body. The head lines (Name, E-Mail, Telefon, Anliegen, Objekt-ID) are a contract
 * with the n8n "Haller · Qualifizierung" workflow, which parses them — keep their labels stable.
 */
function buildInquiryBody(fields) {
  var head = ["Name: " + oneLine(fields.name), "E-Mail: " + oneLine(fields.email)];
  if (fields.phone) head.push("Telefon: " + oneLine(fields.phone));
  var a = anliegen(fields);
  if (a) head.push("Anliegen: " + a);
  (Array.isArray(fields.objekt_ids) ? fields.objekt_ids : []).forEach(function (id) {
    if (id) head.push("Objekt-ID: " + oneLine(id));
  });
  var rest = [];
  Object.keys(fields).forEach(function (k) {
    if (HEAD_KEYS[k] || fields[k] == null || fields[k] === "") return;
    rest.push(k + ": " + oneLine(fields[k]));
  });
  var parts = [head.join("\n")];
  if (fields.message) parts.push("Nachricht:\n" + String(fields.message));
  if (rest.length) parts.push(rest.join("\n"));
  return parts.join("\n\n");
}

async function sendInquiryMail(fields) {
  var opts = envMail();
  if (!opts) {
    var err = new Error("smtp_unconfigured");
    err.code = "smtp_unconfigured";
    throw err;
  }

  var subject = fields.subject || "Neue Anfrage · Haller";
  var body = buildInquiryBody(fields);
  var reply = quoteAddr(fields.email || "");
  var payload =
    "From: " +
    encodeHeader("Haller Website") +
    " <" +
    quoteAddr(opts.from) +
    ">\r\n" +
    "To: <" +
    quoteAddr(opts.to) +
    ">\r\n" +
    (reply ? "Reply-To: <" + reply + ">\r\n" : "") +
    "X-Haller-Source: website\r\n" +
    "Subject: " +
    encodeHeader(subject) +
    "\r\n" +
    "MIME-Version: 1.0\r\n" +
    "Content-Type: text/plain; charset=UTF-8\r\n" +
    "Content-Transfer-Encoding: 8bit\r\n" +
    "\r\n" +
    body.replace(/\r?\n/g, "\r\n") +
    "\r\n";

  await sendSmtp(opts, payload);
  return { to: opts.to };
}

module.exports = { envMail, sendInquiryMail, buildInquiryBody, anliegen };
