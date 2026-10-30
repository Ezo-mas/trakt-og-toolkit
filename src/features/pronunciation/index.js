import { el } from '../../core/dom.js';
import { debugError } from '../../core/log.js';
import { getForvoRecordings } from './api.js';
import { forvoUrl, readPersonName } from './data.js';
import { CSS } from './styles.js';

function createWidget(name) {
  let recordings = null;
  let audio = null;
  let controller = null;
  let busy = false;
  let destroyed = false;

  const status = el('span', { class: 'ogt-pronounce__status', role: 'status', 'aria-live': 'polite' });
  const button = el('button', {
    class: 'ogt-pronounce',
    type: 'button',
    text: 'Pronounce',
    'aria-label': `Pronounce ${name}`,
  });
  const node = el('span', { class: 'ogt-pronounce__wrap' }, button, status);

  function setButton(label) {
    button.textContent = label;
    button.setAttribute('aria-label', label === 'Pause' ? `Pause ${name} pronunciation` : `Pronounce ${name}`);
  }

  function setStatus(message, href = null) {
    status.replaceChildren();
    if (message) status.append(document.createTextNode(message));
    if (href) {
      if (message) status.append(' ');
      status.append(el('a', { href, target: '_blank', rel: 'noopener noreferrer', text: 'Forvo' }));
    }
  }

  function dropAudio() {
    if (!audio) return;
    const old = audio;
    audio = null;
    old.pause();
    old.replaceChildren();
    old.remove();
  }

  async function startRecording(index) {
    dropAudio();
    const recording = recordings?.[index];
    if (!recording) {
      setStatus('Audio unavailable.', forvoUrl(name));
      return;
    }

    setStatus('');
    const element = createAudio(recording, index);
    audio = element;
    node.append(element);
    try {
      await element.play();
    } catch {
      if (!destroyed && audio === element) setStatus('Tap Pronounce to play.');
    }
  }

  function createAudio(recording, index) {
    const element = el('audio', { class: 'ogt-pronounce__audio', preload: 'auto', hidden: true });
    const sources = [];
    let sourceErrors = 0;
    let failed = false;

    const fail = () => {
      if (failed || destroyed || audio !== element) return;
      failed = true;
      if (index + 1 < recordings.length) {
        void startRecording(index + 1);
      } else {
        dropAudio();
        setStatus('Audio unavailable.', forvoUrl(name));
      }
    };

    const addSource = (src, type) => {
      const source = el('source', { src, type });
      source.addEventListener('error', () => {
        sourceErrors += 1;
        if (sourceErrors === sources.length) fail();
      });
      sources.push(source);
      element.append(source);
    };

    if (recording.mp3) addSource(recording.mp3, 'audio/mpeg');
    if (recording.ogg) addSource(recording.ogg, 'audio/ogg; codecs=vorbis');

    element.addEventListener('play', () => {
      if (!destroyed) setButton('Pause');
    });
    element.addEventListener('pause', () => {
      if (!destroyed) setButton('Pronounce');
    });
    element.addEventListener('ended', () => {
      if (!destroyed) {
        element.currentTime = 0;
        setButton('Pronounce');
      }
    });
    element.addEventListener('error', fail);
    return element;
  }

  async function play() {
    if (busy || destroyed) return;

    if (audio) {
      const element = audio;
      if (!element.paused) {
        element.pause();
        return;
      }
      try {
        element.currentTime = 0;
        await element.play();
      } catch {
        if (!destroyed && audio === element) setStatus('Tap Pronounce to play.');
      }
      return;
    }

    busy = true;
    button.setAttribute('aria-busy', 'true');
    setButton('Loading…');
    setStatus('');
    const requestController = new AbortController();
    controller = requestController;

    try {
      if (!recordings) recordings = await getForvoRecordings(name, { signal: requestController.signal });
      if (destroyed) return;

      if (!recordings.length) {
        setStatus('No pronunciation found.', forvoUrl(name));
        return;
      }

      await startRecording(0);
    } catch (error) {
      if (destroyed) return;
      debugError('Forvo lookup failed', error);
      setStatus('Forvo unavailable.', forvoUrl(name));
    } finally {
      busy = false;
      if (!destroyed) {
        button.removeAttribute('aria-busy');
        setButton(audio && !audio.paused ? 'Pause' : 'Pronounce');
      }
      if (controller === requestController) controller = null;
    }
  }

  button.addEventListener('click', play);

  return {
    node,
    destroy() {
      destroyed = true;
      controller?.abort();
      controller = null;
      dropAudio();
      node.remove();
    },
  };
}

export const pronunciation = {
  id: 'pronunciation',
  css: CSS,
  match(route) {
    return route.name === 'person';
  },
  mount() {
    const name = readPersonName(document);
    if (!name) return null;
    const heading = document.querySelector('.summary .summary-title h1');
    if (!heading) return null;

    const widget = createWidget(name);
    heading.after(widget.node);
    return widget;
  },
};
