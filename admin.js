(function () {
  var cfg = window.RAIS_ADMIN || {};

  function $(id) { return document.getElementById(id); }

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
    renderList();
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
      note: $("note").value.trim(),
      images: JSON.parse($("images").value || "[]")
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
    $("note").value = item ? item.note : "";
    $("images").value = JSON.stringify(item && item.images ? item.images : []);
    paintThumbs();
  }

  function paintThumbs() {
    var box = $("thumbs");
    box.innerHTML = "";
    var imgs = JSON.parse($("images").value || "[]");
    imgs.forEach(function (src, i) {
      var d = document.createElement("div");
      d.className = "thumb";
      d.innerHTML = "<img src=\"" + src + "\" alt=\"\"><button type=\"button\" data-i=\"" + i + "\">×</button>";
      box.appendChild(d);
    });
    $("imgcount").textContent = imgs.length + " / 12";
  }

  function renderList() {
    var box = $("rows");
    box.innerHTML = "";
    window.RAIS_STORE.all().forEach(function (item) {
      var row = document.createElement("div");
      row.className = "row";
      row.innerHTML =
        "<div><strong>" + (item.title || "Ohne Titel") + "</strong><span>" + (item.place || "") + " · " + (item.status || "") + "</span></div>" +
        "<div><button type=\"button\" data-edit=\"" + item.id + "\">Bearbeiten</button>" +
        "<button type=\"button\" class=\"danger\" data-del=\"" + item.id + "\">Löschen</button></div>";
      box.appendChild(row);
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
    var jobs = files.slice(0, room).map(compress);
    Promise.all(jobs).then(function (urls) {
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
    $("form-msg").textContent = "Gespeichert in diesem Browser. Für die öffentliche Seite: JSON exportieren.";
    fill(null);
    renderList();
  });

  $("reset").addEventListener("click", function () { fill(null); $("form-msg").textContent = ""; });

  $("rows").addEventListener("click", function (e) {
    var ed = e.target.getAttribute("data-edit");
    var del = e.target.getAttribute("data-del");
    if (ed) fill(window.RAIS_STORE.get(ed));
    if (del) {
      window.RAIS_STORE.remove(del);
      renderList();
    }
  });

  $("dl").addEventListener("click", function () {
    var blob = new Blob([window.RAIS_STORE.exportJson()], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "listings.json";
    a.click();
  });

  fetch("/api/admin-check", { credentials: "same-origin" })
    .then(function (r) { if (r.ok) showApp(); })
    .catch(function () {});
})();
