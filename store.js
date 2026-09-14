(function (w) {
  var KEY = w.RAIS_STORE_KEY || "rais-listings-demo";
  var SEED_URL = "/listings.json";

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function save(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
    return list;
  }

  function normalize(item) {
    if (!item || typeof item !== "object") return item;
    if (!item.createdAt) item.createdAt = new Date().toISOString();
    if (typeof item.enabled !== "boolean") item.enabled = item.status !== "verkauft";
    if (typeof item.inquiryCount !== "number") item.inquiryCount = Number(item.inquiryCount) || 0;
    if (!Array.isArray(item.images)) item.images = [];
    return item;
  }

  w.RAIS_STORE = {
    all: function () {
      return load().map(normalize);
    },
    get: function (id) {
      return this.all().filter(function (x) { return x.id === id; })[0];
    },
    upsert: function (item) {
      item = normalize(item);
      var list = load();
      var i = -1;
      list.forEach(function (x, idx) { if (x.id === item.id) i = idx; });
      if (i >= 0) {
        if (!item.createdAt && list[i].createdAt) item.createdAt = list[i].createdAt;
        if (item.inquiryCount == null && list[i].inquiryCount != null) {
          item.inquiryCount = list[i].inquiryCount;
        }
        list[i] = item;
      } else {
        list.push(item);
      }
      return save(list.map(normalize));
    },
    remove: function (id) {
      return save(load().filter(function (x) { return x.id !== id; }));
    },
    reorder: function (orderedIds) {
      var map = {};
      load().forEach(function (x) { map[x.id] = x; });
      var next = [];
      orderedIds.forEach(function (id) {
        if (map[id]) {
          next.push(map[id]);
          delete map[id];
        }
      });
      Object.keys(map).forEach(function (id) { next.push(map[id]); });
      return save(next);
    },
    setEnabled: function (id, enabled) {
      var list = load();
      list.forEach(function (x) {
        if (x.id === id) x.enabled = !!enabled;
      });
      return save(list);
    },
    replaceAll: function (list) {
      return save((list || []).map(normalize));
    },
    exportJson: function () {
      return JSON.stringify(this.all(), null, 2);
    },
    seedFromPublic: function () {
      var self = this;
      return fetch(SEED_URL, { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (list) {
          if (!Array.isArray(list) || !list.length) return self.all();
          if (load().length) return self.all();
          return self.replaceAll(list);
        })
        .catch(function () { return self.all(); });
    }
  };
})(window);
