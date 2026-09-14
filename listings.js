(function () {
  var root = document.getElementById("listing-grid");
  if (!root) return;

  function card(item) {
    var img = (item.images && item.images[0]) || "";
    var sold = item.status === "verkauft";
    var el = document.createElement("article");
    el.className = "listing-card"; el.style.cursor="pointer"; el.addEventListener("click",function(){ location.href="objekt.html?id="+encodeURIComponent(item.id||""); });
    el.innerHTML =
      (img ? '<img src="' + img + '" alt="">' : '<div class="listing-ph"></div>') +
      '<div class="listing-body">' +
      (sold ? "<small>Verkauft</small>" : "<small>Objekt</small>") +
      "<h3>" + (item.title || "Ohne Titel") + "</h3>" +
      "<p>" + [item.place, item.area ? item.area + " m²" : "", item.price].filter(Boolean).join(" · ") + "</p>" +
      "</div>";
    return el;
  }

  function paint(list) {
    root.innerHTML = "";
    var live = (list || []).filter(function (x) { return x.status !== "verkauft"; });
    if (!live.length) {
      root.innerHTML = "<p class=\"listing-empty\">Noch keine Objekte. Anlage nur im Admin.</p>";
      return;
    }
    live.forEach(function (item) { root.appendChild(card(item)); });
  }

  fetch("/listings.json", { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(paint)
    .catch(function () { paint([]); });
})();
