(function () {
  var cfg = window.RAIS_FORM || {};
  var form = document.getElementById("f") || document.getElementById("anfrage");
  if (!form) return;

  var endpoint = window.RAIS_INQUIRIES_URL || "/api/inquiries";

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var ok = document.getElementById("ok");
    var btn = form.querySelector('[type="submit"]');
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
    var subject = cfg.subject || "Neue Anfrage";
    var isMulti = !!form.querySelector('input[type="checkbox"][name="object_id"]');

    var objectIds = [];
    var objectTitles = [];
    var objectRefs = [];
    var objectTypes = [];

    if (isMulti) {
      Array.prototype.forEach.call(
        form.querySelectorAll('input[type="checkbox"][name="object_id"]:checked'),
        function (el) {
          var id = String(el.value || "").trim();
          var title = String(el.getAttribute("data-title") || "").trim();
          var ref = String(el.getAttribute("data-ref") || "").trim();
          var typ = String(el.getAttribute("data-type") || "").trim();
          if (id) objectIds.push(id);
          if (title) objectTitles.push(title);
          if (ref) objectRefs.push(ref);
          if (typ) objectTypes.push(typ);
        }
      );
    } else {
      var singleId = (fd.get("object_id") || "").toString().trim();
      var singleTitle = (fd.get("object_title") || fd.get("place") || "").toString().trim();
      var singleRef = (fd.get("object_ref") || "").toString().trim();
      var singleType = (fd.get("object_type") || "").toString().trim();
      if (singleId) objectIds.push(singleId);
      if (singleTitle) objectTitles.push(singleTitle);
      if (singleRef) objectRefs.push(singleRef);
      if (singleType) objectTypes.push(singleType);
    }

    if (objectTitles.length) {
      var prefix =
        intent === "besichtigung" || intent === "objekt"
          ? "Besichtigung / Objektinteresse"
          : "Anfrage";
      subject = prefix + " · " + objectTitles.join(" · ") + " · Haller";
    } else if (form.querySelector('[name="subject"]') && fd.get("subject")) {
      subject = fd.get("subject").toString();
    }

    var payload = {
      name: (fd.get("name") || "").toString(),
      email: (fd.get("email") || "").toString(),
      phone: (fd.get("phone") || fd.get("tel") || "").toString(),
      message: (fd.get("message") || fd.get("msg") || "").toString(),
      intent: intent,
      subject: subject,
      privacy: true,
      place: (fd.get("place") || "").toString(),
      object_ref: objectRefs[0] || (fd.get("object_ref") || "").toString(),
      object_type: objectTypes[0] || (fd.get("object_type") || "").toString(),
      object_id: objectIds,
      object_ids: objectIds,
      page_path: location.pathname + location.search
    };

    if (btn) btn.disabled = true;

    fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload)
    })
      .then(function (r) {
        return r.json().then(function (j) {
          return { ok: r.ok, status: r.status, body: j };
        });
      })
      .then(function (res) {
        var j = res.body || {};
        var titles = j.objectTitles || objectTitles;
        if (ok) {
          if (res.ok && j.success) {
            ok.textContent = titles.length
              ? "Anfrage zu „" + titles.join("“, „") + "“ gesendet. Sie liegt objektbezogen in der Mail."
              : "Anfrage gesendet. Sie liegt in der Mail.";
          } else if (res.status === 503) {
            ok.textContent = "Formular derzeit nicht konfiguriert. Bitte später erneut versuchen.";
          } else if (res.status === 429) {
            ok.textContent = "Zu viele Anfragen. Bitte kurz warten.";
          } else {
            ok.textContent = j.message || j.error || "Senden fehlgeschlagen.";
          }
          ok.style.display = "block";
        }
        if (res.ok && j.success) {
          var keepId = objectIds[0] || "";
          var keepTitle = objectTitles[0] || "";
          form.reset();
          if (!isMulti && keepId) {
            var idEl = form.querySelector('input[type="hidden"][name="object_id"]');
            var titleEl = form.querySelector('[name="object_title"]');
            var placeEl = form.querySelector('[name="place"]');
            if (idEl) idEl.value = keepId;
            if (titleEl) titleEl.value = keepTitle;
            if (placeEl) placeEl.value = keepTitle;
          }
        }
      })
      .catch(function () {
        if (ok) {
          ok.textContent = "Netzwerkfehler. Nochmal senden.";
          ok.style.display = "block";
        }
      })
      .finally(function () {
        if (btn) btn.disabled = false;
      });
  });
})();
