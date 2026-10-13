/**
 * Allowlist HTML sanitizer for admin rich text (no dependencies).
 * Keeps bold / italic / font weight / headings / lists / links — drops everything else
 * but keeps its text. Output is balanced and safe to inject via innerHTML.
 * Runs in Node (API validation) and in the browser (admin paste) as window.RAIS_SANITIZE.
 */
(function (root) {

var MAX_LEN = 40000;

// Source tag -> output tag. Anything not listed is unwrapped (text kept).
var TAG_MAP = {
  p: "p",
  div: "p",
  br: "br",
  strong: "strong",
  b: "strong",
  em: "em",
  i: "em",
  u: "u",
  h1: "h2",
  h2: "h2",
  h3: "h3",
  h4: "h3",
  h5: "h3",
  h6: "h3",
  ul: "ul",
  ol: "ol",
  li: "li",
  a: "a",
  span: "span"
};

var VOID = { br: true };
var WEIGHTS = { "300": "400", "400": "400", normal: "400", "500": "500", "600": "600", "700": "700", "800": "700", "900": "700", bold: "700" };

function escText(s) {
  return String(s)
    .replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]{1,31}|#[0-9]{1,7}|#x[0-9a-fA-F]{1,6});)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function decodeBasic(s) {
  return String(s)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function parseAttrs(raw) {
  var out = {};
  var re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  var m;
  while ((m = re.exec(raw || ""))) {
    var v = m[2] != null ? m[2] : m[3] != null ? m[3] : m[4] != null ? m[4] : "";
    out[m[1].toLowerCase()] = decodeBasic(v);
  }
  return out;
}

function safeHref(href) {
  var s = String(href || "").trim();
  if (!s || /[\s<>"'`]/.test(s)) return "";
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return ""; // javascript:, data:, …
  if (/^(\/(?!\/)|#|[a-zA-Z0-9_-]+\.html)/.test(s)) return s;
  return "";
}

function weightFromStyle(style) {
  var m = /font-weight\s*:\s*([a-z0-9]+)/i.exec(style || "");
  return m ? WEIGHTS[m[1].toLowerCase()] || "" : "";
}

function fontStyleItalic(style) {
  return /font-style\s*:\s*italic/i.test(style || "");
}

function sanitizeHtml(input) {
  if (input == null) return "";
  var src = String(input).slice(0, MAX_LEN);
  src = src
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|template|iframe|object|embed|noscript|svg|math|head|title|xml)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|template|iframe|object|embed|noscript|svg|math|head|title|xml)\b[^>]*\/?>/gi, "")
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")
    .replace(/<![^>]*>/g, "")
    .replace(/<\?[\s\S]*?\?>/g, "");

  var out = [];
  // stack entries: { src: original tag name, tags: [output tags opened for it] }
  var stack = [];
  var tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
  var last = 0;
  var m;

  function openTags(srcName, tags) {
    stack.push({ src: srcName, tags: tags });
  }

  function closeEntry(entry) {
    for (var k = entry.tags.length - 1; k >= 0; k--) out.push("</" + entry.tags[k] + ">");
  }

  while ((m = tagRe.exec(src))) {
    if (m.index > last) out.push(escText(src.slice(last, m.index)));
    last = tagRe.lastIndex;

    var name = m[1].toLowerCase();
    var isClose = m[0].charAt(1) === "/";
    var mapped = TAG_MAP[name];

    if (isClose) {
      // Close the nearest matching open element (and anything left open inside it).
      for (var s = stack.length - 1; s >= 0; s--) {
        if (stack[s].src === name) {
          while (stack.length > s) closeEntry(stack.pop());
          break;
        }
      }
      continue;
    }

    if (!mapped) continue;
    if (VOID[mapped]) {
      out.push("<br>");
      continue;
    }

    var attrs = parseAttrs(m[2]);
    var opened = [];

    if (mapped === "strong" && weightFromStyle(attrs.style) === "400") {
      // Google Docs wraps the whole clipboard in <b style="font-weight:normal"> — not bold.
      openTags(name, opened);
      continue;
    }

    if (mapped === "a") {
      var href = safeHref(attrs.href);
      if (href) {
        var external = /^https?:/i.test(href);
        out.push(
          '<a href="' + escAttr(href) + '"' + (external ? ' target="_blank" rel="noopener noreferrer"' : "") + ">"
        );
        opened.push("a");
      }
    } else if (mapped === "span") {
      // Google Docs / Word express bold & italic as inline styles — keep only those.
      // Also accept our own output (class="fw-500") so sanitizing is idempotent.
      var own = /(?:^|\s)fw-(500|600)(?:\s|$)/.exec(attrs["class"] || "");
      var weight = weightFromStyle(attrs.style) || (own ? own[1] : "");
      if (weight && weight !== "400") {
        if (weight === "700") {
          out.push("<strong>");
          opened.push("strong");
        } else {
          out.push('<span class="fw-' + weight + '">');
          opened.push("span");
        }
      }
      if (fontStyleItalic(attrs.style)) {
        out.push("<em>");
        opened.push("em");
      }
    } else {
      out.push("<" + mapped + ">");
      opened.push(mapped);
      // A styled <p>/<li> from a paste may carry italic/weight inline.
      if (mapped !== "ul" && mapped !== "ol") {
        var w2 = weightFromStyle(attrs.style);
        if (w2 === "700" && mapped !== "strong" && !/^h[23]$/.test(mapped)) {
          out.push("<strong>");
          opened.push("strong");
        }
        if (fontStyleItalic(attrs.style) && mapped !== "em") {
          out.push("<em>");
          opened.push("em");
        }
      }
    }
    openTags(name, opened);
  }
  if (last < src.length) out.push(escText(src.slice(last)));
  while (stack.length) closeEntry(stack.pop());

  return out
    .join("")
    .replace(/<(strong|em|u|span[^>]*|p|h2|h3|li)>\s*<\/(strong|em|u|span|p|h2|h3|li)>/g, function (all, open, close) {
      return open.split(" ")[0] === close ? "" : all;
    })
    .trim();
}

/** Plain-text view of sanitized or raw HTML (meta descriptions, cards). */
function htmlToText(html) {
  return decodeBasic(
    String(html || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|h2|h3|li)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

var api = { sanitizeHtml: sanitizeHtml, htmlToText: htmlToText, safeHref: safeHref };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.RAIS_SANITIZE = api;
})(typeof window !== "undefined" ? window : this);
