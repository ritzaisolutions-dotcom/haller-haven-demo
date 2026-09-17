var klaroConfig = {
  elementID: 'klaro',
  storageMethod: 'localStorage',
  storageName: 'klaro',
  htmlTexts: true,
  cookieExpiresAfterDays: 365,
  privacyPolicy: 'datenschutz.html',
  default: false,
  mustConsent: false,
  acceptAll: true,
  hideDeclineAll: false,
  hideLearnMore: false,
  noticeAsModal: false,
  translations: {
    de: {
      consentModal: {
        title: 'Datenschutz & Privatsphäre-Einstellungen',
        description: 'Hier können Sie einsehen und anpassen, welche Technologien und Dienste wir auf dieser Website nutzen. Ausführliche Informationen finden Sie in unserer <a href="datenschutz.html">Datenschutzerklärung</a>.',
      },
      consentNotice: {
        changeDescription: 'Es gab Änderungen seit Ihrem letzten Besuch. Bitte aktualisieren Sie Ihre Auswahl.',
        description: 'Wir nutzen Cookies und essenzielle Technologien für den Betrieb und die Verbesserung unserer Website. Sie können Ihre Einstellungen jederzeit im Footer anpassen.',
        learnMore: 'Einstellungen anpassen',
        acceptAll: 'Alle akzeptieren',
        acceptSelected: 'Auswahl speichern',
        decline: 'Nur essentielle'
      },
      purposes: {
        necessary: 'Technisch Notwendig',
        analytics: 'Statistik & Reichweite'
      },
      necessary: {
        description: 'Technisch erforderliche Funktionen für den Betrieb der Website (z. B. lokale Inserate-Speicherung, Admin-Sitzung).'
      },
      googleAnalytics: {
        description: 'Reichweitenmessung und anonymisierte Besucherstatistiken zur Optimierung des Webangebots.'
      }
    }
  },
  services: [
    {
      name: 'necessary',
      title: 'Essenzielle Funktionen (Betrieb & Sicherheit)',
      purposes: ['necessary'],
      required: true,
      default: true
    },
    {
      name: 'googleAnalytics',
      title: 'Google Analytics (Anonyme Statistik)',
      purposes: ['analytics'],
      cookies: [/^_ga/, /^_gid/, /^_gat/],
      required: false,
      default: false
    }
  ]
};
