(function () {
  var BASE = "https://haller-haven-demo.vercel.app";
  var LOGO = "https://haller-immobilien.de/wp-content/uploads/2024/06/logo_240.png";
  var OG_DEFAULT = "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80";

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
      geo: {
        "@type": "GeoCoordinates",
        latitude: 50.4392,
        longitude: 7.4016
      },
      areaServed: [
        { "@type": "City", name: "Andernach" },
        { "@type": "City", name: "Koblenz" },
        { "@type": "City", name: "Neuwied" },
        { "@type": "AdministrativeArea", name: "Mayen-Koblenz" }
      ],
      priceRange: "$$",
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          opens: "09:00",
          closes: "17:00"
        }
      ],
      sameAs: ["https://haller-immobilien.de/"]
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
    var sel = attr === "property"
      ? 'meta[property="' + key + '"]'
      : 'meta[name="' + key + '"]';
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
        "Besichtigungstermin bei Haller Immobilien Andernach anfragen."
      ].filter(Boolean).join(" · ");
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

      injectJsonLd({
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        name: item.title || "Objekt",
        description: item.note || desc,
        url: url,
        image: item.images || [img],
        datePosted: item.createdAt || undefined,
        offers: item.price ? {
          "@type": "Offer",
          priceCurrency: "EUR",
          price: String(item.price).replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", ".") || undefined,
          availability: item.status === "verkauft"
            ? "https://schema.org/SoldOut"
            : "https://schema.org/InStock"
        } : undefined,
        address: {
          "@type": "PostalAddress",
          addressLocality: item.place || "Andernach",
          addressRegion: "Rheinland-Pfalz",
          addressCountry: "DE"
        },
        floorSize: item.area ? {
          "@type": "QuantitativeValue",
          value: Number(item.area) || undefined,
          unitCode: "MTK"
        } : undefined,
        numberOfRooms: item.rooms ? Number(item.rooms) || undefined : undefined,
        seller: { "@id": BASE + "/#organization" }
      }, "rais-ld-listing");
    }
  };

  var path = (location.pathname || "/").replace(/\\/g, "/");
  if (path === "/" || /\/index\.html$/i.test(path) || /\/kontakt\.html$/i.test(path)) {
    injectJsonLd(schemaLocal(), "rais-ld-org");
  }
})();
