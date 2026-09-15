(function () {
  var fullRoot = document.getElementById("listing-grid");
  var homeRoot = document.getElementById("home-listings");
  if (!fullRoot && !homeRoot) return;

  function card(item) {
    var img = (item.images && item.images[0]) || "";
    var sold = item.status === "verkauft";
    var el = document.createElement("a");
    el.className = "listing-card";
    el.href = "objekt.html?id=" + encodeURIComponent(item.id || "");
    el.innerHTML =
      (img ? '<img src="' + img + '" alt="">' : '<div class="listing-ph"></div>') +
      '<div class="listing-body">' +
      (sold ? "<small>Verkauft</small>" : "<small>Termin möglich</small>") +
      "<h3>" + (item.title || "Ohne Titel") + "</h3>" +
      "<p>" + [item.place, item.area ? item.area + " m²" : "", item.price].filter(Boolean).join(" · ") + "</p>" +
      "</div>";
    return el;
  }

  function liveOnly(list) {
    return (list || []).filter(function (x) {
      return x.enabled !== false && x.status !== "verkauft";
    });
  }

  function paint(root, list, limit) {
    if (!root) return;
    root.innerHTML = "";
    var live = liveOnly(list);
    if (typeof limit === "number") live = live.slice(0, limit);
    if (!live.length) {
      root.innerHTML =
        '<p class="listing-empty">Aktuell keine freigeschalteten Objekte. <a href="kontakt.html">Anfrage senden</a> oder später wieder vorbeischauen.</p>';
      return;
    }
    live.forEach(function (item) { root.appendChild(card(item)); });
  }

  fetch("/listings.json", { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (list) {
      paint(fullRoot, list);
      paint(homeRoot, list, 3);
    })
    .catch(function () {
      paint(fullRoot, []);
      paint(homeRoot, [], 3);
    });
})();
