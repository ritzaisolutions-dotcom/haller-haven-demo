/**
 * "Website-Inhalte" in the admin: Banner, Partner-Logos, Bewertungen, Texte, Hausverwaltung-PDF.
 * Each tab saves its own key via PUT /api/settings.
 */
(function () {
  var API = "/api/settings";
  var root = document.getElementById("site-admin");
  if (!root) return;

  var data = null;
  var editors = {};

  var PAGE_FIELDS = [
    { key: "startIntro", label: "Startseite · Kurz-Intro" },
    { key: "ueberUnsIntro", label: "Über uns · Einleitung" },
    { key: "ueberUnsService", label: "Über uns · Unser Service" },
    { key: "teamIntro", label: "Team · Einleitung" },
    { key: "leistungenIntro", label: "Leistungen · Einleitung" },
    { key: "hausverwaltungIntro", label: "Hausverwaltung · Einleitung" }
  ];
  var REVIEW_LABEL = { google: "Google", immoscout: "ImmoScout24", immowelt: "Immowelt" };

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else if (k in n && k !== "list") n[k] = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) {
      if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }

  function field(label, input) {
    return el("label", {}, [label + " ", input]);
  }

  function status(box, text, isErr) {
    box.textContent = text || "";
    box.className = "site-msg" + (isErr ? " is-err" : "");
  }

  function put(key, value, box) {
    status(box, "Speichern …");
    return fetch(API, {
      method: "PUT",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: key, value: value })
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.status === 401) throw new Error("Sitzung abgelaufen. Bitte neu anmelden.");
          if (!r.ok) throw new Error(j.error || "Speichern fehlgeschlagen");
          data[key] = j.value;
          status(box, "Gespeichert — in spätestens einer Minute live.");
          return j.value;
        });
      })
      .catch(function (err) {
        status(box, err.message, true);
        throw err;
      });
  }

  function saveRow(key, getValue, after) {
    var box = el("p", { className: "site-msg", role: "status" });
    var btn = el("button", { type: "button", text: "Speichern" });
    btn.addEventListener("click", function () {
      var v;
      try {
        v = getValue();
      } catch (e) {
        status(box, e.message, true);
        return;
      }
      put(key, v, box).then(function (saved) {
        if (after) after(saved);
      }).catch(function () {});
    });
    return el("div", { className: "site-save" }, [btn, box]);
  }

  /* ---------- Banner ---------- */
  function bannerPane() {
    var b = data.banner || {};
    var enabled = el("select", {}, [
      el("option", { value: "false", text: "Aus" }),
      el("option", { value: "true", text: "An" })
    ]);
    enabled.value = b.enabled ? "true" : "false";
    var variant = el("select", {}, [
      el("option", { value: "info", text: "Hinweis (blau)" }),
      el("option", { value: "event", text: "Event (hervorgehoben)" })
    ]);
    variant.value = b.variant || "info";
    var text = el("div");
    editors.banner = window.RAIS_RT.create(text, { compact: true, label: "Bannertext", placeholder: "z. B. Tag der offenen Tür am Samstag, 10–14 Uhr", minHeight: "70px" });
    editors.banner.set(b.text || "");
    var linkUrl = el("input", { value: b.linkUrl || "", placeholder: "kontakt.html oder https://…" });
    var linkLabel = el("input", { value: b.linkLabel || "", placeholder: "Mehr erfahren", maxLength: 60 });
    var from = el("input", { type: "date", value: b.from || "" });
    var until = el("input", { type: "date", value: b.until || "" });

    return el("div", { className: "site-pane" }, [
      el("p", { className: "helper", text: "Erscheint oben auf allen Seiten. Mit Zeitraum: schaltet sich automatisch an und ab." }),
      el("div", { className: "grid" }, [field("Banner", enabled), field("Stil", variant)]),
      el("p", { className: "field-label", text: "Text" }),
      text,
      el("div", { className: "grid" }, [field("Link (optional)", linkUrl), field("Link-Text", linkLabel)]),
      el("div", { className: "grid" }, [field("Sichtbar ab", from), field("Sichtbar bis", until)]),
      saveRow("banner", function () {
        var v = {
          enabled: enabled.value === "true",
          variant: variant.value,
          text: editors.banner.get(),
          linkUrl: linkUrl.value.trim(),
          linkLabel: linkLabel.value.trim(),
          from: from.value,
          until: until.value
        };
        if (v.enabled && !v.text) throw new Error("Bannertext fehlt.");
        return v;
      })
    ]);
  }

  /* ---------- Partner-Logos ---------- */
  function partnersPane() {
    var list = (data.partners || []).map(function (p) {
      return { name: p.name, logoUrl: p.logoUrl, href: p.href || "" };
    });
    var box = el("div", { className: "partner-list" });
    var pane = el("div", { className: "site-pane" });
    var note = el("p", { className: "site-msg", role: "status" });

    function paint() {
      box.innerHTML = "";
      list.forEach(function (p, i) {
        var name = el("input", { value: p.name, placeholder: "Name" });
        name.addEventListener("input", function () { p.name = name.value; });
        var href = el("input", { value: p.href, placeholder: "https://… (optional)" });
        href.addEventListener("input", function () { p.href = href.value.trim(); });
        var up = el("button", { type: "button", className: "ghost sm", text: "↑", title: "Nach vorne" });
        up.disabled = i === 0;
        up.addEventListener("click", function () {
          list.splice(i - 1, 0, list.splice(i, 1)[0]);
          paint();
        });
        var del = el("button", { type: "button", className: "ghost sm", text: "Entfernen" });
        del.addEventListener("click", function () {
          list.splice(i, 1);
          paint();
        });
        box.appendChild(
          el("div", { className: "partner-row" }, [
            el("img", { src: p.logoUrl, alt: "" }),
            el("div", { className: "partner-fields" }, [name, href]),
            el("div", { className: "partner-actions" }, [up, del])
          ])
        );
      });
      if (!list.length) box.appendChild(el("p", { className: "mut", text: "Noch keine Logos." }));
    }

    var file = el("input", { type: "file", accept: "image/png,image/jpeg,image/webp", hidden: true });
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      file.value = "";
      if (!f) return;
      status(note, "Logo wird hochgeladen …");
      window.RAIS_UPLOAD.image(f, { scope: "site", max: 600 })
        .then(function (url) {
          list.push({ name: f.name.replace(/\.[a-z0-9]+$/i, ""), logoUrl: url, href: "" });
          paint();
          status(note, "Logo hinzugefügt. Speichern nicht vergessen.");
        })
        .catch(function (err) { status(note, err.message, true); });
    });

    paint();
    pane.appendChild(el("p", { className: "helper", text: "Logoleiste auf Startseite und „Über uns“. Reihenfolge = Anzeige." }));
    pane.appendChild(box);
    pane.appendChild(el("label", { className: "file-btn" }, ["Logo hinzufügen (PNG, JPG, WebP)", file]));
    pane.appendChild(note);
    pane.appendChild(saveRow("partners", function () { return list; }, function (saved) {
      list = saved.slice();
      paint();
    }));
    return pane;
  }

  /* ---------- Bewertungen ---------- */
  function reviewsPane() {
    var bySource = {};
    (data.reviews || []).forEach(function (r) { bySource[r.source] = r; });
    var rows = Object.keys(REVIEW_LABEL).map(function (src) {
      var r = bySource[src] || {};
      return {
        source: src,
        on: el("input", { type: "checkbox", checked: !!bySource[src] }),
        rating: el("input", { value: r.rating || "", placeholder: src === "immowelt" ? "Platin" : "4,8", maxLength: 12 }),
        count: el("input", { value: r.count || "", placeholder: "Anzahl", maxLength: 12, inputMode: "numeric" }),
        text: el("input", { value: r.text || "", maxLength: 300, placeholder: "Kurzer Satz zur Quelle" }),
        url: el("input", { value: r.url || "", placeholder: "https://…" })
      };
    });
    var pane = el("div", { className: "site-pane" }, [
      el("p", { className: "helper", text: "Nur Werte eintragen, die öffentlich auf dem Portal stehen. Leere Bewertung = nur Link zur Quelle." })
    ]);
    rows.forEach(function (r) {
      pane.appendChild(
        el("fieldset", { className: "review-row" }, [
          el("legend", {}, [el("label", { className: "inline" }, [r.on, " " + REVIEW_LABEL[r.source] + " anzeigen"])]),
          el("div", { className: "grid" }, [field("Bewertung", r.rating), field("Anzahl Bewertungen", r.count)]),
          field("Text", r.text),
          field("Link zum Profil", r.url)
        ])
      );
    });
    pane.appendChild(saveRow("reviews", function () {
      return rows.filter(function (r) { return r.on.checked; }).map(function (r) {
        return { source: r.source, rating: r.rating.value.trim(), count: r.count.value.trim(), text: r.text.value.trim(), url: r.url.value.trim() };
      });
    }));
    return pane;
  }

  /* ---------- Texte ---------- */
  function pagesPane() {
    var pages = data.pages || {};
    var pane = el("div", { className: "site-pane" }, [
      el("p", { className: "helper", text: "Leer lassen = der bisherige Text auf der Seite bleibt stehen." })
    ]);
    PAGE_FIELDS.forEach(function (f) {
      var host = el("div");
      pane.appendChild(el("p", { className: "field-label", text: f.label }));
      pane.appendChild(host);
      editors[f.key] = window.RAIS_RT.create(host, { label: f.label, minHeight: "110px" });
      editors[f.key].set(pages[f.key] || "");
    });
    pane.appendChild(saveRow("pages", function () {
      var out = {};
      PAGE_FIELDS.forEach(function (f) {
        var v = editors[f.key].get();
        if (v) out[f.key] = v;
      });
      return out;
    }));
    return pane;
  }

  /* ---------- Hausverwaltung-PDF ---------- */
  function pdfPane() {
    var cur = data.hausverwaltungPdf;
    var info = el("p", { className: "mut" });
    var note = el("p", { className: "site-msg", role: "status" });
    var remove = el("button", { type: "button", className: "ghost sm", text: "PDF entfernen" });

    function paint() {
      info.innerHTML = "";
      if (cur) {
        info.appendChild(document.createTextNode("Aktuell: "));
        info.appendChild(el("a", { href: cur.url, target: "_blank", rel: "noopener", text: cur.name }));
      } else {
        info.textContent = "Noch kein PDF hochgeladen — der Download-Button bleibt ausgeblendet.";
      }
      remove.hidden = !cur;
    }

    var file = el("input", { type: "file", accept: "application/pdf", hidden: true });
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      file.value = "";
      if (!f) return;
      status(note, "PDF wird hochgeladen …");
      window.RAIS_UPLOAD.pdf(f, { scope: "site" })
        .then(function (doc) {
          return put("hausverwaltungPdf", { url: doc.url, name: f.name }, note);
        })
        .then(function (saved) {
          cur = saved;
          paint();
        })
        .catch(function (err) { status(note, err.message, true); });
    });
    remove.addEventListener("click", function () {
      put("hausverwaltungPdf", null, note).then(function () {
        cur = null;
        paint();
      }).catch(function () {});
    });

    paint();
    return el("div", { className: "site-pane" }, [
      el("p", { className: "helper", text: "Download auf der Seite „Hausverwaltung“ (z. B. Leistungsübersicht). Wird sofort gespeichert." }),
      info,
      el("label", { className: "file-btn" }, ["PDF hochladen (max. 10 MB)", file]),
      remove,
      note
    ]);
  }

  var TABS = [
    { id: "banner", label: "Banner", build: bannerPane },
    { id: "partners", label: "Partner-Logos", build: partnersPane },
    { id: "reviews", label: "Bewertungen", build: reviewsPane },
    { id: "pages", label: "Texte", build: pagesPane },
    { id: "pdf", label: "Hausverwaltung-PDF", build: pdfPane }
  ];

  function render() {
    root.innerHTML = "";
    var tabs = el("div", { className: "site-tabs", role: "tablist" });
    var panes = el("div");
    TABS.forEach(function (t, i) {
      var pane = t.build();
      pane.id = "site-pane-" + t.id;
      pane.setAttribute("role", "tabpanel");
      pane.hidden = i !== 0;
      var btn = el("button", { type: "button", className: "ghost sm", role: "tab", text: t.label });
      btn.setAttribute("aria-selected", i === 0 ? "true" : "false");
      btn.setAttribute("aria-controls", pane.id);
      btn.addEventListener("click", function () {
        Array.prototype.forEach.call(tabs.children, function (b) { b.setAttribute("aria-selected", "false"); });
        Array.prototype.forEach.call(panes.children, function (p) { p.hidden = true; });
        btn.setAttribute("aria-selected", "true");
        pane.hidden = false;
      });
      tabs.appendChild(btn);
      panes.appendChild(pane);
    });
    root.appendChild(el("h2", { text: "Website-Inhalte" }));
    root.appendChild(el("p", { className: "helper", text: "Banner, Logos, Bewertungen und Texte — ohne Programmierer pflegen." }));
    root.appendChild(tabs);
    root.appendChild(panes);
  }

  function load() {
    if (data) return;
    fetch(API + "?all=1", { credentials: "same-origin", cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status === 401 ? "unauthorized" : "Laden fehlgeschlagen");
        return r.json();
      })
      .then(function (j) {
        data = j;
        render();
      })
      .catch(function (err) {
        if (err.message !== "unauthorized") root.textContent = "Website-Inhalte konnten nicht geladen werden.";
      });
  }

  // Load once the admin app is visible (after login or session check).
  var app = document.getElementById("app");
  if (app && !app.hidden) load();
  if (app && window.MutationObserver) {
    new MutationObserver(function () {
      if (!app.hidden) load();
    }).observe(app, { attributes: true, attributeFilter: ["hidden"] });
  }
})();
