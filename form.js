(function () {
  var cfg = window.RAIS_FORM || {};
  var form = document.getElementById("f") || document.getElementById("anfrage");
  if (!form) return;

  var recordUrl = window.RAIS_INQUIRIES_URL || "/api/inquiries";
  var OK_TEXT = "Gesendet. Wir antworten am selben Werktag — Verarbeitung in der EU.";

  (function applyQuery() {
    var q = new URLSearchParams(location.search);
    var intent = (q.get("intent") || "").trim();
    var listing = (q.get("listing") || q.get("id") || "").trim();
    var allowed = {
      objekt: 1,
      verkaufen: 1,
      kaufen: 1,
      vermietung: 1,
      verwaltung: 1,
      allgemein: 1,
      besichtigung: 1,
      finanzierung: 1
    };
    var sel = form.querySelector('select[name="intent"]');
    if (intent && allowed[intent] && sel) sel.value = intent;
    if (listing) {
      var hid = form.querySelector('input[type="hidden"][name="object_id"]');
      if (hid) hid.value = listing;
    }
  })();

  function collectObjects(fd) {
    var isMulti = !!form.querySelector('input[type="checkbox"][name="object_id"]');
    var objectIds = [];
    var objectTitles = [];
    if (isMulti) {
      Array.prototype.forEach.call(
        form.querySelectorAll('input[type="checkbox"][name="object_id"]:checked'),
        function (el) {
          var id = String(el.value || "").trim();
          var title = String(el.getAttribute("data-title") || "").trim();
          if (id) objectIds.push(id);
          if (title) objectTitles.push(title);
        }
      );
    } else {
      var singleId = (fd.get("object_id") || "").toString().trim();
      var singleTitle = (fd.get("object_title") || fd.get("place") || "").toString().trim();
      if (singleId) objectIds.push(singleId);
      if (singleTitle) objectTitles.push(singleTitle);
    }
    return { isMulti: isMulti, objectIds: objectIds, objectTitles: objectTitles };
  }

  function showCal() {
    var slot = document.getElementById("cal-slot");
    if (!slot) return;
    slot.hidden = false;
    if (window.RAIS_CAL && window.RAIS_CAL.mount) window.RAIS_CAL.mount(slot);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var ok = document.getElementById("ok");
    var btn = form.querySelector('button[type="submit"]');
    var privacy = form.querySelector('[name="privacy"]');

    if (privacy && !privacy.checked) {
      if (ok) {
        ok.textContent = "Bitte der Datenverarbeitung zustimmen.";
        ok.style.display = "block";
      }
      privacy.focus();
      return;
    }

    var fd = new FormData(form);
    var intent = (fd.get("intent") || "").toString();
    var kind = (fd.get("kind") || cfg.kind || "anfrage").toString();
    var picked = collectObjects(fd);

    var payload = {
      privacy: true,
      kind: kind,
      intent: intent,
      name: (fd.get("name") || "").toString(),
      email: (fd.get("email") || "").toString(),
      phone: (fd.get("phone") || fd.get("tel") || "").toString(),
      place: (fd.get("place") || "").toString(),
      message: (fd.get("note") || fd.get("message") || "").toString(),
      object_ids: picked.objectIds,
      object_id: picked.objectIds,
      object_titles: picked.objectTitles,
      object_title: picked.objectTitles.join(" · "),
      financing: (fd.get("financing") || "").toString(),
      equity: (fd.get("equity") || "").toString(),
      use: (fd.get("use") || "").toString(),
      move_in: (fd.get("move_in") || "").toString(),
      property_type: (fd.get("property_type") || "").toString(),
      area: (fd.get("area") || "").toString(),
      price_expect: (fd.get("price_expect") || "").toString(),
      rooms: (fd.get("rooms") || "").toString(),
      deal: (fd.get("deal") || "").toString(),
      budget: (fd.get("budget") || "").toString(),
      page_path: location.pathname + location.search
    };

    var originalText = btn ? btn.textContent : "";
    if (btn) {
      btn.textContent = "Wird gesendet …";
      btn.disabled = true;
    }

    fetch(recordUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { ok: response.ok, status: response.status, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok || !result.data || !result.data.success) {
          var err = new Error(
            result.status === 503
              ? "Formular derzeit nicht konfiguriert. Bitte später erneut versuchen."
              : result.status === 429
                ? "Zu viele Anfragen. Bitte kurz warten."
                : (result.data && result.data.error) || "Senden fehlgeschlagen."
          );
          throw err;
        }
        if (result.data.calUrl) window.RAIS_CAL_URL = result.data.calUrl;
        if (ok) {
          ok.textContent = OK_TEXT;
          ok.style.display = "block";
        }
        var keepId = picked.objectIds[0] || "";
        var keepTitle = picked.objectTitles[0] || "";
        form.reset();
        if (!picked.isMulti && keepId) {
          var idEl = form.querySelector('input[type="hidden"][name="object_id"]');
          var titleEl = form.querySelector('[name="object_title"]');
          var placeEl = form.querySelector('[name="place"]');
          if (idEl) idEl.value = keepId;
          if (titleEl) titleEl.value = keepTitle;
          if (placeEl && placeEl.hasAttribute("readonly")) placeEl.value = keepTitle;
        }
        if (kind === "anfrage" || kind === "objekt" || intent === "besichtigung") showCal();
        if (kind === "bewertung") showCal();
      })
      .catch(function (error) {
        if (ok) {
          ok.textContent =
            (error && error.message) || "Senden fehlgeschlagen. Bitte erneut versuchen.";
          ok.style.display = "block";
        }
      })
      .finally(function () {
        if (btn) {
          btn.textContent = originalText;
          btn.disabled = false;
        }
      });
  });
})();
