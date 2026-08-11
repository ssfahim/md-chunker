chrome.action.onClicked.addListener(tab => {
  chrome.tabs.sendMessage(tab.id, 'toggle').catch(() => {}); // no content script on chrome:// pages
});
