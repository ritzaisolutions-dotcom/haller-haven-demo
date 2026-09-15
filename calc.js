(function () {
  var root = document.getElementById("rechner");
  if (!root) return;

  var priceEl = document.getElementById("calc-price");
  var equityEl = document.getElementById("calc-equity");
  var rateEl = document.getElementById("calc-rate");
  var amortEl = document.getElementById("calc-amort");
  var nkToggle = document.getElementById("calc-nk");
  var brokerEl = document.getElementById("calc-broker");
  var brokerWrap = document.getElementById("calc-broker-wrap");

  var outLoan = document.getElementById("calc-out-loan");
  var outNk = document.getElementById("calc-out-nk");
  var outMonth = document.getElementById("calc-out-month");
  var outTotal = document.getElementById("calc-out-total");
  var outHint = document.getElementById("calc-out-hint");

  var GRUNDERWERB_RLP = 0.05;
  var NOTAR_GRUNDBUCH = 0.02;

  function num(el) {
    if (!el) return 0;
    var v = parseFloat(String(el.value).replace(/\s/g, "").replace(",", "."));
    return isFinite(v) ? v : 0;
  }

  function euro(n) {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0
    }).format(Math.max(0, Math.round(n)));
  }

  function euroExact(n) {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2
    }).format(Math.max(0, n));
  }

  function compute() {
    var price = Math.max(0, num(priceEl));
    var equity = Math.max(0, num(equityEl));
    var interest = Math.max(0, num(rateEl));
    var amort = Math.max(0, num(amortEl));
    var broker = Math.max(0, Math.min(3.57, num(brokerEl))) / 100;
    var withNk = !nkToggle || nkToggle.checked;

    var nk = 0;
    if (withNk) {
      nk = price * (GRUNDERWERB_RLP + NOTAR_GRUNDBUCH + broker);
    }

    var total = price + nk;
    var loan = Math.max(0, total - equity);
    var monthly = loan * (interest + amort) / 100 / 12;

    if (outLoan) outLoan.textContent = euro(loan);
    if (outNk) outNk.textContent = withNk ? euro(nk) : "—";
    if (outMonth) outMonth.textContent = euroExact(monthly);
    if (outTotal) outTotal.textContent = euro(total);
    if (outHint) {
      outHint.textContent = withNk
        ? "Nebenkosten RLP: 5 % Grunderwerbsteuer + ca. 2 % Notar/Grundbuch" +
          (broker > 0 ? " + " + (broker * 100).toFixed(2).replace(".", ",") + " % Makler." : ".")
        : "Nebenkosten-Modul aus — nur Kaufpreis und Eigenkapital.";
    }
    if (brokerWrap) brokerWrap.hidden = !withNk;
  }

  [priceEl, equityEl, rateEl, amortEl, brokerEl].forEach(function (el) {
    if (!el) return;
    el.addEventListener("input", compute);
    el.addEventListener("change", compute);
  });
  if (nkToggle) nkToggle.addEventListener("change", compute);

  compute();
})();
