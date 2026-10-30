import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { FORVO_HTML, PERSON_HTML } from './fixtures.js';
import {
  decodeForvoPath,
  forvoAudioHost,
  forvoUrl,
  parseForvoPage,
  readForvoRecordings,
  readPersonName,
} from '../src/features/pronunciation/data.js';

test('reads and normalizes the summary name', (t) => {
  const window = new Window();
  t.after(() => window.close());
  window.document.body.innerHTML = PERSON_HTML;
  const heading = window.document.querySelector('.summary .summary-title h1');
  heading.textContent = '  Bryan \n  Cranston  ';
  assert.equal(readPersonName(window.document), 'Bryan Cranston');
  heading.textContent = '  ';
  assert.equal(readPersonName(window.document), null);
  heading.remove();
  assert.equal(readPersonName(window.document), null);
});

test('encodes names for Forvo search', () => {
  assert.equal(forvoUrl('Zoë Saldaña'), 'https://forvo.com/search/Zo%C3%AB%20Salda%C3%B1a/');
  assert.equal(forvoUrl("Lupita Nyong'o"), "https://forvo.com/search/Lupita%20Nyong'o/");
});

test('decodes Forvo base64 audio paths and rejects junk', () => {
  assert.equal(
    decodeForvoPath('OTU3NDUyMi8zOS85NTc0NTIyXzM5XzQzMDc1ODUubXAz'),
    '9574522/39/9574522_39_4307585.mp3',
  );
  assert.equal(decodeForvoPath('not base64!'), null);
  assert.equal(decodeForvoPath(''), null);
});

test('reads the audio host from the page and ignores untrusted hosts', () => {
  assert.equal(forvoAudioHost("<script>var _AUDIO_HTTP_HOST='audio12.forvo.com';</script>"), 'audio12.forvo.com');
  assert.equal(forvoAudioHost("<script>var _AUDIO_HTTP_HOST='evil.example';</script>"), 'audio12.forvo.com');
  assert.equal(forvoAudioHost('<p>No host here</p>'), 'audio12.forvo.com');
});

test('pulls one playable recording out of each Play handler', (t) => {
  const window = new Window();
  t.after(() => window.close());
  window.document.body.innerHTML = FORVO_HTML;

  const recordings = readForvoRecordings(window.document);
  assert.deepEqual(recordings, [
    {
      mp3: 'https://audio12.forvo.com/mp3/9574522/39/9574522_39_4307585.mp3',
      ogg: 'https://audio12.forvo.com/ogg/9574522/39/9574522_39_4307585.ogg',
      word: 'Bryan Cranston',
      language: 'English',
    },
  ]);
});

test('dedupes recordings and skips malformed or unrelated handlers', (t) => {
  const window = new Window();
  t.after(() => window.close());
  window.document.body.innerHTML = `
    <div onclick="Play(1,'MTExLzIvMTExXzJfMjIyLm1wMw==','MTExLzIvMTExXzJfMjIyLm9nZw==',false,'','','l','Name','English')"></div>
    <div onclick="Play(1,'MTExLzIvMTExXzJfMjIyLm1wMw==','MTExLzIvMTExXzJfMjIyLm9nZw==',false,'','','l','Name','English')"></div>
    <div onclick="Play(2,'not base64!','',false,'','','l','Name','English')"></div>
    <div onclick="Other(3,'MTExLzIvMTExXzJfMjIyLm1wMw==')"></div>
    <div onclick="Play(4,'','',true,'OTk5LzgvOTk5XzhfODg4Lm1wMw==','OTk5LzgvOTk5XzhfODg4Lm9nZw==','h','Name','English')"></div>`;

  const recordings = readForvoRecordings(window.document);
  assert.deepEqual(recordings, [
    {
      mp3: 'https://audio12.forvo.com/mp3/111/2/111_2_222.mp3',
      ogg: 'https://audio12.forvo.com/ogg/111/2/111_2_222.ogg',
      word: 'Name',
      language: 'English',
    },
    {
      mp3: 'https://audio12.forvo.com/audios/mp3/999/8/999_8_888.mp3',
      ogg: 'https://audio12.forvo.com/audios/ogg/999/8/999_8_888.ogg',
      word: 'Name',
      language: 'English',
    },
  ]);
});

test('parses a fetched Forvo page with the host it declares', (t) => {
  const window = new Window();
  const previous = globalThis.DOMParser;
  globalThis.DOMParser = window.DOMParser;
  t.after(() => {
    if (previous) globalThis.DOMParser = previous;
    else delete globalThis.DOMParser;
    window.close();
  });

  assert.equal(parseForvoPage(FORVO_HTML)[0].mp3, 'https://audio12.forvo.com/mp3/9574522/39/9574522_39_4307585.mp3');
  assert.deepEqual(parseForvoPage('<p>No results</p>'), []);
});

test('keeps only recordings whose word matches the person name', (t) => {
  const window = new Window();
  const previous = globalThis.DOMParser;
  globalThis.DOMParser = window.DOMParser;
  t.after(() => {
    if (previous) globalThis.DOMParser = previous;
    else delete globalThis.DOMParser;
    window.close();
  });

  const related = `<div onclick="Play(2,'MjIyMjIyMi8yMi8yMjIyMjIyXzIyXzIyMjIyMjIubXAz','MjIyMjIyMi8yMi8yMjIyMjIyXzIyXzIyMjIyMjIub2dn',false,'','','l','Bryan','English')"></div>`;
  const html = `${FORVO_HTML}${related}`;

  assert.equal(parseForvoPage(html).length, 2, 'unfiltered parsing still returns every recording');
  assert.deepEqual(
    parseForvoPage(html, '  bryan   CRANSTON  ').map((recording) => recording.word),
    ['Bryan Cranston'],
    'matches the name despite case and whitespace differences',
  );
  assert.deepEqual(parseForvoPage(html, 'Brian Cranston'), [], 'a different name is not used');
});
