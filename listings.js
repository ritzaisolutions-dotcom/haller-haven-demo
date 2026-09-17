(function () {
  var fullRoot = document.getElementById("listing-grid");
  var homeRoot = document.getElementById("home-listings");
  var pickRoot = document.getElementById("object-pick");
  if (!fullRoot && !homeRoot && !pickRoot) return;

  var HOME_MAX = Number(window.RAIS_HOME_MAX) || 6;
  var API = window.RAIS_LISTINGS_URL || "/api/listings";
  var filterState = "all";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isPublicListing(item) {
    return !!(item && item.enabled !== false && item.status !== "verkauft");
  }

  function typeLabel(item) {
    return item.type === "miete" ? "Miete" : "Kauf";
  }

  function card(item, opts) {
    opts = opts || {};
    var images = (item.images || []).filter(Boolean);
    var sold = item.status === "verkauft";
    var id = encodeURIComponent(item.id || "");
    var detailHref = "objekt.html?id=" + id;
    var askHref = detailHref + "#anfrage";
    var askOnly = opts.askOnly === true;

    var el = document.createElement("article");
    el.className = "listing-card";
    el.dataset.type = item.type || "kauf";

    var media = document.createElement("div");
    media.className = "listing-media";

    if (!images.length) {
      var ph = document.createElement("div");
      ph.className = "listing-ph";
      media.appendChild(ph);
    } else {
      var img = document.createElement("img");
      img.src = images[0];
      img.alt = item.title || "";
      img.draggable = false;
      img.loading = "lazy";
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
        prev.textContent = "‹";

        var next = document.createElement("button");
        next.type = "button";
        next.className = "listing-nav next";
        next.setAttribute("aria-label", "Nächstes Bild");
        next.textContent = "›";

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

    var chip = document.createElement("span");
    chip.className = "listing-type-chip" + (item.type === "miete" ? " is-rent" : "");
    chip.textContent = typeLabel(item);
    media.appendChild(chip);

    var body = document.createElement("div");
    body.className = "listing-body";
    var actions = askOnly
      ? '<div class="listing-actions">' +
          '<a class="btn" href="' + askHref + '">Anfrage</a>' +
        "</div>"
      : '<div class="listing-actions">' +
          '<a class="btn ghost" href="' + detailHref + '">Details</a>' +
          '<a class="btn" href="' + askHref + '">Anfrage</a>' +
        "</div>";
    body.innerHTML =
      (sold ? "<small>Verkauft</small>" : "<small>Termin möglich</small>") +
      "<h3>" + esc(item.title || "Ohne Titel") + "</h3>" +
      "<p>" + esc([item.place, item.area ? item.area + " m²" : "", item.price].filter(Boolean).join(" · ")) + "</p>" +
      actions;

    el.appendChild(media);
    el.appendChild(body);
    return el;
  }

  function liveOnly(list) {
    return (list || []).filter(isPublicListing);
  }

  function featuredHome(list) {
    var live = liveOnly(list);
    var featured = live.filter(function (x) { return x.featured === true; });
    if (featured.length) return featured.slice(0, HOME_MAX);
    return live.slice(0, HOME_MAX);
  }

  function paint(root, list, opts) {
    if (!root) return;
    opts = opts || {};
    root.innerHTML = "";
    var live = liveOnly(list);
    if (opts.home) live = featuredHome(list);
    if (opts.filter && opts.filter !== "all") {
      live = live.filter(function (x) {
        return (x.type || "kauf") === opts.filter;
      });
    }
    if (!live.length) {
      root.innerHTML =
        '<p class="listing-empty">Aktuell keine freigeschalteten Objekte. <a href="kontakt.html">Anfrage senden</a> oder später wieder vorbeischauen.</p>';
      return;
    }
    live.forEach(function (item) {
      root.appendChild(card(item, { askOnly: !opts.home && root === fullRoot }));
    });
  }

  function showLoading(root) {
    if (!root) return;
    root.innerHTML = '<p class="listing-empty" role="status">Objekte werden geladen …</p>';
  }

  function showError(root) {
    if (!root) return;
    root.innerHTML =
      '<p class="listing-empty" role="alert">Objekte konnten nicht geladen werden. Bitte Seite neu laden oder <a href="kontakt.html">Kontakt aufnehmen</a>.</p>';
  }

  function paintPick(root, list) {
    if (!root) return;
    root.innerHTML = "";
    var live = liveOnly(list).slice().sort(function (a, b) {
      var af = a.featured === true ? 0 : 1;
      var bf = b.featured === true ? 0 : 1;
      return af - bf;
    });
    if (!live.length) {
      root.innerHTML =
        '<p class="muted-note">Derzeit keine freigeschalteten Objekte zur Auswahl. Sie können die Anfrage trotzdem absenden.</p>';
      return;
    }
    live.forEach(function (item) {
      var label = document.createElement("label");
      label.className = "object-pick-item";
      var shortLabel = [item.place, item.rooms ? item.rooms + " Zi." : "", typeLabel(item)]
        .filter(Boolean)
        .join(" · ");
      if (!shortLabel) shortLabel = item.ref || item.id || "Objekt";
      var input = document.createElement("input");
      input.type = "checkbox";
      input.name = "object_id";
      input.value = item.id || "";
      input.setAttribute("data-title", item.title || shortLabel);
      input.setAttribute("data-ref", item.ref || "");
      input.setAttribute("data-type", item.type || "kauf");
      var span = document.createElement("span");
      span.textContent = shortLabel;
      if (item.title) label.title = item.title;
      label.appendChild(input);
      label.appendChild(span);
      root.appendChild(label);
    });

    root.addEventListener("change", function (e) {
      if (!e.target || e.target.name !== "object_id") return;
      var any = root.querySelector('input[name="object_id"]:checked');
      var intent = document.querySelector('select[name="intent"]');
      if (any && intent) {
        var opt = intent.querySelector('option[value="objekt"]');
        if (opt) intent.value = "objekt";
      }
    });
  }

  function ensureFilters(root) {
    if (!root || document.getElementById("listing-filters")) return;
    var bar = document.createElement("div");
    bar.id = "listing-filters";
    bar.className = "listing-filters";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Objektfilter");
    ["all", "kauf", "miete"].forEach(function (key) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "listing-filter" + (key === "all" ? " is-on" : "");
      btn.dataset.filter = key;
      btn.textContent = key === "all" ? "Alle" : key === "kauf" ? "Kauf" : "Miete";
      bar.appendChild(btn);
    });
    root.parentNode.insertBefore(bar, root);
    bar.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-filter]");
      if (!btn) return;
      filterState = btn.dataset.filter;
      Array.prototype.forEach.call(bar.querySelectorAll(".listing-filter"), function (b) {
        b.classList.toggle("is-on", b.dataset.filter === filterState);
      });
      if (window.__RAIS_LISTINGS_CACHE) {
        paint(fullRoot, window.__RAIS_LISTINGS_CACHE, { filter: filterState });
      }
    });
  }

  function apply(list) {
    window.__RAIS_LISTINGS_CACHE = list;
    if (fullRoot) {
      ensureFilters(fullRoot);
      paint(fullRoot, list, { filter: filterState });
    }
    paint(homeRoot, list, { home: true });
    paintPick(pickRoot, list);
  }

  function load() {
    showLoading(fullRoot);
    showLoading(homeRoot);
    return fetch(API, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("api");
        return r.json();
      })
      .then(function (list) {
        apply(Array.isArray(list) ? list : []);
      })
      .catch(function () {
        showError(fullRoot);
        showError(homeRoot);
        if (pickRoot) {
          pickRoot.innerHTML =
            '<p class="muted-note" role="alert">Objektliste nicht verfügbar. Sie können die Anfrage trotzdem absenden.</p>';
        }
      });
  }

  load();
})();
