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

async function sendInquiryMail(fields) {
  var opts = envMail();
  if (!opts) {
    var err = new Error("smtp_unconfigured");
    err.code = "smtp_unconfigured";
    throw err;
  }

  var subject = fields.subject || "Neue Anfrage · Haller";
  var lines = [];
  Object.keys(fields).forEach(function (k) {
    if (k === "subject" || fields[k] == null || fields[k] === "") return;
    lines.push(k + ": " + String(fields[k]));
  });
  var body = lines.join("\n") || "(keine Felder)";
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

module.exports = { envMail, sendInquiryMail };
