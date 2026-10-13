/**
 * Admin upload helpers shared by admin.js (listing photos), admin-expose.js (Grundrisse,
 * Energieausweis) and admin-site.js (Partner-Logos, Hausverwaltung-PDF).
 */
(function (w) {
  var MAX_PDF = 10 * 1024 * 1024;

  function authError(r) {
    var err = new Error("unauthorized");
    err.status = 401;
    return err;
  }

  function postJson(body) {
    return fetch("/api/upload", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.status === 401) throw authError(r);
        if (!r.ok) {
          var e = new Error((j && j.error) || "Upload fehlgeschlagen");
          e.status = r.status;
          throw e;
        }
        return j;
      });
    });
  }

  /** Resize to max 1600px and re-encode as WebP (keeps uploads under the 4 MB API limit). */
  function compress(file, max) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.type || file.type.indexOf("image") !== 0) {
        reject(new Error("kein Bild"));
        return;
      }
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        var lim = max || 1600;
        var wd = img.width;
        var h = img.height;
        if (wd > lim || h > lim) {
          if (wd > h) { h = Math.round(h * lim / wd); wd = lim; }
          else { wd = Math.round(wd * lim / h); h = lim; }
        }
        var c = document.createElement("canvas");
        c.width = wd;
        c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, wd, h);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/webp", 0.82));
      };
      img.onerror = function () { reject(new Error("Bild kaputt")); };
      img.src = url;
    });
  }

  function uploadDataUrl(dataUrl, opts) {
    opts = opts || {};
    return postJson({ dataUrl: dataUrl, listingId: opts.listingId || "misc", scope: opts.scope || "" }).then(function (j) {
      return j.url;
    });
  }

  function image(file, opts) {
    opts = opts || {};
    return compress(file, opts.max).then(function (dataUrl) {
      return uploadDataUrl(dataUrl, opts);
    });
  }

  /** PDF → signed URL → direct PUT to Supabase Storage. Resolves { url, name }. */
  function pdf(file, opts) {
    opts = opts || {};
    if (!file || (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name || ""))) {
      return Promise.reject(new Error("Bitte eine PDF-Datei wählen."));
    }
    if (file.size > MAX_PDF) return Promise.reject(new Error("PDF zu groß (max. 10 MB)."));
    return postJson({
      kind: "pdf",
      name: file.name,
      size: file.size,
      listingId: opts.listingId || "misc",
      scope: opts.scope || ""
    }).then(function (j) {
      return fetch(j.uploadUrl, {
        method: "PUT",
        headers: { "content-type": "application/pdf", "x-upsert": "false" },
        body: file
      }).then(function (r) {
        if (!r.ok) throw new Error("PDF-Upload fehlgeschlagen (" + r.status + ")");
        return { url: j.url, name: (file.name || "Dokument.pdf").replace(/\.pdf$/i, "") };
      });
    });
  }

  /** Grundriss may be a PDF or an image. */
  function doc(file, opts) {
    if (file && file.type && file.type.indexOf("image") === 0) {
      return image(file, opts).then(function (url) {
        return { url: url, name: (file.name || "Grundriss").replace(/\.[a-z0-9]+$/i, "") };
      });
    }
    return pdf(file, opts);
  }

  w.RAIS_UPLOAD = { compress: compress, uploadDataUrl: uploadDataUrl, image: image, pdf: pdf, doc: doc };
})(window);
