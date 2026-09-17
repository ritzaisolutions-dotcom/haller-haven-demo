/**
 * Listing visibility and public projection helpers.
 * One predicate used by API GET, catalogue, and detail pages.
 */

function isPublicListing(item) {
  if (!item || typeof item !== "object") return false;
  if (item.enabled === false) return false;
  if (item.status === "verkauft") return false;
  return true;
}

function publicize(list) {
  return (list || []).filter(isPublicListing).map(function (x) {
    return {
      id: x.id,
      title: x.title,
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
      images: Array.isArray(x.images) ? x.images.slice() : [],
      links: {
        is24: (x.links && x.links.is24) || "",
        immowelt: (x.links && x.links.immowelt) || ""
      },
      createdAt: x.createdAt || null
    };
  });
}

function featuredHome(list, homeMax) {
  var max = Number(homeMax) || 6;
  var live = (list || []).filter(isPublicListing);
  var featured = live.filter(function (x) {
    return x.featured === true;
  });
  if (featured.length) return featured.slice(0, max);
  return live.slice(0, max);
}

module.exports = { isPublicListing, publicize, featuredHome };
