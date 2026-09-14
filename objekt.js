(function () {
  var id = new URLSearchParams(location.search).get("id");
  var title = document.getElementById("xt");
  var box = document.getElementById("xg");
  var heroImg = document.querySelector(".page-hero .hero-media");

  fetch("/listings.json", { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (list) {
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
          return '<img src="' + s + '" alt="" style="width:100%;max-height:420px;object-fit:cover;margin-bottom:8px">';
        })
        .join("");
      var meta = [item.place, item.area ? item.area + " m²" : "", item.rooms ? item.rooms + " Zi." : "", item.price]
        .filter(Boolean)
        .join(" · ");
      if (box) {
        box.innerHTML =
          imgs +
          "<p><strong>" + meta + "</strong></p>" +
          "<p>" + (item.note || "") + "</p>";
      }

      var place = document.querySelector("[name=place]");
      var oid = document.querySelector("[name=object_id]");
      var otitle = document.querySelector("[name=object_title]");
      var intent = document.querySelector("[name=intent]");
      if (place) place.value = item.title || item.place || "";
      if (oid) oid.value = item.id || "";
      if (otitle) otitle.value = item.title || "";
      if (intent) intent.value = "besichtigung";
    });
})();
