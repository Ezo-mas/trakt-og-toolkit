/** Single source of truth for the script's identity. build.mjs reads these. */
export const NAME = 'Trakt OG Toolkit';
export const DIR = 'trakt-og-toolkit';
/** GitHub owner/name. Update and support URLs in the header are built from it. */
export const REPO = 'Ezo-mas/trakt-og-toolkit';
export const VERSION = '0.4.0';

/** Hosts the script runs on. Localhost entries are for developing against trakt-og. */
export const HOST = 'og.trakt.tv';
export const DEV_MATCHES = ['localhost:5173', 'localhost:5174'];
