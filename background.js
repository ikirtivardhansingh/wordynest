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