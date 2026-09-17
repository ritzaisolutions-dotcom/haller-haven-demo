try {
  window.__raisHadKlaro = !!localStorage.getItem("klaro");
} catch (e) {
  window.__raisHadKlaro = false;
}

function raisConsentVisitorKey() {
  try {
    var k = localStorage.getItem("rais-consent-vid");
    if (!k) {
      k =
        (window.crypto && crypto.randomUUID && crypto.randomUUID()) ||
        "v-" + Date.now().toString(36) + "-" + Math.random().toString(16).slice(2);
      localStorage.setItem("rais-consent-vid", k);
    }
    return k;
  } catch (err) {
    return null;
  }
}

function raisLogConsent(action) {
  var services = { necessary: true };
  try {
    var raw = localStorage.getItem("klaro");
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") services = parsed;
    }
  } catch (err) {}

  var payload = {
    action: action,
    consent_at: new Date().toISOString(),
    services: services,
    visitor_key: raisConsentVisitorKey(),
    page_path: location.pathname + location.search,
    site_host: location.host,
    user_agent: navigator.userAgent,
  };

  try {
    fetch("/api/consent-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(function () {});
  } catch (err) {}
}

var klaroConfig = {
  elementID: "klaro",
  storageMethod: "localStorage",
  storageName: "klaro",
  htmlTexts: true,
  cookieExpiresAfterDays: 365,
  privacyPolicy: "datenschutz.html",
  default: false,
  mustConsent: false,
  acceptAll: true,
  hideDeclineAll: false,
  hideLearnMore: false,
  noticeAsModal: false,
  callback: function (consent) {
    clearTimeout(window.__raisConsentT);
    window.__raisConsentT = setTimeout(function () {
      var action = "change";
      if (!window.__raisHadKlaro) {
        action = consent === false ? "decline" : "accept";
        window.__raisHadKlaro = true;
      }
      raisLogConsent(action);
    }, 250);
  },
  translations: {
    de: {
      consentModal: {
        title: "Datenschutz & Privatsphäre-Einstellungen",
        description:
          'Hier können Sie einsehen und anpassen, welche Technologien und Dienste wir auf dieser Website nutzen. Ausführliche Informationen finden Sie in unserer <a href="datenschutz.html">Datenschutzerklärung</a>.',
      },
      consentNotice: {
        changeDescription:
          "Es gab Änderungen seit Ihrem letzten Besuch. Bitte aktualisieren Sie Ihre Auswahl.",
        description:
          "Wir speichern nur technisch notwendige Einstellungen für den Betrieb der Website. Sie können Ihre Auswahl jederzeit im Footer anpassen.",
        learnMore: "Einstellungen anpassen",
        acceptAll: "Verstanden",
        acceptSelected: "Auswahl speichern",
        decline: "Schließen",
      },
      purposes: {
        necessary: "Technisch notwendig",
      },
      necessary: {
        description:
          "Technisch erforderliche Funktionen für den Betrieb der Website (z. B. lokale Inserate-Speicherung, Admin-Sitzung, Speicherung Ihrer Consent-Auswahl).",
      },
    },
  },
  services: [
    {
      name: "necessary",
      title: "Essenzielle Funktionen (Betrieb & Sicherheit)",
      purposes: ["necessary"],
      required: true,
      default: true,
    },
  ],
};
