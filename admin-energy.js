(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function extraFromDom() {
    return {
      description: ($("description") && $("description").value.trim()) || "",
      yearBuilt: ($("yearBuilt") && $("yearBuilt").value.trim()) || "",
      energyType: ($("energyType") && $("energyType").value) || "",
      energyValue: ($("energyValue") && $("energyValue").value.trim()) || "",
      heating: ($("heating") && $("heating").value.trim()) || "",
      marketedDays: ($("marketedDays") && $("marketedDays").value.trim()) || ""
    };
  }

  function extraToDom(item) {
    if ($("description")) $("description").value = (item && item.description) || "";
    if ($("yearBuilt")) $("yearBuilt").value = (item && item.yearBuilt) || "";
    if ($("energyType")) $("energyType").value = (item && item.energyType) || "";
    if ($("energyValue")) $("energyValue").value = (item && item.energyValue) || "";
    if ($("heating")) $("heating").value = (item && item.heating) || "";
    if ($("marketedDays")) $("marketedDays").value = item && item.marketedDays != null ? String(item.marketedDays) : "";
  }

  function hookStore() {
    if (!window.RAIS_STORE || window.RAIS_STORE.__energyHook) return;
    var upsert = window.RAIS_STORE.upsert.bind(window.RAIS_STORE);
    window.RAIS_STORE.upsert = function (item) {
      var extra = extraFromDom();
      Object.keys(extra).forEach(function (k) {
        item[k] = extra[k];
      });
      return upsert(item);
    };
    window.RAIS_STORE.__energyHook = true;
  }

  hookStore();
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
    if (t.id === "add-listing") {
      setTimeout(function () {
        extraToDom(null);
      }, 0);
    }
  });
})();
