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











