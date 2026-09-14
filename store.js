(function (w) {
  var KEY = w.RAIS_STORE_KEY || "rais-listings-demo";

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

  w.RAIS_STORE = {
    all: load,
    get: function (id) {
      return load().filter(function (x) { return x.id === id; })[0];
    },
    upsert: function (item) {
      var list = load();
      var i = -1;
      list.forEach(function (x, idx) { if (x.id === item.id) i = idx; });
      if (i >= 0) list[i] = item;
      else list.unshift(item);
      return save(list);
    },
    remove: function (id) {
      return save(load().filter(function (x) { return x.id !== id; }));
    },
    exportJson: function () {
      return JSON.stringify(load(), null, 2);
    }
  };
})(window);
