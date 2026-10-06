/**
 * Map between API listing objects and website_listings rows.
 */

function energyFrom(row) {
  var e = (row && row.energy) || {};
  var links = (row && row.links) || {};
  if (typeof e === "string") {
    try {
      e = JSON.parse(e);
    } catch (err) {
      e = {};
    }
  }
  return {
    type: (e && e.type) || row.energy_type || links.energyType || "",
    value: (e && e.value) || row.energy_value || links.energyValue || "",
    heating: (e && e.heating) || row.heating || links.heating || ""
  };
}

function rowToListing(row) {
  if (!row) return null;
  var energy = energyFrom(row);
  return {
    id: row.id,
    title: row.title || "",
    price: row.price || "",
    area: row.area || "",
    rooms: row.rooms || "",
    place: row.place || "",
    type: row.type || "kauf",
    category: row.category || "",
    ref: row.ref || "",
    status: row.status || "aktiv",
    enabled: row.enabled !== false,
    featured: row.featured === true,
    note: row.note || "",
    description: row.description || (row.links && row.links.description) || "",
    yearBuilt: row.year_built || row.yearBuilt || (row.links && row.links.yearBuilt) || "",
    energyType: energy.type,
    energyValue: energy.value,
    heating: energy.heating,
    marketedDays:
      row.marketed_days != null
        ? row.marketed_days
        : row.marketedDays || (row.links && row.links.marketedDays) || "",
    images: Array.isArray(row.images) ? row.images : [],
    links: {
      is24: (row.links && row.links.is24) || "",
      immowelt: (row.links && row.links.immowelt) || ""
    },
    createdAt: row.created_at || row.createdAt || null,
    inquiryCount: Number(row.inquiry_count) || 0,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0
  };
}

function listingToRow(item, sortOrder) {
  return {
    id: item.id,
    title: item.title || "",
    price: item.price || "",
    area: item.area || "",
    rooms: item.rooms || "",
    place: item.place || "",
    type: item.type === "miete" ? "miete" : "kauf",
    category: item.category || "",
    ref: item.ref || "",
    status: item.status === "verkauft" ? "verkauft" : "aktiv",
    enabled: item.enabled !== false,
    featured: item.featured === true,
    note: item.note || "",
    images: Array.isArray(item.images) ? item.images : [],
    links: {
      is24: (item.links && item.links.is24) || "",
      immowelt: (item.links && item.links.immowelt) || "",
      description: item.description || "",
      yearBuilt: item.yearBuilt || "",
      energyType: item.energyType || "",
      energyValue: item.energyValue || "",
      heating: item.heating || "",
      marketedDays: item.marketedDays || ""
    },
    created_at: item.createdAt || new Date().toISOString(),
    inquiry_count: Number(item.inquiryCount) || 0,
    sort_order: typeof sortOrder === "number" ? sortOrder : 0,
    updated_at: new Date().toISOString()
  };
}

module.exports = { rowToListing, listingToRow };
