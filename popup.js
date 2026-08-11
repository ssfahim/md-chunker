// Two buttons. Each one asks the worker to talk to the page, because only the
// worker can inject the content script into a tab that predates the extension.
const BUTTONS = [
  { id: 'cursor', label: 'cursor', state: 'cursor-state', toggle: 'toggle-cursor' },
  { id: 'dark', label: 'dark theme', state: 'dark-state', toggle: 'toggle' },
];

// The popup runs inside a window, so it can resolve the tab reliably; the worker
// cannot. Pass the id along rather than making the worker guess.
const myTab = async () =>
  (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;

const relay = async msg => {
  try {
    return await chrome.runtime.sendMessage({ relay: msg, tabId: await myTab() });
  } catch (e) {
    return { error: String(e?.message || e) };
  }
};

function paint(b, on) {
  const el = document.getElementById(b.id);
  el.firstChild.textContent = `${on ? 'Deactivate' : 'Activate'} ${b.label} `;
  el.setAttribute('aria-pressed', String(!!on));
}

// "cannot be scripted" is what you get on browser pages; say why, don't dump the raw error
const errText = message =>
  /chrome:\/\/|edge:\/\/|cannot be scripted|extension manifest/i.test(message)
    ? 'Nothing to change on this page — browser pages block extensions.'
    : message;

function fail(message) {
  const err = document.getElementById('err');
  err.hidden = false;
  err.textContent = errText(message);
}

async function refresh(b) {
  const r = await relay(b.state);
  if (r?.error) return fail(r.error);
  paint(b, r?.state);
}

function wire() {
  // Label the buttons BEFORE asking the page anything. A label must never depend on a
  // message round trip: if the tab cannot be reached you still need to read the button.
  for (const b of BUTTONS) paint(b, false);

  // show the live shortcut rather than a hardcoded one, since it is user-rebindable
  const keyFor = { cursor: 'toggle-cursor', dark: 'toggle-dark' };
  chrome.commands.getAll().then(cmds => {
    for (const b of BUTTONS) {
      const found = cmds.find(c => c.name === keyFor[b.id]);
      document.querySelector(`#${b.id} .keys`).textContent = found?.shortcut || '';
    }
  });

  for (const b of BUTTONS) {
    refresh(b);
    document.getElementById(b.id).addEventListener('click', async () => {
      document.getElementById('err').hidden = true;
      const r = await relay(b.toggle);
      if (r?.error) return fail(r.error);
      paint(b, r?.state);
    });
  }
}

if (globalThis.chrome?.runtime?.sendMessage) wire();

globalThis.darkAnyPopup = { BUTTONS, paint, fail, errText, wire };
