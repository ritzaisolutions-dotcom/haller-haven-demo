(function () {
  var cfg = window.RAIS_ADMIN || {};
  var dragId = null;
  var HOME_MAX = Number(window.RAIS_HOME_MAX) || 6;

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function localBumps() {
    try {
      var k = (window.RAIS_STORE_KEY || "rais-listings-demo") + "-inquiries";
      return JSON.parse(localStorage.getItem(k) || "{}");
    } catch (e) {
      return {};
    }
  }

  function inquiryParts(item) {
    var bumps = localBumps();
    var base = Number(item.inquiryCount) || 0;
    var local = Number(bumps[item.id]) || 0;
    return { base: base, local: local, total: base + local };
  }

  function inquiryTotal(item) {
    return inquiryParts(item).total;
  }

  function msg(text, isErr) {
    var el = $("form-msg");
    el.textContent = text || "";
    el.classList.toggle("is-err", !!isErr);
  }

  function handleAuthError(err) {
    if (err && err.status === 401) {
      $("app").hidden = true;
      $("gate").hidden = false;
      $("out").hidden = true;
      $("login-msg").textContent = "Sitzung abgelaufen. Bitte erneut anmelden.";
      return true;
    }
    return false;
  }

  function afterSave(promise, okText) {
    return promise
      .then(function () {
        msg(okText || "Gespeichert — sofort live.");
        renderStats();
        renderList();
      })
      .catch(function (err) {
        if (handleAuthError(err)) return;
        msg(err.message || "Fehler beim Speichern", true);
        renderStats();
        renderList();
      });
  }

  function statsRow(item) {
    var parts = inquiryParts(item);
    return {
      id: item.id || "",
      title: item.title || "Ohne Titel",
      place: item.place || "",
      price: item.price || "",
      area: item.area || "",
      rooms: item.rooms || "",
      status: item.status || "aktiv",
      enabled: item.enabled !== false ? "an" : "aus",
      featured: item.featured === true ? "ja" : "nein",
      createdAt: item.createdAt || "",
      createdAtDe: fmtDate(item.createdAt),
      inquiryBase: parts.base,
      inquiryLocal: parts.local,
      inquiryTotal: parts.total,
      images: (item.images && item.images.length) || 0
    };
  }

  function csvEscape(v) {
    var s = String(v == null ? "" : v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function toCsv(rows) {
    var headers = [
      "id", "title", "place", "price", "area", "rooms", "status", "enabled", "featured",
      "createdAt", "inquiryBase", "inquiryLocal", "inquiryTotal", "images"
    ];
    var lines = [headers.join(",")];
    rows.forEach(function (r) {
      lines.push(headers.map(function (h) { return csvEscape(r[h]); }).join(","));
    });
    return lines.join("\r\n");
  }

  function downloadCsv(filename, rows) {
    var blob = new Blob(["\uFEFF" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function slugName(s) {
    return String(s || "objekt")
      .toLowerCase()
      .replace(/[^a-z0-9äöüß]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "objekt";
  }

  function exportObjectCsv(id) {
    var item = window.RAIS_STORE.get(id);
    if (!item) return;
    var row = statsRow(item);
    downloadCsv("stats-" + slugName(row.title || row.id) + ".csv", [row]);
  }

  function gate() {
    var pw = $("pw").value;
    $("login-msg").textContent = "";
    fetch("/api/admin-login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ password: pw })
    }).then(function (r) {
      if (r.status === 503) {
        $("login-msg").textContent = "ADMIN_PASSWORD fehlt auf Vercel. Env setzen, neu deployen.";
        return;
      }
      if (!r.ok) {
        $("login-msg").textContent = "Falsch.";
        return;
      }
      $("pw").value = "";
      showApp();
    }).catch(function () {
      $("login-msg").textContent = "Login-API nicht erreichbar.";
    });
  }

  function showApp() {
    $("gate").hidden = true;
    $("app").hidden = false;
    $("out").hidden = false;
    $("who").textContent = cfg.tenant || "demo";
    window.RAIS_STORE.seedFromPublic()
      .then(function () {
        renderStats();
        renderList();
      })
      .catch(function (err) {
        if (handleAuthError(err)) return;
        msg(err.message || "Laden fehlgeschlagen", true);
      });
  }

  function compress(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.type || file.type.indexOf("image") !== 0) {
        reject(new Error("kein Bild"));
        return;
      }
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        var max = 1600;
        var w = img.width;
        var h = img.height;
        if (w > max || h > max) {
          if (w > h) { h = Math.round(h * max / w); w = max; }
          else { w = Math.round(w * max / h); h = max; }
        }
        var c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/webp", 0.82));
      };
      img.onerror = function () { reject(new Error("Bild kaputt")); };
      img.src = url;
    });
  }

  function uploadDataUrl(dataUrl, listingId) {
    return fetch("/api/upload", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dataUrl: dataUrl, listingId: listingId || "misc" })
    }).then(function (r) {
      return r.json().then(function (j) {
        if (r.status === 401) {
          var err = new Error("unauthorized");
          err.status = 401;
          throw err;
        }
        if (!r.ok) {
          var e = new Error((j && j.error) || "Upload fehlgeschlagen");
          e.status = r.status;
          throw e;
        }
        return j.url;
      });
    });
  }

  function formItem() {
    return {
      id: $("fid").value || ("o-" + Date.now()),
      title: $("title").value.trim(),
      price: $("price").value.trim(),
      area: $("area").value.trim(),
      rooms: $("rooms").value.trim(),
      place: $("place").value.trim(),
      type: $("type").value || "kauf",
      category: $("category").value.trim(),
      ref: $("ref").value.trim(),
      status: $("status").value,
      enabled: $("enabled").value === "true",
      featured: $("featured").value === "true",
      note: $("note").value.trim(),
      links: {
        is24: $("link-is24").value.trim(),
        immowelt: $("link-immowelt").value.trim()
      },
      images: JSON.parse($("images").value || "[]"),
      createdAt: $("createdAt").value || new Date().toISOString(),
      inquiryCount: Number($("inquiryCount").value) || 0
    };
  }

  function fill(item) {
    $("fid").value = item ? item.id : "";
    $("title").value = item ? item.title : "";
    $("price").value = item ? item.price : "";
    $("area").value = item ? item.area : "";
    $("rooms").value = item ? item.rooms : "";
    $("place").value = item ? item.place : "";
    $("type").value = item && item.type === "miete" ? "miete" : "kauf";
    $("category").value = item ? (item.category || "") : "";
    $("ref").value = item ? (item.ref || "") : "";
    $("status").value = item ? item.status : "aktiv";
    $("enabled").value = item && item.enabled === false ? "false" : "true";
    $("featured").value = item && item.featured === true ? "true" : "false";
    $("note").value = item ? item.note : "";
    $("link-is24").value = item && item.links ? (item.links.is24 || "") : "";
    $("link-immowelt").value = item && item.links ? (item.links.immowelt || "") : "";
    $("images").value = JSON.stringify(item && item.images ? item.images : []);
    $("createdAt").value = item && item.createdAt ? item.createdAt : "";
    $("inquiryCount").value = item ? String(item.inquiryCount || 0) : "0";
    $("form-title").textContent = item ? "Objekt bearbeiten" : "Neues Objekt";
    paintThumbs();
  }

  function paintThumbs() {
    var box = $("thumbs");
    box.innerHTML = "";
    var imgs = JSON.parse($("images").value || "[]");
    imgs.forEach(function (src, i) {
      var d = document.createElement("div");
      d.className = "thumb-edit";
      d.innerHTML = "<img src=\"" + src + "\" alt=\"\"><button type=\"button\" data-i=\"" + i + "\">×</button>";
      box.appendChild(d);
    });
    $("imgcount").textContent = imgs.length + " / 12";
  }

  function renderStats() {
    var list = window.RAIS_STORE.all();
    var on = list.filter(function (x) { return x.enabled !== false && x.status !== "verkauft"; }).length;
    var featured = list.filter(function (x) {
      return x.featured === true && x.enabled !== false && x.status !== "verkauft";
    }).length;
    $("stats").innerHTML =
      '<div class="stat"><span>Objekte gesamt</span><b>' + list.length + "</b></div>" +
      '<div class="stat"><span>Online sichtbar</span><b>' + on + "</b></div>" +
      '<div class="stat"><span>Auf der Startseite</span><b>' + featured + " / " + HOME_MAX + "</b></div>";

    $("feat-counter").innerHTML = "Auf der Startseite: <b>" + featured + "</b> von " + HOME_MAX;

    var tbody = $("stats-rows");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="mut">Keine Objekte.</td></tr>';
      return;
    }
    list
      .slice()
      .sort(function (a, b) { return inquiryTotal(b) - inquiryTotal(a); })
      .forEach(function (item) {
        var row = statsRow(item);
        var tr = document.createElement("tr");
        tr.innerHTML =
          '<td class="title-cell"><strong>' + esc(row.title) + "</strong><br><span class=\"mut\">" + esc(row.id) + "</span></td>" +
          "<td>" + esc(row.place) + "</td>" +
          "<td>" + esc(row.status) + "</td>" +
          "<td>" + esc(row.enabled) + "</td>" +
          "<td>" + esc(row.featured) + "</td>" +
          '<td class="num"><strong>' + row.inquiryTotal + "</strong>" +
            '<br><span class="mut">' + row.inquiryBase + " + " + row.inquiryLocal + "</span></td>" +
          "<td>" + esc(row.createdAtDe) + "</td>" +
          '<td><button type="button" class="ghost sm" data-csv="' + esc(item.id) + '">CSV</button></td>';
        tbody.appendChild(tr);
      });
  }

  function renderList() {
    var box = $("rows");
    box.innerHTML = "";
    var list = window.RAIS_STORE.all();
    var featuredCount = list.filter(function (x) {
      return x.featured === true && x.enabled !== false && x.status !== "verkauft";
    }).length;
    if (!list.length) {
      box.innerHTML = '<p class="empty">Noch keine Objekte. Rechts ein neues anlegen.</p>';
      return;
    }
    list.forEach(function (item) {
      var img = (item.images && item.images[0]) || "";
      var on = item.enabled !== false;
      var feat = item.featured === true;
      var parts = inquiryParts(item);
      var featDisabled = !feat && (featuredCount >= HOME_MAX || !on);
      var row = document.createElement("div");
      row.className = "listing";
      row.draggable = true;
      row.dataset.id = item.id;
      row.innerHTML =
        '<div class="handle" title="Ziehen">⋮⋮</div>' +
        '<div class="thumb">' + (img ? '<img src="' + img + '" alt="">' : "") + "</div>" +
        '<div class="meta">' +
          "<strong>" + esc(item.title || "Ohne Titel") + "</strong>" +
          "<p>" + esc([item.type === "miete" ? "Miete" : "Kauf", item.place, item.area ? item.area + " m²" : "", item.rooms ? item.rooms + " Zi." : "", item.price].filter(Boolean).join(" · ")) + "</p>" +
          (item.note ? "<p>" + esc(item.note.slice(0, 110)) + (item.note.length > 110 ? "…" : "") + "</p>" : "") +
          '<div class="chips">' +
            '<span class="chip ' + (on ? "on" : "off") + '">' + (on ? "Sichtbar" : "Verborgen") + "</span>" +
            (feat ? '<span class="chip feat">Startseite</span>' : "") +
            '<span class="chip">' + esc(item.status === "verkauft" ? "verkauft" : "verfügbar") + "</span>" +
            '<span class="chip">' + parts.total + " Anfragen</span>" +
          "</div>" +
        "</div>" +
        '<div class="actions">' +
          '<label class="switch"><input type="checkbox" data-toggle="' + esc(item.id) + '"' + (on ? " checked" : "") + "> Auf Website zeigen</label>" +
          '<label class="switch"><input type="checkbox" data-featured="' + esc(item.id) + '"' +
            (feat ? " checked" : "") + (featDisabled ? " disabled" : "") + "> Auf Startseite</label>" +
          '<button type="button" class="ghost sm" data-edit="' + esc(item.id) + '">Bearbeiten</button>' +
          '<button type="button" class="ghost sm" data-csv="' + esc(item.id) + '">CSV</button>' +
          '<button type="button" class="danger sm" data-del="' + esc(item.id) + '">Löschen</button>' +
        "</div>";
      box.appendChild(row);
    });
  }

  function bindDnD() {
    var box = $("rows");
    box.addEventListener("dragstart", function (e) {
      var row = e.target.closest(".listing");
      if (!row) return;
      dragId = row.dataset.id;
      row.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", dragId);
    });
    box.addEventListener("dragend", function (e) {
      var row = e.target.closest(".listing");
      if (row) row.classList.remove("dragging");
      Array.prototype.forEach.call(box.querySelectorAll(".listing"), function (el) {
        el.classList.remove("drag-over");
      });
      dragId = null;
    });
    box.addEventListener("dragover", function (e) {
      e.preventDefault();
      var row = e.target.closest(".listing");
      Array.prototype.forEach.call(box.querySelectorAll(".listing"), function (el) {
        el.classList.toggle("drag-over", row && el === row && el.dataset.id !== dragId);
      });
    });
    box.addEventListener("drop", function (e) {
      e.preventDefault();
      var target = e.target.closest(".listing");
      if (!dragId || !target || target.dataset.id === dragId) return;
      var ids = window.RAIS_STORE.all().map(function (x) { return x.id; });
      var from = ids.indexOf(dragId);
      var to = ids.indexOf(target.dataset.id);
      if (from < 0 || to < 0) return;
      ids.splice(from, 1);
      ids.splice(to, 0, dragId);
      afterSave(window.RAIS_STORE.reorder(ids), "Reihenfolge live.");
    });
  }

  $("go").addEventListener("click", gate);
  $("pw").addEventListener("keydown", function (e) { if (e.key === "Enter") gate(); });
  $("out").addEventListener("click", function () {
    fetch("/api/admin-logout", { method: "POST", credentials: "same-origin" }).finally(function () {
      $("app").hidden = true;
      $("gate").hidden = false;
      $("out").hidden = true;
    });
  });

  $("files").addEventListener("change", function (e) {
    var files = Array.prototype.slice.call(e.target.files || []);
    var have = JSON.parse($("images").value || "[]");
    var room = 12 - have.length;
    if (room <= 0) return;
    var listingId = $("fid").value || ("new-" + Date.now());
    msg("Bilder werden hochgeladen …");
    Promise.all(files.slice(0, room).map(compress))
      .then(function (dataUrls) {
        return dataUrls.reduce(function (chain, dataUrl) {
          return chain.then(function (urls) {
            return uploadDataUrl(dataUrl, listingId).then(function (url) {
              urls.push(url);
              return urls;
            });
          });
        }, Promise.resolve([]));
      })
      .then(function (urls) {
        $("images").value = JSON.stringify(have.concat(urls));
        paintThumbs();
        msg(urls.length + " Bild(er) hochgeladen.");
      })
      .catch(function (err) {
        if (handleAuthError(err)) return;
        msg(err.message || "Upload fehlgeschlagen", true);
      });
    e.target.value = "";
  });

  $("thumbs").addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn) return;
    var imgs = JSON.parse($("images").value || "[]");
    imgs.splice(Number(btn.getAttribute("data-i")), 1);
    $("images").value = JSON.stringify(imgs);
    paintThumbs();
  });

  $("save").addEventListener("click", function () {
    var item = formItem();
    if (!item.title) { msg("Titel fehlt.", true); return; }
    if (item.featured && item.enabled === false) {
      item.featured = false;
      $("featured").value = "false";
    }
    var others = window.RAIS_STORE.all().filter(function (x) {
      return x.id !== item.id && x.featured === true && x.enabled !== false && x.status !== "verkauft";
    }).length;
    if (item.featured && others >= HOME_MAX) {
      msg("Startseite ist voll (max. " + HOME_MAX + "). Ein anderes Objekt abwählen.", true);
      return;
    }
    afterSave(
      window.RAIS_STORE.upsert(item).then(function () {
        fill(null);
      }),
      "Gespeichert — sofort live."
    );
  });

  $("reset").addEventListener("click", function () {
    fill(null);
    msg("");
  });

  function onCsvClick(e) {
    var id = e.target.getAttribute("data-csv");
    if (id) exportObjectCsv(id);
  }

  $("stats-rows").addEventListener("click", onCsvClick);

  $("rows").addEventListener("click", function (e) {
    var ed = e.target.getAttribute("data-edit");
    var del = e.target.getAttribute("data-del");
    var csv = e.target.getAttribute("data-csv");
    if (csv) {
      exportObjectCsv(csv);
      return;
    }
    if (ed) {
      fill(window.RAIS_STORE.get(ed));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (del && confirm("Objekt löschen?")) {
      afterSave(
        window.RAIS_STORE.remove(del).then(function () {
          if ($("fid").value === del) fill(null);
        }),
        "Gelöscht — sofort live."
      );
    }
  });

  $("csv-all").addEventListener("click", function () {
    var rows = window.RAIS_STORE.all().map(statsRow);
    var stamp = new Date().toISOString().slice(0, 10);
    downloadCsv("stats-alle-objekte-" + stamp + ".csv", rows);
  });

  $("rows").addEventListener("change", function (e) {
    var idToggle = e.target.getAttribute("data-toggle");
    var idFeat = e.target.getAttribute("data-featured");
    if (idToggle) {
    afterSave(
      window.RAIS_STORE.setEnabled(idToggle, e.target.checked),
      e.target.checked ? "Jetzt auf der Website sichtbar." : "Von der Website genommen."
    );
      return;
    }
    if (idFeat) {
      afterSave(
        window.RAIS_STORE.setFeatured(idFeat, e.target.checked),
        e.target.checked ? "Erscheint auf der Startseite." : "Von der Startseite entfernt."
      );
    }
  });

  $("sync").addEventListener("click", function () {
    window.RAIS_STORE.reload()
      .then(function (list) {
        fill(null);
        renderStats();
        renderList();
        msg(list.length + " Objekte neu geladen.");
      })
      .catch(function (err) {
        if (handleAuthError(err)) return;
        msg(err.message || "Neu laden fehlgeschlagen", true);
      });
  });

  $("dl").addEventListener("click", function () {
    var blob = new Blob([window.RAIS_STORE.exportJson()], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "listings-backup.json";
    a.click();
  });

  bindDnD();

  fetch("/api/admin-check", { credentials: "same-origin" })
    .then(function (r) { if (r.ok) showApp(); })
    .catch(function () {});
})();
