import { notifySuccess } from '../../ui/success-notification.js';

export function notifyWatchlistAdded({ title = 'this title', active = () => true, onUndo } = {}) {
  return notifySuccess(`You added ${title} to your watchlist.`, active, { undo: onUndo });
}
