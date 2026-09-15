(function () {
  var cfg = window.RAIS_FORM || {};
  var form = document.getElementById("f") || document.getElementById("anfrage");
  if (!form) return;

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

    var key = cfg.accessKey || "";
    if (!key || key.indexOf("REPLACE_") === 0) {
      if (ok) {
        ok.textContent = "Key fehlt. REPLACE_WEB3FORMS_ACCESS_KEY setzen.";
        ok.style.display = "block";
      }
      return;
    }

    var fd = new FormData(form);
    var intent = (fd.get("intent") || "").toString();
    var subject = cfg.subject || "Neue Anfrage";
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

    if (objectTitles.length) {
      var prefix = intent === "besichtigung" ? "Besichtigung" : "Anfrage";
      subject = prefix + " · " + objectTitles.join(" · ") + " · Haller";
    } else if (form.querySelector('[name="subject"]') && fd.get("subject")) {
      subject = fd.get("subject").toString();
    }

    fd.append("access_key", key);
    fd.set("subject", subject);
    fd.append("from_name", cfg.fromName || "Website");
    fd.set("privacy", "accepted");
    fd.set("consent_at", new Date().toISOString());

    if (objectIds.length) {
      fd.set("object_ids", objectIds.join(", "));
      fd.set("object_id", objectIds[0]);
    }
    if (objectTitles.length) {
      fd.set("object_titles", objectTitles.join(" · "));
      fd.set("object_title", objectTitles.join(" · "));
    }

    if (btn) btn.disabled = true;

    fetch("https://api.web3forms.com/submit", { method: "POST", body: fd })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (ok) {
          ok.textContent = j.success
            ? (objectTitles.length
              ? "Anfrage zu „" + objectTitles.join("“, „") + "“ gesendet. Sie liegt objektbezogen in der Mail."
              : "Anfrage gesendet. Sie liegt in der Mail.")
            : (j.message || "Senden fehlgeschlagen.");
          ok.style.display = "block";
        }
        if (j.success) {
          objectIds.forEach(bumpInquiry);
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

  function bumpInquiry(objectId) {
    if (!objectId) return;
    try {
      var k = (window.RAIS_STORE_KEY || "rais-listings-demo") + "-inquiries";
      var map = JSON.parse(localStorage.getItem(k) || "{}");
      map[objectId] = (Number(map[objectId]) || 0) + 1;
      localStorage.setItem(k, JSON.stringify(map));
    } catch (err) {}
  }
})();
