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

const activeId = async () =>
  (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;

const MSG = { 'toggle-dark': 'toggle', 'toggle-cursor': 'toggle-cursor' };

chrome.commands.onCommand.addListener(async (cmd, tab) => {
  const msg = MSG[cmd];
  const id = tab?.id ?? (await activeId());
  if (msg && id) await send(id, msg);
});

// the popup cannot inject, so it asks the worker to do the talking
chrome.runtime.onMessage.addListener((req, _sender, respond) => {
  if (req?.relay === undefined) return;
  activeId()
    .then(id => (id ? send(id, req.relay) : Promise.reject(new Error('no tab'))))
    .then(state => respond({ state }))
    .catch(e => respond({ error: String(e.message || e) }));
  return true; // response comes back async
});
