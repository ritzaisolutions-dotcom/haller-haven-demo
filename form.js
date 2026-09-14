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
        ok.textContent = "Key fehlt. REPLACE_WEB3FORMS_ACCESS_KEY in index.html setzen.";
        ok.style.display = "block";
      }
      return;
    }

    var fd = new FormData(form);
    fd.append("access_key", key);
    fd.append("subject", cfg.subject || "Neue Anfrage");
    fd.append("from_name", cfg.fromName || "Website");

    if (btn) btn.disabled = true;

    fetch("https://api.web3forms.com/submit", { method: "POST", body: fd })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (ok) {
          ok.textContent = j.success ? "Anfrage gesendet. Sie liegt in der Mail." : (j.message || "Senden fehlgeschlagen.");
          ok.style.display = "block";
        }
        if (j.success) form.reset();
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
