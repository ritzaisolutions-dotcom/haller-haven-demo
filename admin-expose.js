/**
 * Exposé extras in the listing editor: formatted description, Provision,
 * Grundrisse (PDF/Bild, max. 6) and Energieausweis-PDF. Hooks RAIS_STORE.upsert like admin-energy.js.
 */
(function () {
  var MAX_FLOORPLANS = 6;
  var state = { floorplans: [], energyPdf: null };
  var rt = null;

  function $(id) {
    return document.getElementById(id);
  }

  function msg(text, isErr) {
    var el = $("form-msg");
    if (!el) return;
    el.textContent = text || "";
    el.classList.toggle("is-err", !!isErr);
  }

  function listingId() {
    return ($("fid") && $("fid").value) || "new-" + Date.now();
  }

  function docRow(doc, i, kind) {
    var row = document.createElement("div");
    row.className = "doc-row";
    var a = document.createElement("a");
    a.href = doc.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = /\.pdf($|\?)/i.test(doc.url) ? "PDF" : "Bild";
    a.className = "doc-kind";
    var name = document.createElement("input");
    name.value = doc.name || "";
    name.placeholder = kind === "fp" ? "z. B. Erdgeschoss" : "Energieausweis";
    name.setAttribute("aria-label", "Bezeichnung");
    name.addEventListener("input", function () {
      if (kind === "fp") state.floorplans[i].name = name.value;
      else state.energyPdf.name = name.value;
    });
    var del = document.createElement("button");
    del.type = "button";
    del.className = "ghost sm";
    del.textContent = "Entfernen";
    del.addEventListener("click", function () {
      if (kind === "fp") state.floorplans.splice(i, 1);
      else state.energyPdf = null;
      paint();
    });
    row.appendChild(a);
    row.appendChild(name);
    row.appendChild(del);
    return row;
  }

  function paint() {
    var fp = $("floorplans");
    var ep = $("energy-pdf");
    if (!fp || !ep) return;
    fp.innerHTML = "";
    state.floorplans.forEach(function (d, i) {
      fp.appendChild(docRow(d, i, "fp"));
    });
    $("fpcount").textContent = state.floorplans.length + " / " + MAX_FLOORPLANS;
    ep.innerHTML = "";
    if (state.energyPdf) ep.appendChild(docRow(state.energyPdf, 0, "ep"));
    $("energy-pick").hidden = !!state.energyPdf;
  }

  function onUploadError(err) {
    if (err && err.status === 401) {
      msg("Sitzung abgelaufen. Bitte neu anmelden.", true);
      return;
    }
    msg((err && err.message) || "Upload fehlgeschlagen", true);
  }

  function addFloorplans(files) {
    files = Array.prototype.slice.call(files || []);
    var room = MAX_FLOORPLANS - state.floorplans.length;
    if (room <= 0) {
      msg("Maximal " + MAX_FLOORPLANS + " Grundrisse.", true);
      return;
    }
    var id = listingId();
    msg("Grundrisse werden hochgeladen …");
    files
      .slice(0, room)
      .reduce(function (chain, f) {
        return chain.then(function () {
          return window.RAIS_UPLOAD.doc(f, { listingId: id }).then(function (d) {
            state.floorplans.push(d);
            paint();
          });
        });
      }, Promise.resolve())
      .then(function () {
        msg("Grundriss hochgeladen. Speichern nicht vergessen.");
      })
      .catch(onUploadError);
  }

  function addEnergyPdf(file) {
    if (!file) return;
    msg("Energieausweis wird hochgeladen …");
    window.RAIS_UPLOAD.pdf(file, { listingId: listingId() })
      .then(function (d) {
        state.energyPdf = d;
        paint();
        msg("Energieausweis hochgeladen. Speichern nicht vergessen.");
      })
      .catch(onUploadError);
  }

  function extraFromDom() {
    return {
      description: rt ? rt.get() : "",
      provision: ($("provision") && $("provision").value.trim()) || "",
      floorplans: state.floorplans
        .filter(function (d) {
          return d && d.url;
        })
        .map(function (d) {
          return { url: d.url, name: String(d.name || "").trim() };
        }),
      energyPdf: state.energyPdf ? { url: state.energyPdf.url, name: String(state.energyPdf.name || "").trim() } : null
    };
  }

  function extraToDom(item) {
    if (rt) rt.set((item && item.description) || "");
    if ($("provision")) $("provision").value = (item && item.provision) || "";
    state.floorplans = item && Array.isArray(item.floorplans) ? item.floorplans.map(function (d) {
      return { url: d.url, name: d.name || "" };
    }) : [];
    state.energyPdf = item && item.energyPdf ? { url: item.energyPdf.url, name: item.energyPdf.name || "" } : null;
    paint();
  }

  function hookStore() {
    if (!window.RAIS_STORE || window.RAIS_STORE.__exposeHook) return;
    var upsert = window.RAIS_STORE.upsert.bind(window.RAIS_STORE);
    window.RAIS_STORE.upsert = function (item) {
      var extra = extraFromDom();
      Object.keys(extra).forEach(function (k) {
        item[k] = extra[k];
      });
      return upsert(item);
    };
    window.RAIS_STORE.__exposeHook = true;
  }

  function init() {
    var host = $("description-rt");
    if (host && window.RAIS_RT) {
      rt = window.RAIS_RT.create(host, {
        label: "Beschreibung (Exposé)",
        placeholder: "Lage, Schnitt, Ausstattung … — Text aus Word oder Google Docs einfach einfügen, die Formatierung bleibt.",
        minHeight: "180px"
      });
    }
    var fpInput = $("fp-files");
    if (fpInput) {
      fpInput.addEventListener("change", function (e) {
        addFloorplans(e.target.files);
        e.target.value = "";
      });
    }
    var epInput = $("energy-file");
    if (epInput) {
      epInput.addEventListener("change", function (e) {
        addEnergyPdf(e.target.files && e.target.files[0]);
        e.target.value = "";
      });
    }
    paint();
    hookStore();
  }

  init();
  document.addEventListener("click", function (e) {
    hookStore();
    var t = e.target;
    if (!t) return;
    var ed = t.getAttribute && t.getAttribute("data-edit");
    if (ed) {
      setTimeout(function () {
        extraToDom(window.RAIS_STORE.get(ed));
      }, 0);
    }
    if (t.id === "add-listing" || t.id === "reset") {
      setTimeout(function () {
        extraToDom(null);
      }, 0);
    }
  });
})();
