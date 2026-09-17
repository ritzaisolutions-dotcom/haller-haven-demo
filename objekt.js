(function () {
  var id = new URLSearchParams(location.search).get("id");
  var title = document.getElementById("xt");
  var box = document.getElementById("xg");
  var heroImg = document.querySelector(".page-hero .hero-media");
  var API = window.RAIS_LISTINGS_URL || "/api/listings";

  function isPublicListing(item) {
    return !!(item && item.enabled !== false && item.status !== "verkauft");
  }

  function isSafeHttps(url) {
    if (!url || typeof url !== "string") return false;
    try {
      var u = new URL(url.trim());
      return u.protocol === "https:";
    } catch (e) {
      return false;
    }
  }

  if (box) {
    box.innerHTML = '<p class="listing-empty" role="status">Objekt wird geladen …</p>';
  }

  fetch(API, { cache: "no-store" })
    .then(function (r) {
      if (!r.ok) throw new Error("api");
      return r.json();
    })
    .then(function (list) {
      var item = (list || []).filter(function (x) { return x.id === id; })[0];
      if (!item || !isPublicListing(item)) {
        if (title) title.textContent = "Objekt nicht verfügbar";
        if (box) box.innerHTML = "<p>Dieses Objekt ist gerade nicht freigeschaltet.</p>";
        return;
      }

      document.title = (item.title || "Objekt") + " · Haller Andernach";
      if (title) title.textContent = item.title || "Objekt";
      if (heroImg && item.images && item.images[0]) {
        heroImg.src = item.images[0];
        heroImg.alt = item.title || "Objektfoto";
      }

      box.innerHTML = "";
      (item.images || []).forEach(function (src) {
        if (!src) return;
        var img = document.createElement("img");
        img.src = src;
        img.alt = item.title || "";
        img.loading = "lazy";
        img.style.cssText = "width:100%;max-height:420px;object-fit:cover;margin-bottom:8px";
        box.appendChild(img);
      });

      var meta = [
        item.type === "miete" ? "Miete" : "Kauf",
        item.category,
        item.place,
        item.area ? item.area + " m²" : "",
        item.rooms ? item.rooms + " Zi." : "",
        item.price
      ].filter(Boolean).join(" · ");

      var metaP = document.createElement("p");
      var strong = document.createElement("strong");
      strong.textContent = meta;
      metaP.appendChild(strong);
      box.appendChild(metaP);

      var links = [];
      if (item.links && isSafeHttps(item.links.is24)) {
        links.push({ href: item.links.is24.trim(), label: "ImmoScout24" });
      }
      if (item.links && isSafeHttps(item.links.immowelt)) {
        links.push({ href: item.links.immowelt.trim(), label: "Immowelt" });
      }

      if (item.ref || links.length) {
        var refP = document.createElement("p");
        refP.className = "muted-note";
        if (item.ref) refP.appendChild(document.createTextNode("Objekt-Nr. " + item.ref));
        links.forEach(function (link, i) {
          if (item.ref || i > 0) refP.appendChild(document.createTextNode(" · "));
          var a = document.createElement("a");
          a.href = link.href;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.textContent = link.label;
          refP.appendChild(a);
        });
        box.appendChild(refP);
      }

      var noteP = document.createElement("p");
      noteP.textContent = item.note || "";
      box.appendChild(noteP);

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
    })
    .catch(function () {
      if (title) title.textContent = "Objekt nicht geladen";
      if (box) {
        box.innerHTML =
          '<p role="alert">Objekt konnte nicht geladen werden. Bitte Seite neu laden oder <a href="kontakt.html">Kontakt aufnehmen</a>.</p>';
      }
    });
})();
