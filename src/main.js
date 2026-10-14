import '@nysds/styles/full';
import '@nysds/components';
import './styles.css';
import { splitFullName, otherDivisions, matchKind, key, searchQuery, hasDigit } from './name-split.js';

// The portal's own messages for a name it won't search (renew.ny.gov-web src/views/search-by-name.ts).
const EMPTY_NAME_MESSAGE = 'Provide your full name.';
const LICENSE_NUMBER_MESSAGE =
  'Looks like you’re trying to search with a license number. Go back to find your license that way.';

const PARTS = [
  { part: 'first', label: 'First name', chip: 'first', css: 'k-first' },
  { part: 'middle', label: 'Middle name', chip: 'middle', css: 'k-mid' },
  { part: 'last', label: 'Last name', chip: 'last', css: 'k-last' },
  { part: 'suffix', label: 'Suffix', chip: 'suffix', css: 'k-suf' },
];

const input = document.getElementById('ns-input');
const steps = document.getElementById('ns-steps');
const stepSplit = document.getElementById('ns-step-split');
const stepMatch = document.getElementById('ns-step-match');
const stepAlt = document.getElementById('ns-step-alt');
const stepAltItem = document.getElementById('ns-step-alt-item');
const oneWord = document.getElementById('ns-one-word');
const request = document.getElementById('ns-req');
const stop = document.getElementById('ns-stop');
const live = document.getElementById('ns-live');

function esc(value) {
  return String(value).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function quoted(value) {
  return `<q>${esc(key(value))}</q>`;
}

function ruleText(part, value, divided) {
  switch (matchKind(part, value, divided)) {
    case 'prefix-two-word':
      return `starts with ${quoted(value)} (no close spelling for a two-word part)`;
    case 'prefix':
      return `starts with ${quoted(value)}`;
    case 'suffix':
      return `is ${esc(value)}, however it’s written`;
    case 'exact':
      return `is exactly ${quoted(value)}`;
    default:
      return `starts with ${quoted(value)}, or is a close spelling`;
  }
}

function present(parts) {
  return PARTS.filter((p) => parts[p.part]);
}

function rules(parts, divided) {
  const rows = present(parts)
    .map((p) => `<li><span>${p.label}</span><span>${ruleText(p.part, parts[p.part], divided)}</span></li>`)
    .join('');
  return `<ul class="ns-says">${rows}</ul>`;
}

function chips(parts) {
  const words = present(parts)
    .map((p) => `<span class="nsw ${p.css}"><b>${esc(parts[p.part])}</b><i>${p.chip}</i></span>`)
    .join('');
  return `<div class="ns-words">${words}</div>`;
}

function slots(parts) {
  const cells = PARTS.map((p) => {
    const value = parts[p.part];
    const shown = value ? `<b>${esc(value)}</b>` : '<b class="ns-nil">not sent</b>';
    return `<div class="ns-slot ${value ? p.css : 'k-none'}"><i>${p.label}</i>${shown}</div>`;
  }).join('');
  return `<div class="ns-slots">${cells}</div>`;
}

// The portal refuses the name before it searches, so nothing below the box applies.
function showStop(message, explain) {
  input.errorMessage = message;
  input.showError = true;
  steps.hidden = true;
  oneWord.hidden = true;
  request.hidden = true;
  stop.hidden = false;
  stop.textContent = explain;
}

let timer = null;

function render() {
  const value = input.value || '';
  const parts = splitFullName(value);
  let spoken;

  if (!parts) {
    showStop(EMPTY_NAME_MESSAGE, 'The portal stops here and shows the message under the name box. It sends nothing.');
    spoken = 'No name to split.';
  } else if (hasDigit(value)) {
    showStop(
      LICENSE_NUMBER_MESSAGE,
      'A name with a digit in it reads as a license number. The portal stops here and shows the message under the name box.',
    );
    spoken = 'Reads as a license number.';
  } else {
    input.showError = false;
    input.errorMessage = '';
    steps.hidden = false;
    request.hidden = false;
    stop.hidden = true;

    stepSplit.innerHTML = slots(parts);
    stepMatch.innerHTML = rules(parts, false);

    // Take step 3 out of the list, not just out of view, so the list draws no line past step 2.
    const divisions = otherDivisions(parts);
    if (!divisions.length) stepAltItem.remove();
    else if (!stepAltItem.isConnected) steps.append(stepAltItem);
    stepAlt.innerHTML = divisions.length
      ? `<div class="ns-alts">${divisions
          .map((d) => `<div class="ns-alt">${chips(d)}${rules(d, true)}</div>`)
          .join('')}</div><p class="ns-aside">A license that matches the first split or any of these is found.</p>`
      : '';

    const lastOnly = !parts.first && !parts.middle;
    oneWord.hidden = !lastOnly;
    oneWord.innerHTML = lastOnly
      ? `<b>One word is a last name.</b> The results say “We searched for the last name ${esc(parts.last)}. Enter your first and last name as they appear on your license.”`
      : '';

    request.innerHTML = `The portal sends <code>GET /api/v1/licenses/search?${esc(searchQuery(parts))}</code>`;

    spoken =
      present(parts)
        .map((p) => `${p.label} ${parts[p.part]}`)
        .join(', ') + (divisions.length ? `. Also tries ${divisions.length} other splits.` : '.');
  }

  // Wait for a pause in typing so a screen reader hears one summary, not every keystroke.
  clearTimeout(timer);
  timer = setTimeout(() => {
    live.textContent = spoken;
  }, 700);
}

input.addEventListener('nys-input', render);

document.querySelector('.ns-examples').addEventListener('nys-click', (event) => {
  const button = event.target.closest('nys-button[data-ns]');
  if (!button) return;
  input.value = button.dataset.ns;
  render();
});

customElements.whenDefined('nys-textinput').then(render);
