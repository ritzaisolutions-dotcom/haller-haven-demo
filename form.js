(function () {
  var cfg = window.RAIS_FORM || {};
  var form = document.getElementById("f") || document.getElementById("anfrage");
  if (!form) return;

  // Web3Forms access keys are meant for the browser (official client pattern).
  var ACCESS_KEY = "7c1a6a5f-913b-4860-97a8-87d2a6097cf7";
  var recordUrl = window.RAIS_INQUIRIES_URL || "/api/inquiries";

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

    var subject = cfg.subject || "Neue Anfrage";
    if (objectTitles.length) {
      var prefix =
        intent === "besichtigung" || intent === "objekt"
          ? "Besichtigung / Objektinteresse"
          : "Anfrage";
      subject = prefix + " · " + objectTitles.join(" · ") + " · Haller";
    }

    // Web3Forms expects "message"; our forms use "note".
    var note = (fd.get("note") || fd.get("message") || "").toString().trim();
    if (note) fd.set("message", note);
    fd.delete("note");

    fd.append("access_key", ACCESS_KEY);
    fd.append("subject", subject);
    fd.append("from_name", cfg.fromName || "Haller Haven Website");
    fd.set("privacy", "accepted");
    fd.append("consent_at", new Date().toISOString());
    if (objectTitles.length) {
      fd.set("object_titles", objectTitles.join(" · "));
      fd.set("object_title", objectTitles.join(" · "));
    }

    var originalText = btn ? btn.textContent : "";
    if (btn) {
      btn.textContent = "Wird gesendet …";
      btn.disabled = true;
    }

    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: fd
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { ok: response.ok, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok || !result.data || !result.data.success) {
          throw new Error(
            (result.data && result.data.message) || "Senden fehlgeschlagen."
          );
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
