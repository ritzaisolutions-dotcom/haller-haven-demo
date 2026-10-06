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

  function displayTitle(raw) {
    var t = String(raw || "").replace(/\s+/g, " ").trim();
    if (!t) return "Objekt";
    t = t.replace(/\b(BALKON|EINBAUKÜCHE|EINBAUKUECHE|TERRASSE|GARTEN|GARAGE)\b/g, function (m) {
      return m.charAt(0) + m.slice(1).toLowerCase();
    });
    if (t === t.toUpperCase() && t.length > 12) {
      t = t.charAt(0) + t.slice(1).toLowerCase();
    }
    return t;
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
      var item = (list || []).filter(function (x) {
        return x.id === id;
      })[0];
      if (!item || !isPublicListing(item)) {
        if (title) title.textContent = "Objekt nicht verfügbar";
        if (box) box.innerHTML = "<p>Dieses Objekt ist gerade nicht freigeschaltet.</p>";
        return;
      }

      var shown = item.display_title || displayTitle(item.title);
      document.title = shown + " · Haller Andernach";
      if (title) title.textContent = shown;
      if (heroImg && item.images && item.images[0]) {
        heroImg.src = item.images[0];
        heroImg.alt = shown;
      }

      box.innerHTML = "";
      (item.images || []).forEach(function (src) {
        if (!src) return;
        var img = document.createElement("img");
        img.src = src;
        img.alt = shown;
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
      ]
        .filter(Boolean)
        .join(" · ");
      var metaP = document.createElement("p");
      var strong = document.createElement("strong");
      strong.textContent = meta;
      metaP.appendChild(strong);
      box.appendChild(metaP);

      var body = (item.description || "").trim() || (item.note || "").trim();
      if (body && body !== "Aktuelles Kaufangebot. Besichtigung nach Terminvereinbarung." && body !== "Aktuelles Mietangebot. Besichtigung nach Terminvereinbarung.") {
        var noteP = document.createElement("p");
        noteP.className = "expose-body";
        noteP.textContent = body;
        box.appendChild(noteP);
      } else {
        var wait = document.createElement("p");
        wait.className = "muted-note";
        wait.textContent = "Ausführliche Objektbeschreibung folgt. Bis dahin klären wir Details im Gespräch.";
        box.appendChild(wait);
      }

      var energyBits = [
        item.energyType ? "Ausweis: " + item.energyType : "",
        item.energyValue ? "Kennwert: " + item.energyValue : "",
        item.yearBuilt ? "Baujahr: " + item.yearBuilt : "",
        item.heating ? "Energieträger: " + item.heating : ""
      ].filter(Boolean);
      var energyBox = document.createElement("div");
      energyBox.className = "energy-box";
      var eh = document.createElement("h2");
      eh.textContent = "Energieausweis";
      energyBox.appendChild(eh);
      if (energyBits.length) {
        var el = document.createElement("p");
        el.textContent = energyBits.join(" · ");
        energyBox.appendChild(el);
      } else {
        var missing = document.createElement("p");
        missing.className = "muted-note";
        missing.textContent = "Energieausweis auf Anfrage.";
        energyBox.appendChild(missing);
      }
      box.appendChild(energyBox);

      var links = [];
      if (item.links && isSafeHttps(item.links.is24)) {
        links.push({ href: item.links.is24.trim(), label: "ImmoScout24" });
      }
      if (item.links && isSafeHttps(item.links.immowelt)) {
        links.push({ href: item.links.immowelt.trim(), label: "Immowelt" });
      }
      if (item.ref || links.length) {
        var refP = document.createElement("p");
        refP.className = "muted-note portal-also";
        if (item.ref) refP.appendChild(document.createTextNode("Objekt-Nr. " + item.ref));
        if (links.length) {
          if (item.ref) refP.appendChild(document.createTextNode(" · "));
          refP.appendChild(document.createTextNode("Auch auf "));
          links.forEach(function (link, i) {
            if (i > 0) refP.appendChild(document.createTextNode(" und "));
            var a = document.createElement("a");
            a.href = link.href;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.textContent = link.label;
            refP.appendChild(a);
          });
        }
        box.appendChild(refP);
      }

      var place = document.querySelector("[name=place]");
      var oid = document.querySelector("[name=object_id]");
      var otitle = document.querySelector("[name=object_title]");
      var oref = document.querySelector("[name=object_ref]");
      var otype = document.querySelector("[name=object_type]");
      var intent = document.querySelector("[name=intent]");
      if (place) place.value = shown;
      if (oid) oid.value = item.id || "";
      if (otitle) otitle.value = item.title || shown;
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
