/**
 * Listing visibility and public projection helpers.
 */

function isPublicListing(item) {
  if (!item || typeof item !== "object") return false;
  if (item.enabled === false) return false;
  if (item.status === "verkauft") return false;
  return true;
}

function displayTitle(raw) {
  var t = String(raw || "").replace(/\s+/g, " ").trim();
  if (!t) return "Objekt";
  t = t.replace(/\b(KAPITALANLAGE|BALKON|EINBAUKÜCHE|EINBAUKUECHE|TERRASSE|GARTEN|GARAGE|EIGENTUM)\b/gi, function (m) {
    return m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
  });
  t = t.replace(/[–—]/g, "—");
  if (t.length > 68) {
    var cut = t.slice(0, 68);
    var sp = cut.lastIndexOf(" ");
    t = (sp > 40 ? cut.slice(0, sp) : cut).replace(/[.,;:–—-]+\s*$/, "") + "…";
  }
  return t;
}

function publicize(list) {
  return (list || []).filter(isPublicListing).map(function (x) {
    return {
      id: x.id,
      title: x.title,
      display_title: displayTitle(x.title),
      price: x.price,
      area: x.area,
      rooms: x.rooms,
      place: x.place,
      type: x.type,
      category: x.category,
      ref: x.ref,
      status: x.status,
      enabled: true,
      featured: !!x.featured,
      note: x.note || "",
      description: x.description || "",
      yearBuilt: x.yearBuilt || "",
      energyType: x.energyType || "",
      energyValue: x.energyValue || "",
      heating: x.heating || "",
      images: Array.isArray(x.images) ? x.images.slice() : [],
      links: {
        is24: (x.links && x.links.is24) || "",
        immowelt: (x.links && x.links.immowelt) || ""
      },
      createdAt: x.createdAt || null
    };
  });
}

function soldRefs(list) {
  return (list || [])
    .filter(function (x) {
      return x && x.status === "verkauft" && x.enabled !== false;
    })
    .map(function (x) {
      return {
        id: x.id,
        title: displayTitle(x.title || ""),
        place: x.place || "",
        type: x.type || "kauf",
        category: x.category || "",
        marketedDays: x.marketedDays || "",
        images: Array.isArray(x.images) ? x.images.slice(0, 1) : []
      };
    });
}

function featuredHome(list, homeMax) {
  var max = Number(homeMax) || 4;
  var live = (list || []).filter(isPublicListing);
  var featured = live.filter(function (x) {
    return x.featured === true;
  });
  if (featured.length) return featured.slice(0, max);
  return live.slice(0, max);
}

module.exports = { isPublicListing, publicize, featuredHome, soldRefs, displayTitle };
