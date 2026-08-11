// Two buttons. Each one asks the worker to talk to the page, because only the
// worker can inject the content script into a tab that predates the extension.
const BUTTONS = [
  { id: 'cursor', label: 'cursor', state: 'cursor-state', toggle: 'toggle-cursor' },
  { id: 'dark', label: 'dark theme', state: 'dark-state', toggle: 'toggle' },
];

const relay = msg => chrome.runtime.sendMessage({ relay: msg });

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
