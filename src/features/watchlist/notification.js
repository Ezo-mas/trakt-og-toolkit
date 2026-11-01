import { notifySuccess } from '../../ui/success-notification.js';

export function notifyWatchlistAdded({ title = 'this title', active = () => true } = {}) {
  return notifySuccess(`You added ${title} to your watchlist.`, active);
}
