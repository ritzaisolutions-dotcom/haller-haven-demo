(function () {
  function url() {
    return (window.RAIS_CAL_URL || "").trim();
  }

  function mount(root) {
    if (!root) return;
    var href = url();
    root.innerHTML = "";
    var p = document.createElement("p");
    p.className = "cal-promise";
    p.textContent = "Antwort am selben Werktag. Ihre Angaben werden in der EU verarbeitet.";
    root.appendChild(p);
    if (href) {
      var iframe = document.createElement("iframe");
      iframe.title = "Termin buchen";
      iframe.src = href;
      iframe.className = "cal-frame";
      iframe.setAttribute("loading", "lazy");
      root.appendChild(iframe);
    } else {
      var a = document.createElement("a");
      a.className = "btn";
      a.href = "kontakt.html";
      a.textContent = "Termin wählen — wir rufen zurück";
      var hint = document.createElement("p");
      hint.className = "muted-note";
      hint.textContent = "Cal.com-Link folgt, sobald der Kalender öffentlich ist.";
      root.appendChild(a);
      root.appendChild(hint);
    }
    root.hidden = false;
  }

  /**
   * Erstgespräch block: Cal.com (third party) loads only after the visitor clicks —
   * no consent banner needed. Without a Cal URL the button jumps to the contact form.
   */
  function bindInline(root) {
    var btn = root.querySelector("[data-cal-load]");
    var frameSlot = root.querySelector("[data-cal-frame]");
    if (!btn || !frameSlot) return;
    btn.addEventListener("click", function (e) {
      var href = url();
      if (!href) return; // plain link to the form (#f) stays in effect
      e.preventDefault();
      var iframe = document.createElement("iframe");
      iframe.title = "Erstgespräch buchen";
      iframe.src = href;
      iframe.className = "cal-frame";
      frameSlot.innerHTML = "";
      frameSlot.appendChild(iframe);
      frameSlot.hidden = false;
      btn.hidden = true;
    });
  }

  window.RAIS_CAL = { mount: mount, url: url };

  Array.prototype.forEach.call(document.querySelectorAll("[data-cal-inline]"), bindInline);

  fetch("/api/public-config", { cache: "no-store" })
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (j) {
      if (j && j.calUrl) window.RAIS_CAL_URL = j.calUrl;
    })
    .catch(function () {});
})();
