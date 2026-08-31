const MENU_ID = "wordnest-add-selection";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'Save "%s" to WordNest',
      contexts: ["selection"]
    });
  });
  refreshBadge();
});

chrome.runtime.onStartup.addListener(() => refreshBadge());

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;

  const raw = (info.selectionText || "").trim();
  if (!raw) return;

  const word = raw.replace(/\s+/g, " ").slice(0, 120);

  const result = await addEntryToStorage({
    word,
    sourceTitle: tab?.title || "",
    sourceUrl: info.pageUrl || tab?.url || ""
  });

  


  const message = result.added
    ? `Saved "${word}" to WordNest`
    : result.reason === "duplicate"
    ? `"${word}" is already in WordNest`
    : null;

  if (message && tab?.id) {
    chrome.scripting
      .executeScript({
        target: { tabId: tab.id },
        func: showPageToast,
        args: [message]
      })
      .catch(() => {
            });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "ADD_WORD_MANUAL") {
    addEntryToStorage({
      word: message.word,
      sourceTitle: "Added manually",
      sourceUrl: ""
    }).then(sendResponse);
    return true; // keep the message channel open for the async response
  }

  if (message?.type === "REFRESH_DEFINITION") {
    refreshDefinitionFor(message.id).then(sendResponse);
    return true;
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.words) {
    refreshBadge(changes.words.newValue || []);
  }
});

async function refreshBadge(wordsMaybe) {
  const words = wordsMaybe || (await chrome.storage.local.get("words")).words || [];
  chrome.action.setBadgeText({ text: words.length ? String(words.length) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#6E5E28" });
}

async function addEntryToStorage({ word, sourceTitle, sourceUrl }) {
  const clean = (word || "").trim();
  if (!clean) return { added: false, reason: "empty" };

  const { words = [], catalogCounter = 0 } = await chrome.storage.local.get([
    "words",
    "catalogCounter"
  ]);

  const isDuplicate = words.some((w) => w.word.toLowerCase() === clean.toLowerCase());
  if (isDuplicate) return { added: false, reason: "duplicate" };

  const nextNo = catalogCounter + 1;


  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    catalogNo: nextNo,
    word: clean,
    definition: null,
    partOfSpeech: null,
    phonetic: null,
    example: null,
    note: "",
    sourceTitle,
    sourceUrl,
    createdAt: Date.now()
  };

  if (isLookupable(clean)) {
    try {
      const def = await fetchDefinition(clean);
      if (def) Object.assign(entry, def);
    } catch (e) {
    }
  }

 words.unshift(entry);
  await chrome.storage.local.set({ words, catalogCounter: nextNo });
  return { added: true, entry };
}

async function refreshDefinitionFor(id) {
  const { words = [] } = await chrome.storage.local.get("words");
  const idx = words.findIndex((w) => w.id === id);
  if (idx === -1) return { updated: false };

  try {
    const def = await fetchDefinition(words[idx].word);
    if (def) {
      words[idx] = { ...words[idx], ...def };
      await chrome.storage.local.set({ words });
      return { updated: true };
    }
  } catch (e) {

 }
  return { updated: false };
}

function isLookupable(text) {
  return /^[A-Za-z][A-Za-z'-]*$/.test(text) && text.length <= 45;
}

async function fetchDefinition(word) {
  const res = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  const first = Array.isArray(data) ? data[0] : null;
  if (!first) return null;


  const phonetic = first.phonetic || first.phonetics?.find((p) => p.text)?.text || null;
  const meaning = first.meanings?.[0];
  const def = meaning?.definitions?.[0];

  return {
    phonetic,
    partOfSpeech: meaning?.partOfSpeech || null,
    definition: def?.definition || null,
    example: def?.example || null
  };
}




