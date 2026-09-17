(function () {
  var id = new URLSearchParams(location.search).get("id");
  var title = document.getElementById("xt");
  var box = document.getElementById("xg");
  var heroImg = document.querySelector(".page-hero .hero-media");
  var API = window.RAIS_LISTINGS_URL || "/api/listings";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function loadList() {
    return fetch(API, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("api");
        return r.json();
      })
      .catch(function () {
        return fetch("/listings.json", { cache: "no-store" })
          .then(function (r) { return r.ok ? r.json() : []; });
      });
  }

  loadList().then(function (list) {
    var item = (list || []).filter(function (x) { return x.id === id; })[0];
    if (!item || item.enabled === false) {
      if (title) title.textContent = "Objekt nicht verfügbar";
      if (box) box.innerHTML = "<p>Dieses Objekt ist gerade nicht freigeschaltet.</p>";
      return;
    }

    document.title = (item.title || "Objekt") + " · Haller Andernach";
    if (title) title.textContent = item.title || "Objekt";
    if (heroImg && item.images && item.images[0]) heroImg.src = item.images[0];

    var imgs = (item.images || [])
      .map(function (s) {
        return '<img src="' + esc(s) + '" alt="" loading="lazy" style="width:100%;max-height:420px;object-fit:cover;margin-bottom:8px">';
      })
      .join("");
    var meta = [
      item.type === "miete" ? "Miete" : "Kauf",
      item.category,
      item.place,
      item.area ? item.area + " m²" : "",
      item.rooms ? item.rooms + " Zi." : "",
      item.price
    ].filter(Boolean).join(" · ");

    var links = [];
    if (item.links && item.links.is24) {
      links.push('<a href="' + esc(item.links.is24) + '" target="_blank" rel="noopener noreferrer">ImmoScout24</a>');
    }
    if (item.links && item.links.immowelt) {
      links.push('<a href="' + esc(item.links.immowelt) + '" target="_blank" rel="noopener noreferrer">Immowelt</a>');
    }
    var refLine = item.ref
      ? '<p class="muted-note">Objekt-Nr. ' + esc(item.ref) +
        (links.length ? " · " + links.join(" · ") : "") + "</p>"
      : (links.length ? '<p class="muted-note">' + links.join(" · ") + "</p>" : "");

    if (box) {
      box.innerHTML =
        imgs +
        "<p><strong>" + esc(meta) + "</strong></p>" +
        refLine +
        "<p>" + esc(item.note || "") + "</p>";
    }

    var place = document.querySelector("[name=place]");
    var oid = document.querySelector("[name=object_id]");
    var otitle = document.querySelector("[name=object_title]");
    var oref = document.querySelector("[name=object_ref]");
    var otype = document.querySelector("[name=object_type]");
    var intent = document.querySelector("[name=intent]");
    if (place) place.value = item.title || item.place || "";
    if (oid) oid.value = item.id || "";
    if (otitle) otitle.value = item.title || "";
    if (oref) oref.value = item.ref || "";
    if (otype) otype.value = item.type || "kauf";
    if (intent) intent.value = "besichtigung";
    if (window.RAIS_SEO && window.RAIS_SEO.applyListing) {
      window.RAIS_SEO.applyListing(item);
    }
  });
})();
