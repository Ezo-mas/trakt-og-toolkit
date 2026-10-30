import { text } from '../../core/dom.js';

const DEFAULT_AUDIO_HOST = 'audio12.forvo.com';
const AUDIO_HOST = /^(?:[a-z0-9-]+\.)+forvo\.com$/i;
const AUDIO_PATH = /^[A-Za-z0-9][A-Za-z0-9/_.-]*$/;
const PLAY_ARGUMENT = /'((?:[^'\\]|\\.)*)'/g;
const MAX_RECORDINGS = 12;

export function readPersonName(doc) {
  return text(doc.querySelector('.summary .summary-title h1')) || null;
}

export function forvoUrl(name) {
  return `https://forvo.com/search/${encodeURIComponent(name)}/`;
}

/** The page declares the audio host in an inline script; prefer it over a hard-coded one. */
export function forvoAudioHost(html) {
  const match = String(html).match(/_AUDIO_HTTP_HOST\s*=\s*['"]([^'"]+)['"]/);
  return match && AUDIO_HOST.test(match[1]) ? match[1] : DEFAULT_AUDIO_HOST;
}

/** Forvo passes the MP3/OGG paths as base64 in each Play(...) handler. */
export function decodeForvoPath(encoded) {
  if (!encoded) return null;
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    return AUDIO_PATH.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

function normalizeWord(value) {
  return String(value || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function unescapeString(value) {
  return value
    .replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\(['"\\/bfnrt])/g, (_, char) => {
      const escapes = { b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
      return escapes[char] ?? char;
    });
}

function readPlay(node) {
  const onclick = node.getAttribute('onclick') || '';
  if (!/^\s*Play\s*\(/.test(onclick)) return null;

  // Play(id, mp3, ogg, highQuality, highMp3, highOgg, type, word, language)
  const args = [...onclick.matchAll(PLAY_ARGUMENT)].map((match) => unescapeString(match[1]));
  return {
    mp3: decodeForvoPath(args[0]),
    ogg: decodeForvoPath(args[1]),
    highMp3: decodeForvoPath(args[2]),
    highOgg: decodeForvoPath(args[3]),
    word: args[5]?.trim() || '',
    language: args[6]?.trim() || '',
  };
}

export function readForvoRecordings(doc, host = DEFAULT_AUDIO_HOST, name = '') {
  const recordings = [];
  const seen = new Set();
  const wantedWord = normalizeWord(name);

  for (const node of doc.querySelectorAll('[onclick]')) {
    const play = readPlay(node);
    if (!play) continue;
    if (wantedWord && normalizeWord(play.word) !== wantedWord) continue;

    const mp3Path = play.mp3 || play.highMp3;
    const oggPath = play.ogg || play.highOgg;
    if (!mp3Path && !oggPath) continue;

    const mp3 = mp3Path ? `https://${host}/${play.mp3 ? 'mp3' : 'audios/mp3'}/${mp3Path}` : null;
    const ogg = oggPath ? `https://${host}/${play.ogg ? 'ogg' : 'audios/ogg'}/${oggPath}` : null;
    const key = mp3 || ogg;
    if (seen.has(key)) continue;

    seen.add(key);
    recordings.push({ mp3, ogg, word: play.word, language: play.language });
    if (recordings.length === MAX_RECORDINGS) break;
  }

  return recordings;
}

/** Parse a fetched Forvo search result into playable recordings. */
export function parseForvoPage(html, name = '') {
  const source = String(html || '');
  const doc = new DOMParser().parseFromString(source, 'text/html');
  return readForvoRecordings(doc, forvoAudioHost(source), name);
}
