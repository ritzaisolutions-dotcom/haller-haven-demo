(function () {
  var fullRoot = document.getElementById("listing-grid");
  var homeRoot = document.getElementById("home-listings");
  var pickRoot = document.getElementById("object-pick");
  if (!fullRoot && !homeRoot && !pickRoot) return;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function card(item) {
    var images = (item.images || []).filter(Boolean);
    var sold = item.status === "verkauft";
    var id = encodeURIComponent(item.id || "");
    var detailHref = "objekt.html?id=" + id;
    var askHref = detailHref + "#anfrage";

    var el = document.createElement("article");
    el.className = "listing-card";

    var media = document.createElement("div");
    media.className = "listing-media";

    if (!images.length) {
      media.innerHTML = '<div class="listing-ph"></div>';
    } else {
      var img = document.createElement("img");
      img.src = images[0];
      img.alt = item.title || "";
      img.draggable = false;
      media.appendChild(img);

      if (images.length > 1) {
        var idx = 0;
        var counter = document.createElement("span");
        counter.className = "listing-count";
        counter.textContent = "1 / " + images.length;

        var prev = document.createElement("button");
        prev.type = "button";
        prev.className = "listing-nav prev";
        prev.setAttribute("aria-label", "Vorheriges Bild");
        prev.innerHTML = "‹";

        var next = document.createElement("button");
        next.type = "button";
        next.className = "listing-nav next";
        next.setAttribute("aria-label", "Nächstes Bild");
        next.innerHTML = "›";

        var dots = document.createElement("div");
        dots.className = "listing-dots";
        images.forEach(function (_, i) {
          var d = document.createElement("button");
          d.type = "button";
          d.className = "listing-dot" + (i === 0 ? " is-on" : "");
          d.setAttribute("aria-label", "Bild " + (i + 1));
          d.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            show(i);
          });
          dots.appendChild(d);
        });

        function show(i) {
          idx = (i + images.length) % images.length;
          img.src = images[idx];
          counter.textContent = (idx + 1) + " / " + images.length;
          Array.prototype.forEach.call(dots.children, function (d, di) {
            d.classList.toggle("is-on", di === idx);
          });
        }

        function stopNav(e) {
          e.preventDefault();
          e.stopPropagation();
        }

        prev.addEventListener("click", function (e) {
          stopNav(e);
          show(idx - 1);
        });
        next.addEventListener("click", function (e) {
          stopNav(e);
          show(idx + 1);
        });

        img.style.cursor = "pointer";
        img.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          show(idx + 1);
        });

        var startX = 0;
        media.addEventListener("touchstart", function (e) {
          if (e.touches && e.touches[0]) startX = e.touches[0].clientX;
        }, { passive: true });
        media.addEventListener("touchend", function (e) {
          if (!e.changedTouches || !e.changedTouches[0]) return;
          var dx = e.changedTouches[0].clientX - startX;
          if (Math.abs(dx) < 40) return;
          e.preventDefault();
          e.stopPropagation();
          show(dx < 0 ? idx + 1 : idx - 1);
        });

        media.appendChild(prev);
        media.appendChild(next);
        media.appendChild(dots);
        media.appendChild(counter);
      }
    }

    var body = document.createElement("div");
    body.className = "listing-body";
    body.innerHTML =
      (sold ? "<small>Verkauft</small>" : "<small>Termin möglich</small>") +
      "<h3>" + esc(item.title || "Ohne Titel") + "</h3>" +
      "<p>" + esc([item.place, item.area ? item.area + " m²" : "", item.price].filter(Boolean).join(" · ")) + "</p>" +
      '<div class="listing-actions">' +
        '<a class="btn ghost" href="' + detailHref + '">Details</a>' +
        '<a class="btn" href="' + askHref + '">Anfrage</a>' +
      "</div>";

    el.appendChild(media);
    el.appendChild(body);
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

  function paintPick(root, list) {
    if (!root) return;
    root.innerHTML = "";
    var live = liveOnly(list);
    if (!live.length) {
      root.innerHTML =
        '<p class="muted-note">Derzeit keine freigeschalteten Objekte zur Auswahl. Sie können die Anfrage trotzdem absenden.</p>';
      return;
    }
    live.forEach(function (item) {
      var label = document.createElement("label");
      label.className = "object-pick-item";
      var meta = [item.place, item.price].filter(Boolean).join(" · ");
      label.innerHTML =
        '<input type="checkbox" name="object_id" value="' + esc(item.id || "") + '" data-title="' + esc(item.title || "") + '">' +
        "<span><strong>" + esc(item.title || "Ohne Titel") + "</strong>" +
        (meta ? "<small>" + esc(meta) + "</small>" : "") +
        "</span>";
      root.appendChild(label);
    });
  }

  fetch("/listings.json", { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (list) {
      paint(fullRoot, list);
      paint(homeRoot, list, 3);
      paintPick(pickRoot, list);
    })
    .catch(function () {
      paint(fullRoot, []);
      paint(homeRoot, [], 3);
      paintPick(pickRoot, []);
    });
})();
