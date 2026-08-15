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

async function getWords() {
  const { words = [] } = await chrome.storage.local.get("words");
  return words;
}

async function setWords(words) {
  await chrome.storage.local.set({ words });
}

function getFiltered() {
  const q = searchEl.value.trim().toLowerCase();
  if (!q) return allWords;
  return allWords.filter(
    (w) =>
      w.word.toLowerCase().includes(q) ||
      (w.definition || "").toLowerCase().includes(q) ||
      (w.note || "").toLowerCase().includes(q)
  );
}



function render() {
  const words = getFiltered();
  countEl.textContent = `${allWords.length} word${allWords.length === 1 ? "" : "s"} saved`;

  if (allWords.length === 0) {
    listEl.innerHTML = "";
    emptyStateEl.hidden = false;
    return;
  }
  emptyStateEl.hidden = true;

  if (words.length === 0) {
    listEl.innerHTML = `<p class="no-results">No matches for “${escapeHtml(searchEl.value)}.”</p>`;
    return;
  }

  listEl.innerHTML = words.map(renderEntry).join("");
}


function renderEntry(entry) {
  const expanded = entry.id === expandedId;
  const domain = entry.sourceUrl ? safeDomain(entry.sourceUrl) : "";
  const pos = abbreviatePOS(entry.partOfSpeech);
  const catalogNo = String(entry.catalogNo || 0).padStart(3, "0");

  return `
    <div class="entry ${expanded ? "expanded" : ""}" data-id="${entry.id}">
      <div class="entry-main" data-action="toggle">
        <span class="catalog-no">№ ${catalogNo}</span>
        <div class="entry-headline">
          <span class="word">${escapeHtml(entry.word)}</span>
          ${pos ? `<span class="pos">${escapeHtml(pos)}</span>` : ""}
        </div>

        ${
          entry.definition
            ? `<p class="definition">${escapeHtml(entry.definition)}</p>`
            : `<p class="definition muted">No definition found. <button class="lookup-btn" data-action="lookup" data-id="${entry.id}">Look up</button></p>`
        }

        <div class="meta">
          ${
            domain
              ? `<a class="source" href="${escapeAttr(entry.sourceUrl)}" target="_blank" rel="noopener" data-action="stop">${escapeHtml(domain)}</a>`
              : `<span class="source">Added manually</span>`
          }
          <span>·</span>
          <span class="date">${formatDate(entry.createdAt)}</span>
        </div>

        ${
          expanded
            ? `
          <div class="entry-details" data-action="stop">
            ${entry.phonetic ? `<p class="phonetic">${escapeHtml(entry.phonetic)}</p>` : ""}
            ${entry.example ? `<p class="example">“${escapeHtml(entry.example)}”</p>` : ""}
            <input
              type="text"
              class="note-input"
              data-id="${entry.id}"
              placeholder="Add a personal note…"
              value="${escapeAttr(entry.note || "")}"
            />
          </div>`
            : ""
        }
      </div>
      <button class="delete-btn" data-action="delete" data-id="${entry.id}" title="Remove">×</button>
    </div>
  `;
}



function onListClick(e) {
  const actionEl = e.target.closest("[data-action]");
  if (!actionEl) return;
  const action = actionEl.dataset.action;

  if (action === "stop") return;

  if (action === "toggle") {
    const id = actionEl.closest(".entry").dataset.id;
    expandedId = expandedId === id ? null : id;
    render();
    return;
  }

  if (action === "delete") {
    deleteEntry(actionEl.dataset.id);
    return;
  }

  if (action === "lookup") {
    requestLookup(actionEl.dataset.id, actionEl);
    return;
  }
}

async function deleteEntry(id) {
  allWords = allWords.filter((w) => w.id !== id);
  await setWords(allWords);
}


async function requestLookup(id, buttonEl) {
  buttonEl.textContent = "Looking up…";
  buttonEl.disabled = true;
  try {
    const res = await chrome.runtime.sendMessage({ type: "REFRESH_DEFINITION", id });
    if (!res?.updated) {
      buttonEl.textContent = "Still not found";
      buttonEl.disabled = false;
    }
    // if updated, storage.onChanged re-renders this entry automatically
  } catch (err) {
    buttonEl.textContent = "Look up";
    buttonEl.disabled = false;
  }
}

async function onNoteBlur(e) {
  if (!e.target.classList.contains("note-input")) return;
  const id = e.target.dataset.id;
  const value = e.target.value;
  const idx = allWords.findIndex((w) => w.id === id);
  if (idx !== -1 && allWords[idx].note !== value) {
    allWords[idx].note = value;
    await setWords(allWords);
  }
}



function onListKeydown(e) {
  if (e.target.classList.contains("note-input") && e.key === "Enter") {
    e.target.blur();
  }
}

async function handleManualAdd(e) {
  if (e.key !== "Enter") return;
  const word = manualInputEl.value.trim();
  if (!word) return;

  manualInputEl.value = "";
  manualInputEl.disabled = true;
  try {
    const res = await chrome.runtime.sendMessage({ type: "ADD_WORD_MANUAL", word });
    if (!res?.added && res?.reason === "duplicate") {
      flashPlaceholder(`“${word}” is already saved`);
    }
  } catch (err) {
    console.error("WordNest: failed to add word", err);
  } finally {
    manualInputEl.disabled = false;
    manualInputEl.focus();
  }
}


