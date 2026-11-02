/* ==========================================================================
   madpomo — languages (EN / pt-BR)

   The app is written in English and stays written in English: every other
   file renders the same strings it always did. This one translates what is
   already on the page, after the fact, and only when Portuguese is chosen.

   That is why nothing else had to change. A translation that needed a key at
   every string site would mean touching four HTML pages and seven scripts,
   and every new string after that would be one more chance to forget.

   How it works:
     1. the dictionary below maps English text to Portuguese
     2. `translate` walks the text nodes and swaps the ones it recognises
     3. a MutationObserver runs it again whenever the app re-renders

   What it never touches: anything you typed. Task titles, descriptions,
   subtasks and your own column names are skipped by selector, and nothing is
   translated unless it matches the dictionary exactly — so a task called
   "today" is still called "today".

   Switching language reloads the page. The DOM is only ever translated one
   way, English to Portuguese, so going back is a fresh English render rather
   than an undo that has to remember every node it changed.
   ========================================================================== */

window.MP = window.MP || {};

MP.i18n = (function () {
  const DEFAULT = "EN";

  /* Anything you wrote. Never translated, whatever it says. */
  const USER_CONTENT = [
    "input",
    "textarea",
    ".task__head-label",
    ".task__notes",
    ".checklist__item-label",
    "[data-no-i18n]"
  ].join(", ");

  /* The words live in i18n-data.js, which the React build imports too: one
     file to correct when a translation reads wrong, not two. */
  const DATA = window.MP_I18N || {};
  const BUILT_IN_COLUMNS = DATA.BUILT_IN_COLUMNS || {};
  const WEEKDAYS = DATA.WEEKDAYS || {};
  const MONTHS = DATA.MONTHS || {};
  const PT = DATA.PT || {};
  const PATTERNS = DATA.PATTERNS || [];
  const FRAGMENTS = DATA.FRAGMENTS || [];

  /* --------------------------------------------------------------------------
     Applying it
     -------------------------------------------------------------------------- */

  let observer = null;

  function language() {
    return MP.settings.language === "PT" ? "PT" : DEFAULT;
  }

  function lookup(text) {
    const key = text.replace(/\s+/g, " ").trim();
    if (key === "") return null;

    if (Object.prototype.hasOwnProperty.call(PT, key)) return PT[key];
    if (Object.prototype.hasOwnProperty.call(WEEKDAYS, key)) return WEEKDAYS[key];

    for (let i = 0; i < PATTERNS.length; i = i + 1) {
      const rule = PATTERNS[i];
      if (rule[0].test(key)) return key.replace(rule[0], rule[1]);
    }

    let rewritten = key;
    FRAGMENTS.forEach(function (rule) {
      rewritten = rewritten.replace(rule[0], rule[1]);
    });

    return rewritten === key ? null : rewritten;
  }

  /* A built-in column is named by the app; one you added is named by you. */
  function columnNameFor(node) {
    const title = node.parentElement;

    /* The name is a bare text node inside .column__title; the "(3)" beside it
       is a child span, so checking the direct parent keeps the count out. */
    if (!title || !title.classList.contains("column__title")) return null;

    const column = title.closest("[data-status]");
    if (!column) return null;

    const built = BUILT_IN_COLUMNS[column.dataset.status];
    return built || null;
  }

  function translateIn(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (node.data.trim() === "") return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || parent.closest(USER_CONTENT)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const changes = [];
    let node = walker.nextNode();

    while (node) {
      const column = columnNameFor(node);
      const translated = column !== null ? column : lookup(node.data);
      if (translated !== null && translated !== node.data) changes.push([node, translated]);
      node = walker.nextNode();
    }

    // written after the walk, so the tree is not edited while being read
    changes.forEach(function (change) {
      const node = change[0];
      const lead = node.data.match(/^\s*/)[0];
      const tail = node.data.match(/\s*$/)[0];
      node.data = lead + change[1] + tail;
    });

    translateAttributes(root);
  }

  const ATTRIBUTES = ["placeholder", "aria-label", "title"];

  function translateAttributes(root) {
    if (root.nodeType !== 1 && root.nodeType !== 9) return;

    const scope = root.nodeType === 9 ? root.body : root;
    if (!scope) return;

    const elements = [scope].concat(Array.prototype.slice.call(scope.querySelectorAll("*")));

    elements.forEach(function (element) {
      if (!element.closest || element.closest("[data-no-i18n]")) return;

      ATTRIBUTES.forEach(function (name) {
        const value = element.getAttribute && element.getAttribute(name);
        if (!value) return;

        const translated = lookup(value);
        if (translated !== null && translated !== value) element.setAttribute(name, translated);
      });
    });
  }

  /* The app re-renders the board on nearly every click, and each render
     writes fresh English into the DOM. The observer is what makes the
     translation survive that; it is disconnected while translating so it
     cannot watch itself work. */
  function watch() {
    if (observer) return;

    observer = new MutationObserver(function (records) {
      observer.disconnect();

      records.forEach(function (record) {
        if (record.type === "childList") {
          Array.prototype.forEach.call(record.addedNodes, function (added) {
            if (added.nodeType === 1) translateIn(added);
            if (added.nodeType === 3) {
              const translated = lookup(added.data);
              if (translated !== null) added.data = translated;
            }
          });
        } else if (record.type === "characterData") {
          const translated = lookup(record.target.data);
          if (translated !== null) record.target.data = translated;
        }
      });

      observer.observe(document.body, OPTIONS);
    });

    observer.observe(document.body, OPTIONS);
  }

  const OPTIONS = { childList: true, subtree: true, characterData: true };

  /* --------------------------------------------------------------------------
     The switch in the header
     -------------------------------------------------------------------------- */

  function render() {
    const active = language();

    document.querySelectorAll(".lang__btn").forEach(function (button) {
      button.setAttribute("aria-pressed", button.dataset.lang === active ? "true" : "false");
    });
  }

  function setLanguage(next) {
    if (next !== "PT" && next !== "EN") return;
    if (next === language()) return;

    MP.settings.language = next;
    MP.saveSettings();

    /* Reloading is the honest way back to English: the page is rebuilt from
       the English source rather than translated a second time in reverse. */
    window.location.reload();
  }

  function start() {
    document.querySelectorAll(".lang__btn").forEach(function (button) {
      button.addEventListener("click", function () {
        setLanguage(button.dataset.lang);
      });
    });

    render();

    if (language() !== "PT") return;

    document.documentElement.lang = "pt-BR";
    translateIn(document.body);
    watch();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  return {
    language: language,
    setLanguage: setLanguage,
    translate: function (text) {
      return language() === "PT" ? (lookup(text) || text) : text;
    },
    dictionary: PT
  };
})();
