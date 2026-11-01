/** Refresh through OG's own read-only picker path, without accessing its session or Svelte store. */
export function createNativeWatchlistRefresh() {
  const pending = new Set();
  return {
    refresh(control, route, { active = () => true } = {}) {
      // loadPickerLists leaves seasons/episodes' watchlisted value unchanged in OG.
      if (route.name !== 'title' || !['movie', 'show'].includes(route.kind) || !control?.isConnected || !active()) {
        return Promise.resolve(false);
      }
      const doc = control.ownerDocument;
      // Positive signed-in markup only. Never open OG's login from a toolkit-only session.
      if (!doc.querySelector('header.top-nav .profile')) return Promise.resolve(false);
      const trigger = control.querySelector('button[aria-controls][aria-keyshortcuts~="ArrowDown"]');
      const picker = doc.getElementById(trigger?.getAttribute('aria-controls'));
      if (!trigger || trigger.disabled || trigger.getAttribute('aria-busy') === 'true' ||
        trigger.getAttribute('aria-expanded') === 'true' || !picker?.matches('.picker[popover]')) {
        return Promise.resolve(false);
      }
      const view = doc.defaultView;
      return new Promise(resolve => {
        let settled = false, began = false;
        const finish = result => {
          if (settled) return;
          settled = true;
          observer.disconnect();
          picker.removeEventListener('beforetoggle', beforeToggle);
          doc.removeEventListener('ogt:authchange', cancel);
          view.removeEventListener('popstate', cancel);
          pending.delete(cancel);
          resolve(result && active() && control.isConnected);
        };
        const cancel = () => finish(false);
        const beforeToggle = event => {
          if (event.newState !== 'open') return;
          // OG has already reconciled its shared state before it tries to show the picker.
          event.preventDefault();
          finish(event.defaultPrevented);
        };
        const observer = new view.MutationObserver(records => {
          if (!active() || !control.isConnected) { finish(false); return; }
          const busy = trigger.disabled || trigger.getAttribute('aria-busy') === 'true';
          const wasBusy = records.some(record => record.target === trigger && (
            record.attributeName === 'disabled' && record.oldValue !== null ||
            record.attributeName === 'aria-busy' && record.oldValue === 'true'));
          if (busy) began = true;
          else if (began || wasBusy) finish(false); // Loading failed or no popup was produced.
        });
        pending.add(cancel);
        picker.addEventListener('beforetoggle', beforeToggle);
        doc.addEventListener('ogt:authchange', cancel);
        view.addEventListener('popstate', cancel);
        observer.observe(control, { attributes: true, subtree: true, attributeOldValue: true, attributeFilter: ['disabled', 'aria-busy'] });
        // MediaList's ArrowDown handler calls open(true). Unlike clicking, this cannot quick-add/toggle.
        trigger.dispatchEvent(new view.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
      });
    },
    destroy() { for (const cancel of [...pending]) cancel(); },
  };
}
