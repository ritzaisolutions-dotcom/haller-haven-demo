-- Extra listing fields for exposé text, GEG energy data, sold-reference duration.
alter table if exists website_listings
  add column if not exists description text default '',
  add column if not exists year_built text default '',
  add column if not exists energy jsonb default '{}'::jsonb,
  add column if not exists marketed_days integer;

comment on column website_listings.description is 'Long exposé body shown on objekt.html';
comment on column website_listings.energy is 'GEG: {type, value, heating}';
comment on column website_listings.marketed_days is 'Days on market when status=verkauft';
