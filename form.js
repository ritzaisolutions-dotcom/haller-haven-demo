(function () {
  var cfg = window.RAIS_FORM || {};
  var form = document.getElementById("f") || document.getElementById("anfrage");
  if (!form) return;

  var recordUrl = window.RAIS_INQUIRIES_URL || "/api/inquiries";
  var configUrl = window.RAIS_FORM_CONFIG_URL || "/api/form-config";

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

    if (btn) btn.disabled = true;

    fetch(configUrl, { credentials: "same-origin", cache: "no-store" })
      .then(function (r) {
        return r.json().then(function (j) {
          return { ok: r.ok, status: r.status, body: j };
        });
      })
      .then(function (cfgRes) {
        if (!cfgRes.ok || !cfgRes.body || !cfgRes.body.accessKey) {
          var err = new Error("form_unconfigured");
          err.status = cfgRes.status;
          throw err;
        }

        var mailFd = new FormData();
        mailFd.append("access_key", cfgRes.body.accessKey);
        mailFd.append("subject", subject);
        mailFd.append("from_name", cfgRes.body.fromName || cfg.fromName || "Haller Haven Website");
        mailFd.append("name", (fd.get("name") || "").toString());
        mailFd.append("email", (fd.get("email") || "").toString());
        var phone = (fd.get("phone") || fd.get("tel") || "").toString();
        var message = (fd.get("message") || fd.get("msg") || "").toString();
        if (phone) mailFd.append("phone", phone);
        if (message) mailFd.append("message", message);
        if (intent) mailFd.append("intent", intent);
        mailFd.append("privacy", "accepted");
        mailFd.append("consent_at", new Date().toISOString());
        if (objectIds.length) {
          mailFd.append("object_ids", objectIds.join(", "));
          mailFd.append("object_id", objectIds[0]);
        }
        if (objectTitles.length) {
          mailFd.append("object_titles", objectTitles.join(" · "));
          mailFd.append("object_title", objectTitles.join(" · "));
        }
        if (objectRefs[0]) mailFd.append("object_ref", objectRefs[0]);
        if (objectTypes[0]) mailFd.append("object_type", objectTypes[0]);
        var place = (fd.get("place") || "").toString();
        if (place) mailFd.append("place", place);

        return fetch("https://api.web3forms.com/submit", {
          method: "POST",
          body: mailFd
        }).then(function (r) {
          return r.json().then(function (j) {
            return { ok: r.ok, body: j };
          });
        });
      })
      .then(function (mailRes) {
        var j = mailRes.body || {};
        if (!mailRes.ok || !j.success) {
          var err = new Error((j && j.message) || "mail_failed");
          err.status = 502;
          throw err;
        }

        // Best-effort metrics; mail already sent.
        return fetch(recordUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            privacy: true,
            intent: intent,
            object_ids: objectIds,
            object_id: objectIds,
            page_path: location.pathname + location.search
          })
        })
          .catch(function () {
            return null;
          })
          .then(function () {
            if (ok) {
              ok.textContent = objectTitles.length
                ? "Anfrage zu „" + objectTitles.join("“, „") + "“ gesendet. Sie liegt objektbezogen in der Mail."
                : "Anfrage gesendet. Sie liegt in der Mail.";
              ok.style.display = "block";
            }
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
          });
      })
      .catch(function (err) {
        if (ok) {
          if (err && err.status === 503) {
            ok.textContent = "Formular derzeit nicht konfiguriert. Bitte später erneut versuchen.";
          } else if (err && err.status === 429) {
            ok.textContent = "Zu viele Anfragen. Bitte kurz warten.";
          } else {
            ok.textContent = (err && err.message) || "Senden fehlgeschlagen.";
          }
          ok.style.display = "block";
        }
      })
      .finally(function () {
        if (btn) btn.disabled = false;
      });
  });
})();
