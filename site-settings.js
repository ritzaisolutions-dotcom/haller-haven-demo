/**
 * Renders admin-managed content from /api/settings into marked slots:
 *   banner (every page, above the header) · [data-partners] · [data-reviews]
 *   [data-cms="<pageKey>"] (replaces the static fallback text) · [data-hv-pdf]
 * HTML from the API is sanitized server-side on save (lib/sanitize-html.js).
 */
(function () {
  var API = "/api/settings";
  var REVIEW_LABEL = { google: "Google", immoscout: "ImmoScout24", immowelt: "Immowelt" };
  var DISMISS_KEY = "rais_banner_closed";

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function safeLink(href) {
    var s = String(href || "").trim();
    return /^(https:\/\/|\/(?!\/)|#|[a-zA-Z0-9_-]+\.html)/.test(s) ? s : "";
  }

  function external(a) {
    if (/^https:/.test(a.href) && a.hostname !== location.hostname) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
  }

  function bannerHash(b) {
    var s = (b.text || "") + "|" + (b.from || "") + "|" + (b.until || "");
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return String(h);
  }

  function renderBanner(b) {
    if (!b || !b.text) return;
    var hash = bannerHash(b);
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === hash) return;
    } catch (e) {}

    var bar = el("aside", "site-banner" + (b.variant === "event" ? " is-event" : ""));
    bar.setAttribute("aria-label", b.variant === "event" ? "Veranstaltung" : "Hinweis");
    var inner = el("div", "site-banner-inner");
    var text = el("div", "site-banner-text");
    text.innerHTML = b.text;
    inner.appendChild(text);
    var href = safeLink(b.linkUrl);
    if (href) {
      var a = el("a", "site-banner-link", b.linkLabel || "Mehr erfahren");
      a.href = href;
      external(a);
      inner.appendChild(a);
    }
    var close = el("button", "site-banner-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Hinweis schließen");
    close.addEventListener("click", function () {
      bar.remove();
      try {
        sessionStorage.setItem(DISMISS_KEY, hash);
      } catch (e) {}
    });
    bar.appendChild(inner);
    bar.appendChild(close);
    document.body.insertBefore(bar, document.body.firstChild);
  }

  function renderPartners(list) {
    var slots = document.querySelectorAll("[data-partners]");
    Array.prototype.forEach.call(slots, function (slot) {
      var section = slot.closest("[data-partners-section]");
      if (!list || !list.length) {
        if (section) section.hidden = true;
        return;
      }
      slot.innerHTML = "";
      list.forEach(function (p) {
        var src = safeLink(p.logoUrl);
        if (!src) return;
        var img = el("img");
        img.src = src;
        img.alt = p.name || "Partner";
        img.loading = "lazy";
        img.decoding = "async";
        var wrap;
        var href = safeLink(p.href);
        if (href) {
          wrap = el("a", "partner-logo");
          wrap.href = href;
          wrap.title = p.name || "";
          external(wrap);
        } else {
          wrap = el("span", "partner-logo");
        }
        wrap.appendChild(img);
        slot.appendChild(wrap);
      });
      if (section) section.hidden = false;
    });
  }

  function renderReviews(list) {
    var slots = document.querySelectorAll("[data-reviews]");
    if (!slots.length || !list || !list.length) return;
    Array.prototype.forEach.call(slots, function (slot) {
      slot.innerHTML = "";
      list.forEach(function (r) {
        var card = el("article", "proof-card review-card is-" + r.source);
        card.appendChild(el("p", "role", REVIEW_LABEL[r.source] || r.source));
        if (r.rating) {
          var score = el("p", "score", /^[0-9]+([,.][0-9])?$/.test(r.rating) ? r.rating + " / 5" : r.rating);
          card.appendChild(score);
          if (r.count) card.appendChild(el("p", "review-count", r.count + " Bewertungen"));
        }
        if (r.text) card.appendChild(el("p", "", r.text));
        var href = safeLink(r.url);
        if (href) {
          var a = el("a", "source", r.rating ? "Quelle: " + REVIEW_LABEL[r.source] : "Bewertungen auf " + REVIEW_LABEL[r.source] + " ansehen");
          a.href = href;
          external(a);
          card.appendChild(a);
        }
        slot.appendChild(card);
      });
    });
  }

  function renderPages(pages) {
    if (!pages) return;
    Array.prototype.forEach.call(document.querySelectorAll("[data-cms]"), function (slot) {
      var html = pages[slot.getAttribute("data-cms")];
      if (html) slot.innerHTML = html;
    });
  }

  function renderHvPdf(doc) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-hv-pdf]"), function (slot) {
      var href = doc && safeLink(doc.url);
      if (!href) {
        slot.hidden = true;
        return;
      }
      var a = slot.querySelector("a") || el("a", "btn");
      a.href = href;
      a.setAttribute("download", "");
      a.target = "_blank";
      a.rel = "noopener";
      var name = slot.querySelector("[data-hv-pdf-name]");
      if (name) name.textContent = doc.name || "PDF";
      if (!a.parentNode) slot.appendChild(a);
      slot.hidden = false;
    });
  }

  fetch(API)
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (s) {
      if (!s) return;
      renderBanner(s.banner);
      renderPartners(s.partners);
      renderReviews(s.reviews);
      renderPages(s.pages);
      renderHvPdf(s.hausverwaltungPdf);
    })
    .catch(function () {
      // Static fallbacks stay in place.
    });
})();
