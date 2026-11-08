// Discard authorization parameters until the userscript's verified PKCE handoff exists.
history.replaceState(null, '', location.pathname);
