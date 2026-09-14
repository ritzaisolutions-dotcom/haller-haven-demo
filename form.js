(function () {
  var cfg = window.RAIS_FORM || {};
  var form = document.getElementById("f");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var ok = document.getElementById("ok");
    var btn = form.querySelector('[type="submit"]');
    var key = cfg.accessKey || "";
    if (!key || key.indexOf("REPLACE_") === 0) {
      if (ok) {
        ok.textContent = "Key fehlt. REPLACE_WEB3FORMS_ACCESS_KEY setzen.";
        ok.style.display = "block";
      }
      return;
    }

    var fd = new FormData(form);
    var objectId = (fd.get("object_id") || "").toString().trim();
    var objectTitle = (fd.get("object_title") || fd.get("place") || "").toString().trim();
    var intent = (fd.get("intent") || "").toString();
    var subject = cfg.subject || "Neue Anfrage";

    if (objectTitle) {
      subject = (intent === "besichtigung" ? "Besichtigung" : "Anfrage") +
        " · " + objectTitle + " · Haller";
    } else if (form.querySelector('[name="subject"]') && fd.get("subject")) {
      subject = fd.get("subject").toString();
    }

    fd.append("access_key", key);
    fd.set("subject", subject);
    fd.append("from_name", cfg.fromName || "Website");
    if (objectId) fd.set("object_id", objectId);
    if (objectTitle) fd.set("object_title", objectTitle);

    if (btn) btn.disabled = true;

    fetch("https://api.web3forms.com/submit", { method: "POST", body: fd })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (ok) {
          ok.textContent = j.success
            ? (objectTitle
              ? "Termin-Anfrage zu „" + objectTitle + "“ gesendet. Sie liegt objektbezogen in der Mail."
              : "Anfrage gesendet. Sie liegt in der Mail.")
            : (j.message || "Senden fehlgeschlagen.");
          ok.style.display = "block";
        }
        if (j.success) {
          if (objectId) bumpInquiry(objectId);
          var keepId = objectId;
          var keepTitle = objectTitle;
          form.reset();
          if (keepId) {
            var idEl = form.querySelector('[name="object_id"]');
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
    try {
      var k = (window.RAIS_STORE_KEY || "rais-listings-demo") + "-inquiries";
      var map = JSON.parse(localStorage.getItem(k) || "{}");
      map[objectId] = (Number(map[objectId]) || 0) + 1;
      localStorage.setItem(k, JSON.stringify(map));
    } catch (err) {}
  }
})();
