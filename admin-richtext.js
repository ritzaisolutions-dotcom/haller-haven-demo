/**
 * Minimal rich-text field for the admin: Fett, Kursiv, Schriftstärke, Überschrift, Liste, Link.
 * Pasting from Word / Google Docs keeps formatting (cleaned by RAIS_SANITIZE, same allowlist
 * the server enforces on save).
 *
 *   var rt = RAIS_RT.create(document.getElementById("x"), { placeholder: "…" });
 *   rt.set("<p>Hallo</p>"); rt.get();
 */
(function (w) {
  var S = w.RAIS_SANITIZE;

  function clean(html) {
    return S ? S.sanitizeHtml(html) : "";
  }

  function textToHtml(text) {
    return String(text || "")
      .split(/\n{2,}/)
      .map(function (para) {
        var esc = para.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return esc.trim() ? "<p>" + esc.replace(/\n/g, "<br>") + "</p>" : "";
      })
      .join("");
  }

  /** Older listings stored plain text — show it as paragraphs. */
  function toEditorHtml(value) {
    var v = String(value || "");
    if (!v.trim()) return "";
    return /<\/?(p|br|strong|em|h2|h3|ul|ol|li|span|a)\b/i.test(v) ? clean(v) : textToHtml(v);
  }

  var BUTTONS = [
    { cmd: "bold", label: "F", title: "Fett (Strg+B)", cls: "rt-b" },
    { cmd: "italic", label: "K", title: "Kursiv (Strg+I)", cls: "rt-i" },
    { weight: "400", label: "Normal", title: "Normale Schriftstärke" },
    { weight: "500", label: "Medium", title: "Schriftstärke Medium" },
    { weight: "600", label: "Halbfett", title: "Schriftstärke Halbfett" },
    { block: "h2", label: "H2", title: "Zwischenüberschrift" },
    { block: "h3", label: "H3", title: "Kleine Überschrift" },
    { block: "p", label: "¶", title: "Absatz" },
    { cmd: "insertUnorderedList", label: "• Liste", title: "Aufzählung" },
    { link: true, label: "Link", title: "Link einfügen" },
    { cmd: "removeFormat", label: "⌫ Format", title: "Formatierung entfernen" }
  ];

  function applyWeight(editor, weight) {
    var sel = w.getSelection();
    if (!sel || !sel.rangeCount) return;
    var range = sel.getRangeAt(0);
    if (range.collapsed || !editor.contains(range.commonAncestorContainer)) return;
    var frag = range.extractContents();
    // Drop previous weight wrappers inside the selection so weights don't stack.
    Array.prototype.forEach.call(frag.querySelectorAll("span[class^='fw-'], strong, b"), function (el) {
      while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
      el.parentNode.removeChild(el);
    });
    var node;
    if (weight === "400") {
      node = frag;
    } else {
      node = document.createElement("span");
      node.className = "fw-" + weight;
      node.appendChild(frag);
    }
    var last = node.lastChild;
    range.insertNode(node);
    sel.removeAllRanges();
    var r = document.createRange();
    if (node.nodeType === 1 && node.parentNode) r.selectNodeContents(node);
    else if (last) r.setStartAfter(last);
    sel.addRange(r);
  }

  /**
   * Insert already-sanitized HTML at the caret. Not execCommand("insertHTML"): Chrome
   * normalizes it and drops the fw-500/fw-600 weight spans.
   */
  function insertHtml(editor, html) {
    var sel = w.getSelection();
    var range;
    if (sel && sel.rangeCount && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      range = sel.getRangeAt(0);
    } else {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    }
    range.deleteContents();
    var tpl = document.createElement("template");
    tpl.innerHTML = html;
    var last = tpl.content.lastChild;
    range.insertNode(tpl.content);
    if (last && sel) {
      var after = document.createRange();
      after.setStartAfter(last);
      after.collapse(true);
      sel.removeAllRanges();
      sel.addRange(after);
    }
  }

  function create(host, opts) {
    opts = opts || {};
    host.classList.add("rt");
    host.innerHTML = "";

    var bar = document.createElement("div");
    bar.className = "rt-bar";
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", "Textformatierung");

    var editor = document.createElement("div");
    editor.className = "rt-editor prose";
    editor.contentEditable = "true";
    editor.setAttribute("role", "textbox");
    editor.setAttribute("aria-multiline", "true");
    if (opts.label) editor.setAttribute("aria-label", opts.label);
    if (opts.placeholder) editor.setAttribute("data-placeholder", opts.placeholder);
    if (opts.minHeight) editor.style.minHeight = opts.minHeight;

    BUTTONS.forEach(function (b) {
      if (opts.compact && (b.block === "h2" || b.block === "h3" || b.cmd === "insertUnorderedList")) return;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = b.label;
      btn.title = b.title;
      if (b.cls) btn.className = b.cls;
      // Keep the text selection when clicking the toolbar.
      btn.addEventListener("mousedown", function (e) {
        e.preventDefault();
      });
      btn.addEventListener("click", function () {
        editor.focus();
        if (b.cmd) document.execCommand(b.cmd, false, null);
        else if (b.block) document.execCommand("formatBlock", false, "<" + b.block + ">");
        else if (b.weight) applyWeight(editor, b.weight);
        else if (b.link) {
          var url = w.prompt("Link-Adresse (https://… oder kontakt.html):", "https://");
          if (url && S && S.safeHref(url)) document.execCommand("createLink", false, url.trim());
          else if (url) w.alert("Ungültiger Link.");
        }
        changed();
      });
      bar.appendChild(btn);
    });

    editor.addEventListener("paste", function (e) {
      var cd = e.clipboardData;
      if (!cd) return;
      e.preventDefault();
      var html = cd.getData("text/html");
      var out = html ? clean(html) : textToHtml(cd.getData("text/plain"));
      if (out) insertHtml(editor, out);
      changed();
    });

    // Plain Enter = new paragraph (not <div>).
    try {
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch (err) {}

    function changed() {
      editor.classList.toggle("is-empty", !editor.textContent.trim());
      if (opts.onChange) opts.onChange();
    }
    editor.addEventListener("input", changed);

    host.appendChild(bar);
    host.appendChild(editor);
    changed();

    return {
      el: editor,
      get: function () {
        return editor.textContent.trim() ? clean(editor.innerHTML) : "";
      },
      set: function (value) {
        editor.innerHTML = toEditorHtml(value);
        changed();
      }
    };
  }

  w.RAIS_RT = { create: create, toEditorHtml: toEditorHtml };
})(window);
