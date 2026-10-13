(function () {
  var id = new URLSearchParams(location.search).get("id");
  var title = document.getElementById("xt");
  var box = document.getElementById("xg");
  var heroImg = document.querySelector(".page-hero .hero-media");
  var API = window.RAIS_LISTINGS_URL || "/api/listings";
  var S = window.RAIS_SANITIZE;
  var PLACEHOLDER_NOTES = [
    "Aktuelles Kaufangebot. Besichtigung nach Terminvereinbarung.",
    "Aktuelles Mietangebot. Besichtigung nach Terminvereinbarung."
  ];

  function isPublicListing(item) {
    return !!(item && item.enabled !== false && item.status !== "verkauft");
  }

  function isSafeHttps(url) {
    if (!url || typeof url !== "string") return false;
    try {
      var u = new URL(url.trim());
      return u.protocol === "https:";
    } catch (e) {
      return false;
    }
  }

  function isSafeAsset(url) {
    return isSafeHttps(url) || /^\/?[a-zA-Z0-9_./-]+$/.test(String(url || ""));
  }

  function displayTitle(raw) {
    var t = String(raw || "").replace(/\s+/g, " ").trim();
    if (!t) return "Objekt";
    t = t.replace(/\b(BALKON|EINBAUKÜCHE|EINBAUKUECHE|TERRASSE|GARTEN|GARAGE)\b/g, function (m) {
      return m.charAt(0) + m.slice(1).toLowerCase();
    });
    if (t === t.toUpperCase() && t.length > 12) {
      t = t.charAt(0) + t.slice(1).toLowerCase();
    }
    return t;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /** Rich text (sanitized on save) or legacy plain text. */
  function descriptionNode(raw) {
    var div = el("div", "expose-body prose");
    var v = String(raw || "").trim();
    if (/<\/?(p|br|strong|em|h2|h3|ul|ol|li|span|a)\b/i.test(v) && S) {
      div.innerHTML = S.sanitizeHtml(v);
    } else {
      v.split(/\n{2,}/).forEach(function (para) {
        if (!para.trim()) return;
        var p = el("p");
        para.split("\n").forEach(function (line, i) {
          if (i) p.appendChild(document.createElement("br"));
          p.appendChild(document.createTextNode(line));
        });
        div.appendChild(p);
      });
    }
    return div;
  }

  function gallery(item, shown) {
    var imgs = (item.images || []).filter(isSafeAsset).slice(0, 12);
    var wrap = el("div", "expose-gallery");
    if (!imgs.length) {
      wrap.appendChild(el("p", "muted-note", "Bilder folgen."));
      return wrap;
    }
    var main = el("img", "expose-main");
    main.src = imgs[0];
    main.alt = shown + " — Bild 1 von " + imgs.length;
    main.decoding = "async";
    wrap.appendChild(main);
    if (imgs.length > 1) {
      var strip = el("div", "expose-thumbs");
      strip.setAttribute("role", "list");
      imgs.forEach(function (src, i) {
        var b = el("button", "expose-thumb" + (i === 0 ? " is-active" : ""));
        b.type = "button";
        b.setAttribute("role", "listitem");
        b.setAttribute("aria-label", "Bild " + (i + 1) + " von " + imgs.length + " anzeigen");
        var t = el("img");
        t.src = src;
        t.alt = "";
        t.loading = "lazy";
        b.appendChild(t);
        b.addEventListener("click", function () {
          main.src = src;
          main.alt = shown + " — Bild " + (i + 1) + " von " + imgs.length;
          Array.prototype.forEach.call(strip.children, function (c) {
            c.classList.toggle("is-active", c === b);
          });
        });
        strip.appendChild(b);
      });
      wrap.appendChild(strip);
    }
    return wrap;
  }

  function docLink(doc, fallback) {
    var a = el("a", "doc-link");
    a.href = doc.url;
    a.target = "_blank";
    a.rel = "noopener";
    var isPdf = /\.pdf($|\?)/i.test(doc.url);
    a.appendChild(el("span", "doc-type", isPdf ? "PDF" : "Bild"));
    a.appendChild(el("span", "doc-name", doc.name || fallback));
    return a;
  }

  function sidePanel(item) {
    var aside = el("aside", "expose-side");

    if (item.price) {
      aside.appendChild(el("p", "expose-price-label", item.type === "miete" ? "Miete" : "Kaufpreis"));
      aside.appendChild(el("p", "expose-price", item.price));
    }

    var courtage = el("div", "courtage-box");
    courtage.appendChild(el("p", "courtage-label", "Provision"));
    courtage.appendChild(el("p", "", item.provision || "Auf Anfrage — Details im Erstgespräch."));
    aside.appendChild(courtage);

    var docs = el("div", "expose-docs");
    docs.appendChild(el("h2", "", "Unterlagen"));
    var plans = (item.floorplans || []).filter(function (d) {
      return d && isSafeAsset(d.url);
    });
    plans.forEach(function (d, i) {
      docs.appendChild(docLink(d, "Grundriss" + (plans.length > 1 ? " " + (i + 1) : "")));
    });
    if (item.energyPdf && isSafeAsset(item.energyPdf.url)) {
      docs.appendChild(docLink(item.energyPdf, "Energieausweis"));
    }
    if (docs.children.length === 1) {
      docs.appendChild(el("p", "muted-note", "Grundrisse und Energieausweis erhalten Sie auf Anfrage."));
    }
    aside.appendChild(docs);

    var cta = el("div", "expose-cta");
    var book = el("a", "btn btn-sell", "Erstgespräch buchen");
    book.href = "kontakt.html#erstgespraech";
    var visit = el("a", "btn ghost", "Besichtigung anfragen");
    visit.href = "#anfrage";
    cta.appendChild(book);
    cta.appendChild(visit);
    aside.appendChild(cta);
    return aside;
  }

  function pills(item) {
    var list = [
      item.type === "miete" ? "Miete" : "Kauf",
      item.category,
      item.place,
      item.area ? item.area + " m²" : "",
      item.rooms ? item.rooms + " Zimmer" : "",
      item.yearBuilt ? "Baujahr " + item.yearBuilt : "",
      item.energyValue ? "Energie " + item.energyValue : "",
      item.heating
    ].filter(Boolean);
    var ul = el("ul", "fact-pills");
    ul.setAttribute("aria-label", "Eckdaten");
    list.forEach(function (t) {
      ul.appendChild(el("li", "", t));
    });
    return ul;
  }

  if (box) {
    box.innerHTML = '<p class="listing-empty" role="status">Objekt wird geladen …</p>';
  }

  fetch(API, { cache: "no-store" })
    .then(function (r) {
      if (!r.ok) throw new Error("api");
      return r.json();
    })
    .then(function (list) {
      var item = (list || []).filter(function (x) {
        return x.id === id;
      })[0];
      if (!item || !isPublicListing(item)) {
        if (title) title.textContent = "Objekt nicht verfügbar";
        if (box) box.innerHTML = "<p>Dieses Objekt ist gerade nicht freigeschaltet.</p>";
        return;
      }

      var shown = item.display_title || displayTitle(item.title);
      document.title = shown + " · Haller Andernach";
      if (title) title.textContent = shown;
      if (heroImg && item.images && item.images[0]) {
        heroImg.src = item.images[0];
        heroImg.alt = shown;
      }

      box.innerHTML = "";

      var top = el("div", "expose-top");
      top.appendChild(gallery(item, shown));
      top.appendChild(sidePanel(item));
      box.appendChild(top);

      var summary = el("div", "expose-summary");
      var shortText = (item.note || "").trim();
      var lead = el("div", "expose-lead");
      if (shortText && PLACEHOLDER_NOTES.indexOf(shortText) === -1) {
        lead.appendChild(el("p", "expose-short", shortText));
      }
      if (item.ref) lead.appendChild(el("p", "muted-note", "Objekt-Nr. " + item.ref));
      summary.appendChild(lead);
      summary.appendChild(pills(item));
      box.appendChild(summary);

      var body = (item.description || "").trim();
      if (body && PLACEHOLDER_NOTES.indexOf(body) === -1) {
        box.appendChild(descriptionNode(body));
      } else {
        box.appendChild(el("p", "muted-note", "Ausführliche Objektbeschreibung folgt. Bis dahin klären wir Details im Gespräch."));
      }

      var energyBits = [
        item.energyType ? "Ausweis: " + item.energyType : "",
        item.energyValue ? "Kennwert: " + item.energyValue : "",
        item.yearBuilt ? "Baujahr: " + item.yearBuilt : "",
        item.heating ? "Energieträger: " + item.heating : ""
      ].filter(Boolean);
      var energyBox = el("div", "energy-box");
      energyBox.appendChild(el("h2", "", "Energieausweis"));
      energyBox.appendChild(
        energyBits.length ? el("p", "", energyBits.join(" · ")) : el("p", "muted-note", "Energieausweis auf Anfrage.")
      );
      box.appendChild(energyBox);

      var links = [];
      if (item.links && isSafeHttps(item.links.is24)) {
        links.push({ href: item.links.is24.trim(), label: "ImmoScout24" });
      }
      if (item.links && isSafeHttps(item.links.immowelt)) {
        links.push({ href: item.links.immowelt.trim(), label: "Immowelt" });
      }
      if (links.length) {
        var refP = el("p", "muted-note portal-also", "Auch auf ");
        links.forEach(function (link, i) {
          if (i > 0) refP.appendChild(document.createTextNode(" und "));
          var a = el("a", "", link.label);
          a.href = link.href;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          refP.appendChild(a);
        });
        box.appendChild(refP);
      }

      var place = document.querySelector("[name=place]");
      var oid = document.querySelector("[name=object_id]");
      var otitle = document.querySelector("[name=object_title]");
      var oref = document.querySelector("[name=object_ref]");
      var otype = document.querySelector("[name=object_type]");
      var intent = document.querySelector("[name=intent]");
      if (place) place.value = shown;
      if (oid) oid.value = item.id || "";
      if (otitle) otitle.value = item.title || shown;
      if (oref) oref.value = item.ref || "";
      if (otype) otype.value = item.type || "kauf";
      if (intent) intent.value = "besichtigung";
      if (window.RAIS_SEO && window.RAIS_SEO.applyListing) {
        window.RAIS_SEO.applyListing(item);
      }
    })
    .catch(function () {
      if (title) title.textContent = "Objekt nicht geladen";
      if (box) {
        box.innerHTML =
          '<p role="alert">Objekt konnte nicht geladen werden. Bitte Seite neu laden oder <a href="kontakt.html">Kontakt aufnehmen</a>.</p>';
      }
    });
})();
