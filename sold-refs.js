(function () {
  var root = document.getElementById("sold-refs");
  if (!root) return;
  var API = (window.RAIS_LISTINGS_URL || "/api/listings") + "?sold=1";
  fetch(API, { cache: "no-store" })
    .then(function (r) {
      return r.ok ? r.json() : [];
    })
    .then(function (list) {
      root.innerHTML = "";
      if (!list || !list.length) {
        root.innerHTML =
          '<p class="muted-note">Verkaufte Referenzen (Ort, Art, Vermarktungsdauer) erscheinen hier, sobald Objekte im Admin auf „verkauft“ stehen. Keine erfundenen Deals.</p>';
        return;
      }
      list.slice(0, 4).forEach(function (item) {
        var art = document.createElement("article");
        art.className = "sold-card";
        var h = document.createElement("h3");
        h.textContent = [item.place, item.category || (item.type === "miete" ? "Miete" : "Kauf")]
          .filter(Boolean)
          .join(" · ");
        var p = document.createElement("p");
        var days = item.marketedDays ? item.marketedDays + " Tage Vermarktung" : "Vermarktungsdauer folgt";
        p.textContent = days;
        art.appendChild(h);
        art.appendChild(p);
        root.appendChild(art);
      });
    })
    .catch(function () {
      root.innerHTML = '<p class="muted-note">Referenzen konnten nicht geladen werden.</p>';
    });
})();
