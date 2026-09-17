(function (w) {
  var API = w.RAIS_LISTINGS_URL || "/api/listings";
  var cache = [];
  var ready = null;

  function normalize(item) {
    if (!item || typeof item !== "object") return item;
    if (!item.createdAt) item.createdAt = new Date().toISOString();
    if (typeof item.enabled !== "boolean") item.enabled = item.status !== "verkauft";
    if (typeof item.featured !== "boolean") item.featured = false;
    if (typeof item.inquiryCount !== "number") item.inquiryCount = Number(item.inquiryCount) || 0;
    if (!Array.isArray(item.images)) item.images = [];
    if (!item.links || typeof item.links !== "object") item.links = { is24: "", immowelt: "" };
    if (!item.type) item.type = "kauf";
    if (!item.category) item.category = "";
    if (!item.ref) item.ref = "";
    if (item.featured && item.enabled === false) item.featured = false;
    return item;
  }

  function cloneList(list) {
    return (list || []).map(function (x) {
      return normalize(JSON.parse(JSON.stringify(x)));
    });
  }

  function persist(list) {
    return fetch(API, {
      method: "PUT",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(list)
    }).then(function (r) {
      return r.json().then(function (j) {
        if (r.status === 401) {
          var err = new Error("unauthorized");
          err.status = 401;
          throw err;
        }
        if (!r.ok) {
          var e = new Error((j && j.error) || "Speichern fehlgeschlagen");
          e.status = r.status;
          throw e;
        }
        cache = cloneList(list);
        return cache;
      });
    });
  }

  function loadAll() {
    return fetch(API + "?all=1", { credentials: "same-origin", cache: "no-store" })
      .then(function (r) {
        if (r.status === 401) {
          var err = new Error("unauthorized");
          err.status = 401;
          throw err;
        }
        if (!r.ok) throw new Error("Laden fehlgeschlagen");
        return r.json();
      })
      .then(function (list) {
        cache = cloneList(Array.isArray(list) ? list : []);
        return cache;
      });
  }

  w.RAIS_STORE = {
    ready: function () {
      if (!ready) ready = loadAll().catch(function (e) {
        ready = null;
        throw e;
      });
      return ready;
    },
    reload: function () {
      ready = null;
      return this.ready();
    },
    all: function () {
      return cloneList(cache);
    },
    get: function (id) {
      return this.all().filter(function (x) {
        return x.id === id;
      })[0];
    },
    featuredCount: function () {
      return cache.filter(function (x) {
        return x.featured === true && x.enabled !== false && x.status !== "verkauft";
      }).length;
    },
    upsert: function (item) {
      item = normalize(item);
      var list = cloneList(cache);
      var i = -1;
      list.forEach(function (x, idx) {
        if (x.id === item.id) i = idx;
      });
      if (i >= 0) {
        if (!item.createdAt && list[i].createdAt) item.createdAt = list[i].createdAt;
        if (item.inquiryCount == null && list[i].inquiryCount != null) {
          item.inquiryCount = list[i].inquiryCount;
        }
        list[i] = item;
      } else {
        list.push(item);
      }
      return persist(list);
    },
    remove: function (id) {
      return persist(
        cloneList(cache).filter(function (x) {
          return x.id !== id;
        })
      );
    },
    reorder: function (orderedIds) {
      var map = {};
      cloneList(cache).forEach(function (x) {
        map[x.id] = x;
      });
      var next = [];
      orderedIds.forEach(function (id) {
        if (map[id]) {
          next.push(map[id]);
          delete map[id];
        }
      });
      Object.keys(map).forEach(function (id) {
        next.push(map[id]);
      });
      return persist(next);
    },
    setEnabled: function (id, enabled) {
      var list = cloneList(cache);
      list.forEach(function (x) {
        if (x.id === id) {
          x.enabled = !!enabled;
          if (!x.enabled) x.featured = false;
        }
      });
      return persist(list);
    },
    setFeatured: function (id, featured) {
      var list = cloneList(cache);
      var max = Number(w.RAIS_HOME_MAX) || 6;
      var count = list.filter(function (x) {
        return x.featured === true && x.enabled !== false && x.status !== "verkauft" && x.id !== id;
      }).length;
      list.forEach(function (x) {
        if (x.id !== id) return;
        if (featured && x.enabled === false) {
          x.featured = false;
          return;
        }
        if (featured && count >= max) {
          x.featured = false;
          return;
        }
        x.featured = !!featured;
      });
      return persist(list);
    },
    replaceAll: function (list) {
      return persist(cloneList(list));
    },
    exportJson: function () {
      return JSON.stringify(this.all(), null, 2);
    },
    /** Kept for admin bootstrap: load from API (or empty). */
    seedFromPublic: function () {
      return this.ready();
    }
  };
})(window);
