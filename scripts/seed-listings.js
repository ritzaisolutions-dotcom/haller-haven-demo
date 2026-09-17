#!/usr/bin/env node
/**
 * One-time seed: push listings.json into Supabase website_listings.
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment.
 *
 * Usage: node scripts/seed-listings.js
 */
const fs = require("fs");
const path = require("path");
const { replaceAll } = require("../lib/listings-repo");
const { validateList } = require("../lib/validate-list");
const { HOME_MAX } = require("../lib/constants");

async function main() {
  var seedPath = path.join(__dirname, "..", "listings.json");
  var list = JSON.parse(fs.readFileSync(seedPath, "utf8"));
  var err = validateList(list, HOME_MAX);
  if (err) {
    console.error("validate failed:", err);
    process.exit(1);
  }
  // Reset inquiry counters for a clean demo seed (localStorage fiction was never real).
  list.forEach(function (item) {
    item.inquiryCount = 0;
  });
  var count = await replaceAll(list);
  console.log("seeded", count, "listings");
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
