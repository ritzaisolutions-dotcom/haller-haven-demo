(function () {
  var BASE = (function () {
    try {
      if (location.origin && /^https?:/.test(location.origin)) return location.origin.replace(/\/$/, "");
    } catch (e) {}
    return (window.RAIS_SITE_BASE || "https://haller-haven-demo.vercel.app").replace(/\/$/, "");
  })();
  var OG_DEFAULT = BASE + "/assets/stock/interior.jpg";
  var LOGO = BASE + "/assets/brand/logo_240.png";

  function schemaLocal() {
    return {
      "@context": "https://schema.org",
      "@type": "RealEstateAgent",
      "@id": BASE + "/#organization",
      name: "Haller Immobilienberatung GmbH",
      alternateName: "Haller Immobilien Andernach",
      url: BASE + "/",
      logo: LOGO,
      image: OG_DEFAULT,
      telephone: "+49263294580",
      email: "info@haller-immobilien.de",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Kirchberg 42",
        addressLocality: "Andernach",
        postalCode: "56626",
        addressRegion: "Rheinland-Pfalz",
        addressCountry: "DE"
      },
      geo: { "@type": "GeoCoordinates", latitude: 50.4392, longitude: 7.4016 },
      areaServed: [
        { "@type": "City", name: "Andernach" },
        { "@type": "City", name: "Koblenz" },
        { "@type": "City", name: "Neuwied" }
      ]
    };
  }

  function injectJsonLd(data, id) {
    if (document.getElementById(id)) return;
    var s = document.createElement("script");
    s.type = "application/ld+json";
    s.id = id;
    s.textContent = JSON.stringify(data);
    document.head.appendChild(s);
  }

  function upsertMeta(attr, key, value) {
    if (!value) return;
    var sel = attr === "property" ? 'meta[property="' + key + '"]' : 'meta[name="' + key + '"]';
    var el = document.head.querySelector(sel);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute("content", value);
  }

  function setCanonical(url) {
    var link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = url;
  }

  window.RAIS_SEO = {
    base: BASE,
    applyListing: function (item) {
      if (!item) return;
      var title = (item.title || "Objekt") + " · Haller Andernach";
      var desc = [
        item.title,
        item.place,
        item.area ? item.area + " m²" : "",
        item.rooms ? item.rooms + " Zimmer" : "",
        item.price,
        "Besichtigung bei Haller Immobilien Andernach."
      ]
        .filter(Boolean)
        .join(" · ");
      var url = BASE + "/objekt.html?id=" + encodeURIComponent(item.id || "");
      var img = (item.images && item.images[0]) || OG_DEFAULT;
      document.title = title;
      upsertMeta("name", "description", desc);
      upsertMeta("property", "og:title", title);
      upsertMeta("property", "og:description", desc);
      upsertMeta("property", "og:url", url);
      upsertMeta("property", "og:image", img);
      upsertMeta("name", "twitter:title", title);
      upsertMeta("name", "twitter:description", desc);
      upsertMeta("name", "twitter:image", img);
      setCanonical(url);
    }
  };

  var path = location.pathname + (location.search || "");
  var here = BASE + (location.pathname || "/") + (location.search || "");
  if (!/objekt\.html/i.test(location.pathname)) {
    upsertMeta("property", "og:url", here);
    upsertMeta("property", "og:image", OG_DEFAULT);
    setCanonical(BASE + (location.pathname || "/"));
  }

  if (path === "/" || /\/index\.html$/i.test(location.pathname) || /\/kontakt\.html$/i.test(location.pathname)) {
    injectJsonLd(schemaLocal(), "rais-ld-org");
  }
})();
