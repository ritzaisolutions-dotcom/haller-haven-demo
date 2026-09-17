const { rest, rpc, config } = require("./supabase");
const { rowToListing, listingToRow } = require("./listing-map");

async function listAll() {
  var rows = await rest(
    "website_listings?select=*&order=sort_order.asc,created_at.asc",
    { method: "GET" }
  );
  if (!Array.isArray(rows)) {
    var err = new Error("listings_read_failed");
    err.code = "listings_read_failed";
    throw err;
  }
  return rows.map(rowToListing);
}

async function replaceAll(list) {
  if (!config()) {
    var err = new Error("supabase_unconfigured");
    err.code = "supabase_unconfigured";
    throw err;
  }
  var rows = (list || []).map(function (item, i) {
    return listingToRow(item, i);
  });
  // Atomic replace via RPC so a failed mid-write cannot leave an empty catalogue.
  await rpc("website_listings_replace", { p_rows: rows });
  return rows.length;
}

async function recordInquiry(payload) {
  return rpc("website_inquiry_record", {
    p_listing_ids: payload.listingIds || [],
    p_intent: payload.intent || null,
    p_visitor_key: payload.visitorKey || null,
    p_page_path: payload.pagePath || null
  });
}

module.exports = { listAll, replaceAll, recordInquiry };
