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
