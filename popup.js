const listEl = document.getElementById("list");
const emptyStateEl = document.getElementById("empty-state");
const countEl = document.getElementById("count");
const searchEl = document.getElementById("search");
const manualInputEl = document.getElementById("manual-word");
const exportJsonBtn = document.getElementById("export-json");
const exportCsvBtn = document.getElementById("export-csv");
const clearAllBtn = document.getElementById("clear-all");

const POS_ABBREVIATIONS = {
  noun: "n.",
  verb: "v.",
  adjective: "adj.",
  adverb: "adv.",
  pronoun: "pron.",
  preposition: "prep.",
  conjunction: "conj.",
  interjection: "interj.",
  exclamation: "interj.",
  determiner: "det.",
  article: "art."
};

let allWords = [];
let expandedId = null;

init();

async function init() {
  allWords = await getWords();
  render();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.words) {
      allWords = changes.words.newValue || [];
      render();
    }
  });

  searchEl.addEventListener("input", render);
  manualInputEl.addEventListener("keydown", handleManualAdd);

  listEl.addEventListener("click", onListClick);
  listEl.addEventListener("focusout", onNoteBlur);
  listEl.addEventListener("keydown", onListKeydown);

  exportJsonBtn.addEventListener("click", () => exportWords("json"));
  exportCsvBtn.addEventListener("click", () => exportWords("csv"));
  clearAllBtn.addEventListener("click", onClearAll);
}
