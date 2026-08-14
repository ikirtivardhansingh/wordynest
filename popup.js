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
