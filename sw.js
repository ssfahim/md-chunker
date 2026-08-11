const FILES = ['dark.js', 'cursor.js'];

// A tab that was already open when the extension loaded has no content script in it,
// so the first message just fails. That is the usual reason a shortcut looks dead
// straight after "Load unpacked". Inject on the miss, then deliver.
async function send(tabId, msg) {
  try {
    return await chrome.tabs.sendMessage(tabId, msg);
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: FILES });
    return chrome.tabs.sendMessage(tabId, msg);
  }
}

// lastFocusedWindow, NOT currentWindow: a service worker has no window of its own,
// so currentWindow can match nothing and every message dies with "no tab".
const activeId = async () =>
  (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0]?.id;

const MSG = { 'toggle-dark': 'toggle', 'toggle-cursor': 'toggle-cursor' };

chrome.commands.onCommand.addListener(async (cmd, tab) => {
  const msg = MSG[cmd];
  const id = tab?.id ?? (await activeId());
  if (msg && id) await send(id, msg);
});

// the popup cannot inject, so it asks the worker to do the talking. The popup knows
// its own tab and says so; the fallback is only for the keyboard path.
chrome.runtime.onMessage.addListener((req, _sender, respond) => {
  if (req?.relay === undefined) return;
  Promise.resolve(req.tabId ?? activeId())
    .then(id => (id ? send(id, req.relay) : Promise.reject(new Error('no active tab'))))
    .then(state => respond({ state }))
    .catch(e => respond({ error: String(e.message || e) }));
  return true; // response comes back async
});
