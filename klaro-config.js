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
        description: 'Wir speichern nur technisch notwendige Einstellungen für den Betrieb der Website. Sie können Ihre Auswahl jederzeit im Footer anpassen.',
        learnMore: 'Einstellungen anpassen',
        acceptAll: 'Verstanden',
        acceptSelected: 'Auswahl speichern',
        decline: 'Schließen'
      },
      purposes: {
        necessary: 'Technisch notwendig'
      },
      necessary: {
        description: 'Technisch erforderliche Funktionen für den Betrieb der Website (z. B. lokale Inserate-Speicherung, Admin-Sitzung, Speicherung Ihrer Consent-Auswahl).'
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
    }
  ]
};
