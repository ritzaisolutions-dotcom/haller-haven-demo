(function () {
  var cfg = window.RAIS_ADMIN || {};
  var dragId = null;

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

  function inquiryTotal(item) {
    var bumps = localBumps();
    return (Number(item.inquiryCount) || 0) + (Number(bumps[item.id]) || 0);
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
    window.RAIS_STORE.seedFromPublic().then(function () {
      renderStats();
      renderList();
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

  function formItem() {
    return {
      id: $("fid").value || ("o-" + Date.now()),
      title: $("title").value.trim(),
      price: $("price").value.trim(),
      area: $("area").value.trim(),
      rooms: $("rooms").value.trim(),
      place: $("place").value.trim(),
      status: $("status").value,
      enabled: $("enabled").value === "true",
      note: $("note").value.trim(),
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
    $("status").value = item ? item.status : "aktiv";
    $("enabled").value = item && item.enabled === false ? "false" : "true";
    $("note").value = item ? item.note : "";
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
    var sold = list.filter(function (x) { return x.status === "verkauft"; }).length;
    var inquiries = list.reduce(function (n, x) { return n + inquiryTotal(x); }, 0);
    $("stats").innerHTML =
      '<div class="stat"><span>Inserate</span><b>' + list.length + "</b></div>" +
      '<div class="stat"><span>Online</span><b>' + on + "</b></div>" +
      '<div class="stat"><span>Anfragen</span><b>' + inquiries + "</b></div>" +
      '<div class="stat"><span>Verkauft</span><b>' + sold + "</b></div>";
  }

  function renderList() {
    var box = $("rows");
    box.innerHTML = "";
    var list = window.RAIS_STORE.all();
    if (!list.length) {
      box.innerHTML = '<p class="empty">Noch keine Objekte. Rechts anlegen oder Live-Seed laden.</p>';
      return;
    }
    list.forEach(function (item) {
      var img = (item.images && item.images[0]) || "";
      var on = item.enabled !== false;
      var row = document.createElement("div");
      row.className = "listing";
      row.draggable = true;
      row.dataset.id = item.id;
      row.innerHTML =
        '<div class="handle" title="Ziehen">⋮⋮</div>' +
        '<div class="thumb">' + (img ? '<img src="' + img + '" alt="">' : "") + "</div>" +
        '<div class="meta">' +
          "<strong>" + esc(item.title || "Ohne Titel") + "</strong>" +
          "<p>" + esc([item.place, item.area ? item.area + " m²" : "", item.rooms ? item.rooms + " Zi." : "", item.price].filter(Boolean).join(" · ")) + "</p>" +
          (item.note ? "<p>" + esc(item.note.slice(0, 110)) + (item.note.length > 110 ? "…" : "") + "</p>" : "") +
          '<div class="chips">' +
            '<span class="chip ' + (on ? "on" : "off") + '">' + (on ? "angeschaltet" : "aus") + "</span>" +
            '<span class="chip">' + esc(item.status || "aktiv") + "</span>" +
            '<span class="chip">' + inquiryTotal(item) + " Anfragen</span>" +
            '<span class="chip">seit ' + fmtDate(item.createdAt) + "</span>" +
          "</div>" +
        "</div>" +
        '<div class="actions">' +
          '<label class="switch"><input type="checkbox" data-toggle="' + esc(item.id) + '"' + (on ? " checked" : "") + "> Online</label>" +
          '<button type="button" class="ghost sm" data-edit="' + esc(item.id) + '">Details</button>' +
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
      window.RAIS_STORE.reorder(ids);
      renderStats();
      renderList();
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
    Promise.all(files.slice(0, room).map(compress)).then(function (urls) {
      $("images").value = JSON.stringify(have.concat(urls));
      paintThumbs();
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
    if (!item.title) { $("form-msg").textContent = "Titel fehlt."; return; }
    window.RAIS_STORE.upsert(item);
    $("form-msg").textContent = "Gespeichert. Für die öffentliche Seite: JSON exportieren.";
    fill(null);
    renderStats();
    renderList();
  });

  $("reset").addEventListener("click", function () {
    fill(null);
    $("form-msg").textContent = "";
  });

  $("rows").addEventListener("click", function (e) {
    var ed = e.target.getAttribute("data-edit");
    var del = e.target.getAttribute("data-del");
    if (ed) {
      fill(window.RAIS_STORE.get(ed));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (del && confirm("Objekt löschen?")) {
      window.RAIS_STORE.remove(del);
      if ($("fid").value === del) fill(null);
      renderStats();
      renderList();
    }
  });

  $("rows").addEventListener("change", function (e) {
    var id = e.target.getAttribute("data-toggle");
    if (!id) return;
    window.RAIS_STORE.setEnabled(id, e.target.checked);
    renderStats();
    renderList();
  });

  $("sync").addEventListener("click", function () {
    fetch("/listings.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (list) {
        if (!Array.isArray(list) || !list.length) {
          $("form-msg").textContent = "Live-JSON leer oder nicht erreichbar.";
          return;
        }
        window.RAIS_STORE.replaceAll(list);
        fill(null);
        renderStats();
        renderList();
        $("form-msg").textContent = list.length + " Objekte aus listings.json geladen.";
      })
      .catch(function () {
        $("form-msg").textContent = "Live-JSON konnte nicht geladen werden.";
      });
  });

  $("dl").addEventListener("click", function () {
    var blob = new Blob([window.RAIS_STORE.exportJson()], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "listings.json";
    a.click();
  });

  bindDnD();

  fetch("/api/admin-check", { credentials: "same-origin" })
    .then(function (r) { if (r.ok) showApp(); })
    .catch(function () {});
})();
