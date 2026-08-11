// no content script on chrome:// or Web Store pages, so every send can miss
const tell = (tabId, msg) => chrome.tabs.sendMessage(tabId, msg).catch(() => {});

chrome.action.onClicked.addListener(tab => tell(tab.id, 'toggle'));

chrome.commands.onCommand.addListener(async (cmd, tab) => {
  if (cmd !== 'toggle-cursor') return;
  const id = tab?.id ?? (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;
  if (id) tell(id, 'toggle-cursor');
});
