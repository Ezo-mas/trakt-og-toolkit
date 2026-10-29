/** Single source of truth for the script's identity. build.mjs reads these. */
export const NAME = 'Trakt OG Toolkit';
export const DIR = 'trakt-og-toolkit';
export const VERSION = '0.1.2';

/** Hosts the script runs on. Localhost entries are for developing against trakt-og. */
export const HOST = 'og.trakt.tv';
export const DEV_MATCHES = ['localhost:5173', 'localhost:5174'];
