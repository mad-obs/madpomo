/* ==========================================================================
   madpomo (React) — languages (EN / pt-BR)

   The same idea as the plain build's i18n.js, and the same words: the
   dictionary is imported from the one file at the project root, so a
   correction there fixes both builds at once.

   What is different is where it sits. React owns the DOM and rewrites it on
   every state change, so translating "once, after load" would last until the
   first click. The MutationObserver is what carries it: React renders
   English, this translates what React just wrote, and the two settle in the
   same frame. React never notices, because it compares its own virtual tree
   and not the live text.

   Writing `t(...)` around every string in every component would be the
   textbook way. It would also mean editing every component for every new
   string, and the strings are already written in English in the JSX — this
   keeps the components exactly as they were.
   ========================================================================== */

/* imported for its side effect: it sets window.MP_I18N */
import "../../../i18n-data.js";

import { KEYS, read, write, loadSettings } from "./storage.js";

const DEFAULT = "EN";

const DATA = typeof window !== "undefined" && window.MP_I18N ? window.MP_I18N : {};
const BUILT_IN_COLUMNS = DATA.BUILT_IN_COLUMNS || {};
const WEEKDAYS = DATA.WEEKDAYS || {};
const MONTHS = DATA.MONTHS || {};
const PT = DATA.PT || {};
const PATTERNS = DATA.PATTERNS || [];
const FRAGMENTS = DATA.FRAGMENTS || [];

/* Anything you wrote. Never translated, whatever it says. */
const USER_CONTENT = [
  "input",
  "textarea",
  ".task__head-label",
  ".task__notes",
  ".checklist__item-label",
  "[data-no-i18n]"
].join(", ");

export function currentLanguage() {
  return loadSettings().language === "PT" ? "PT" : DEFAULT;
}

export function setLanguage(next) {
  if (next !== "PT" && next !== "EN") return;
  if (next === currentLanguage()) return;

  /* Written straight to storage rather than through the store, so the value
     is on disk before the reload rather than racing the effect that saves
     it. Reloading is the honest way back to English: the app is rebuilt from
     the English source instead of being translated in reverse. */
  write(KEYS.settings, Object.assign(read(KEYS.settings, {}), { language: next }));
  window.location.reload();
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
  FRAGMENTS.forEach((rule) => {
    rewritten = rewritten.replace(rule[0], rule[1]);
  });

  return rewritten === key ? null : rewritten;
}

/* A built-in column is named by the app; one you added is named by you. */
function columnNameFor(node) {
  const title = node.parentElement;
  if (!title || !title.classList.contains("column__title")) return null;

  const column = title.closest("[data-status]");
  if (!column) return null;

  return BUILT_IN_COLUMNS[column.dataset.status] || null;
}

function translateIn(root) {
  if (!root || (root.nodeType !== 1 && root.nodeType !== 9)) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
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
  changes.forEach(([target, text]) => {
    const lead = target.data.match(/^\s*/)[0];
    const tail = target.data.match(/\s*$/)[0];
    target.data = lead + text + tail;
  });

  translateAttributes(root);
}

const ATTRIBUTES = ["placeholder", "aria-label", "title"];

function translateAttributes(root) {
  const scope = root.nodeType === 9 ? root.body : root;
  if (!scope) return;

  [scope, ...scope.querySelectorAll("*")].forEach((element) => {
    if (!element.closest || element.closest("[data-no-i18n]")) return;

    ATTRIBUTES.forEach((name) => {
      const value = element.getAttribute && element.getAttribute(name);
      if (!value) return;

      const translated = lookup(value);
      if (translated !== null && translated !== value) element.setAttribute(name, translated);
    });
  });
}

const OPTIONS = { childList: true, subtree: true, characterData: true };

/* One observer for the page. StrictMode mounts a component twice in
   development, and two observers would mean every render translated twice. */
let started = false;

export function startI18n() {
  if (started || currentLanguage() !== "PT") return;
  started = true;

  document.documentElement.lang = "pt-BR";
  translateIn(document.body);

  const observer = new MutationObserver((records) => {
    // disconnected while translating, so it cannot watch itself work
    observer.disconnect();

    records.forEach((record) => {
      if (record.type === "childList") {
        record.addedNodes.forEach((added) => {
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
