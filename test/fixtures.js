/** Trimmed, hand-written mirrors of the real og markup these selectors rely on. */

/** Action-stack structure trimmed by hand from live signed-out captures on 2026-11-01:
 * /movies/fight-club-1999, /shows/breaking-bad, and its /seasons/1 and /seasons/1/episodes/1.
 * All four use this stack/list control. Icons, unrelated actions and Svelte hashes omitted.
 * Signed-in Listed On/detail variants in tests are source-derived from MediaList at 4bdefaf4e. */
export const WATCHLIST_HTML = `
<main id="content">
  <section class="summary-frame"><div class="container"><div class="columns">
    <div class="info" id="overview"><div class="top"><div class="details"></div>
      <div class="actions"><div class="action-buttons">
        <div class="stacked"><div class="watch-control summary"><div class="summary-action">
          <button type="button" class="main" aria-label="Add to history" aria-haspopup="dialog">
            <span class="text"><span class="title">Add to history</span></span>
          </button>
        </div></div></div>
        <div class="stacked"></div>
        <div class="list-control summary"><div class="summary-action">
          <button type="button" class="main" aria-haspopup="dialog" aria-expanded="false" aria-controls="native-list-picker" aria-keyshortcuts="ArrowDown">
            <span class="text"><span class="title">Add to list</span></span>
          </button>
          <div class="tiles"><button type="button" class="tile" aria-label="Pick a list" aria-haspopup="dialog"></button></div>
        </div></div>
        <div id="native-list-picker" class="picker summary" popover="auto" role="dialog" aria-label="Lists"></div>
      </div></div>
    </div></div>
  </div></div></section>
</main>`;

/** Hand-trimmed fanart-card from live /movies/trending (2026-11-01). Poster variant uses the
 * same controls (also checked on the saved show page). Signed-in rich tooltip comes from ListedTip. */
export function watchlistCardHtml({ id = 'card-movie', href = '/movies/verity-2026', small = false } = {}) {
  return `<article id="${id}" class="${small ? 'poster-card' : 'fanart-card'} with-icons">
    <a class="${small ? 'poster' : 'image-link'}" href="${href}" tabindex="-1" aria-hidden="true"></a>
    <div class="titles"><h3><a class="titles-link" href="${href}">Card title</a></h3></div>
    <div class="quick-icons${small ? ' small' : ''}"><div class="actions"><div class="tools">
      <div class="watch-control card"><button class="watch-trigger" aria-label="Add to watched history"></button></div>
      <div class="list-control card${small ? ' small' : ''}">
        <button type="button" class="trigger" aria-label="Add to list" aria-describedby="${id}-tip" aria-haspopup="dialog" aria-controls="${id}-picker" aria-keyshortcuts="ArrowDown"></button>
        <span id="${id}-tip" class="tooltip" role="tooltip" popover="hint">Add to list</span>
      </div>
      <div id="${id}-picker" class="picker card" popover="auto" role="dialog"></div>
      <button type="button" class="action favorite" aria-label="Add to favorites"></button>
      <button type="button" class="action watch-now" aria-label="Watch now"></button>
    </div></div><span class="percentage">77%</span></div>
  </article>`;
}

export const SHOW_HTML = `
<main id="content">
  <section class="fanart-header with-stats">
    <div class="shadow-base"></div>
    <div class="summary">
      <div class="summary-title">
        <h1>Breaking Bad <span class="year">2008</span> <span class="certification">TV-MA</span></h1>
      </div>
      <div class="stats"><div class="stats-inner"><div class="ratings-strip"><ul>
        <li><a class="stat" href="/shows/breaking-bad/stats" aria-label="Trakt Rating 93%"><span class="glyph heart"></span></a></li>
        <li><a class="stat" href="https://www.imdb.com/title/tt0903747/ratings"><img class="logo imdb" alt="IMDb"></a></li>
        <li><a class="stat" href="https://www.themoviedb.org/tv/1396"><img class="logo tmdb" alt="TMDb"></a></li>
      </ul></div></div></div>
    </div>
  </section>

  <section class="summary-frame">
    <div class="container"><div class="columns">
      <aside class="sidebar"></aside>
      <div class="info" id="overview">
        <div class="top">
          <div class="details"><p class="overview">A chemistry teacher turns to crime.</p></div>
          <div class="actions"></div>
        </div>
      </div>
    </div></div>
  </section>

  <section class="seasons" aria-labelledby="seasons">
    <div class="heading"><h2 id="seasons"><strong>2</strong> Seasons</h2></div>
    <div class="poster-grid-frame">
      <article class="poster-card">
        <a class="poster" href="/shows/breaking-bad/seasons/1"><img alt=""></a>
        <a class="titles-link" href="/shows/breaking-bad/seasons/1"><h3>Season 1</h3></a>
        <a class="titles-link" href="/shows/breaking-bad/seasons/1"><span class="subtitle">7 episodes</span></a>
      </article>
      <article class="poster-card">
        <a class="poster" href="/shows/breaking-bad/seasons/2"><img alt=""></a>
        <a class="titles-link" href="/shows/breaking-bad/seasons/2"><h3>Season 2</h3></a>
        <a class="titles-link" href="/shows/breaking-bad/seasons/2"><span class="subtitle">13 episodes</span></a>
      </article>
    </div>
  </section>
</main>`;

export const MOVIE_HTML = `
<main id="content">
  <section class="fanart-header with-stats">
    <div class="summary">
      <div class="summary-title"><h1>The Dark <span class="year">2005</span></h1></div>
      <div class="stats"><div class="stats-inner"><div class="ratings-strip"><ul>
        <li><a class="stat" href="https://www.imdb.com/title/tt0465676/ratings"><img class="logo imdb" alt="IMDb"></a></li>
        <li><a class="stat" href="https://www.themoviedb.org/movie/8967"><img class="logo tmdb" alt="TMDb"></a></li>
      </ul></div></div></div>
    </div>
  </section>
  <section class="summary-frame">
    <div class="container"><div class="columns">
      <aside class="sidebar"></aside>
      <div class="info" id="overview">
        <div class="top"><div class="details"></div><div class="actions"></div></div>
      </div>
    </div></div>
  </section>
</main>`;

export const SEASON_HTML = `
<main id="content">
  <section class="episodes" aria-labelledby="episodes">
    <div class="heading"><h2 id="episodes"><strong>7</strong> Episodes</h2></div>
    <article class="row" aria-labelledby="episode-73484">
      <div class="rating-trigger"><span class="value">80%</span></div>
      <div class="info"><div class="titles"><h3 id="episode-73484">
        <a href="/shows/breaking-bad/seasons/1/episodes/3"><span class="number">1x03</span></a>
        <a href="/shows/breaking-bad/seasons/1/episodes/3">…And the Bag's in the River</a>
      </h3></div></div>
    </article>
    <article class="row" aria-labelledby="episode-73482">
      <div class="rating-trigger"><span class="value">83%</span></div>
      <div class="info"><div class="titles"><h3 id="episode-73482">
        <a href="/shows/breaking-bad/seasons/1/episodes/1"><span class="number">1x01</span></a>
        <a href="/shows/breaking-bad/seasons/1/episodes/1">Pilot</a>
      </h3></div></div>
    </article>
    <article class="row" aria-labelledby="episode-73485">
      <div class="rating-trigger"><span class="value">79%</span></div>
      <div class="info"><div class="titles"><h3 id="episode-73485">
        <a href="/shows/breaking-bad/seasons/1/episodes/4"><span class="number">1x04</span></a>
        <a href="/shows/breaking-bad/seasons/1/episodes/4">Cancer Man</a>
      </h3></div></div>
    </article>
    <article class="row" aria-labelledby="episode-73483">
      <div class="rating-trigger"><span class="value">81%</span></div>
      <div class="info"><div class="titles"><h3 id="episode-73483">
        <a href="/shows/breaking-bad/seasons/1/episodes/2"><span class="number">1x02</span></a>
        <a href="/shows/breaking-bad/seasons/1/episodes/2">Cat's in the Bag...</a>
      </h3></div></div>
    </article>
  </section>
</main>`;

/** Source-derived fallback: SummaryFrame/EpisodePage and ProgressList at trakt-og
 * 3bc2aae65d1a17d5c57360706b3f6745fcd10319. Live capture blocked by environment policy.
 * Keep provenance explicit; these are not captured live account pages. */
export const PLAYBACK_EPISODE_HTML = `
<main id="content">
  <section class="fanart-header with-stats"><div class="summary-title"><h1>Breaking Bad · Pilot</h1></div></section>
  <section class="summary-frame"><div class="container"><div class="columns">
    <aside class="sidebar" aria-label="Pilot"></aside>
    <div class="info" id="overview"><div class="top"><div class="details"><p>Pilot overview.</p></div><div class="actions"></div></div></div>
  </div></div></section>
</main>`;
export const PLAYBACK_PROGRESS_HTML = `
<main id="content">
  <nav aria-label="Progress"><a href="/users/tester/progress">Watching</a><a href="/users/tester/progress/rewatching">Rewatching</a><a href="/users/tester/progress/dropped">Dropped</a></nav>
  <section class="phone-strip" aria-label="Progress totals"></section>
  <section class="progress watched" aria-label="Watching" aria-busy="false"><div class="empty">No shows.</div></section>
</main>`;

export const PERSON_HTML = `
<h1>Watch Trakt on your phone</h1>
<div class="summary"><div><div class="summary-title"><h1>Bryan Cranston <!----></h1></div></div></div>`;

/** Trimmed Forvo search result with the current base64 Play(...) markup and audio host. */
export const FORVO_HTML = `
<div id="displayer"><div class="mainpage fullpage page_search">
  <article class="search_words"><div class="results_match"><ul class="word-play-list-icon-size-l">
    <li><div class="play" id="play_4991366" onclick="Play(4991366,'OTU3NDUyMi8zOS85NTc0NTIyXzM5XzQzMDc1ODUubXAz','OTU3NDUyMi8zOS85NTc0NTIyXzM5XzQzMDc1ODUub2dn',false,'','','l','Bryan Cranston','English');return false;"></div></li>
  </ul></div></article>
</div></div>
<script>var _AUDIO_HTTP_HOST='audio12.forvo.com';</script>`;

export const FORVO_EMPTY_HTML = `
<div id="displayer"><div class="mainpage fullpage page_search"><p>No words found</p></div></div>
<script>var _AUDIO_HTTP_HOST='audio12.forvo.com';</script>`;

export const FORVO_MULTI_HTML = `
<div id="displayer"><div class="mainpage fullpage page_search">
  <article class="search_words"><div class="results_match"><ul class="word-play-list-icon-size-l">
    <li><div class="play" id="play_4991366" onclick="Play(4991366,'OTU3NDUyMi8zOS85NTc0NTIyXzM5XzQzMDc1ODUubXAz','OTU3NDUyMi8zOS85NTc0NTIyXzM5XzQzMDc1ODUub2dn',false,'','','l','Bryan Cranston','English');return false;"></div></li>
    <li><div class="play" id="play_4991367" onclick="Play(4991367,'MjIyMjIyMi8yMi8yMjIyMjIyXzIyXzIyMjIyMjIubXAz','MjIyMjIyMi8yMi8yMjIyMjIyXzIyXzIyMjIyMjIub2dn',false,'','','l','Bryan Cranston','English');return false;"></div></li>
  </ul></div></article>
</div></div>
<script>var _AUDIO_HTTP_HOST='audio12.forvo.com';</script>`;

/** Live `/shows/breaking-bad/seasons/1` capture, 2026-11-02; trimmed to the show link, season heading,
 * external-id strip and summary mount anchors. The IMDb/TMDb links here are the show's. */
export const SEASON_PAGE_HTML = `
<main id="content">
  <section class="fanart-header with-stats">
    <div class="summary">
      <div class="summary-title">
        <div class="title-tags"><span class="part links">
          <a class="link" href="/shows/breaking-bad" rel="up">Breaking Bad</a>
        </span></div>
        <h1>Season 1 <span class="year">2008</span> <span class="certification">TV-MA</span></h1>
      </div>
      <div class="stats"><div class="stats-inner"><div class="ratings-strip"><ul>
        <li><a class="stat" href="https://www.imdb.com/title/tt0903747/episodes?season=1">IMDb</a></li>
        <li><a class="stat" href="https://www.themoviedb.org/tv/1396/season/1">TMDb</a></li>
      </ul></div></div></div>
    </div>
  </section>
  <section class="summary-frame">
    <div class="container"><div class="columns">
      <aside class="sidebar"></aside>
      <div class="info" id="overview"><div class="top"><div class="details"></div><div class="actions"></div></div></div>
    </div></div>
  </section>
  <section class="episodes"><article class="row"><span class="rating-trigger"><span class="value">83%</span></span></article></section>
</main>`;

/** Live `/shows/breaking-bad/seasons/1/episodes/1` capture, 2026-11-02; trimmed to the show/season
 * links, episode heading, external-id strip and summary mount anchors. IMDb here is the episode's. */
export const EPISODE_PAGE_HTML = `
<main id="content">
  <section class="fanart-header with-stats">
    <div class="summary">
      <div class="episode-title">
        <div class="title-tags"><span class="part links">
          <a class="link before-slash" href="/shows/breaking-bad">Breaking Bad</a>
          <a class="link after-slash" href="/shows/breaking-bad/seasons/1" rel="up">Season 1</a>
        </span></div>
        <h1><strong>1x01</strong> Pilot <span class="year">2008</span></h1>
      </div>
      <div class="stats"><div class="stats-inner"><div class="ratings-strip"><ul>
        <li><a class="stat" href="https://www.imdb.com/title/tt0959621/ratings">IMDb</a></li>
        <li><a class="stat" href="https://www.themoviedb.org/tv/1396/season/1/episode/1">TMDb</a></li>
      </ul></div></div></div>
    </div>
  </section>
  <section class="summary-frame">
    <div class="container"><div class="columns">
      <aside class="sidebar"></aside>
      <div class="info" id="overview"><div class="top"><div class="details"></div><div class="actions"></div></div></div>
    </div></div>
  </section>
  <section class="episodes"><article class="row"><span class="rating-trigger"><span class="value">83%</span></span></article></section>
</main>`;

// Live og.trakt.tv Breaking Bad capture, 2026-10-31; trimmed to semantic mount anchors.
export const LIVE_RATINGS_SEASON_HTML = "<section class=\"episodes\"><article class=\"row\"><span class=\"rating-trigger\"><span class=\"value\">83%</span></span><div class=\"titles\"><h3 class=\"\"><a href=\"/shows/breaking-bad/seasons/1/episodes/1\" class=\"\"><span class=\"number\">1x01</span></a> <!----><!--[-1--><a href=\"/shows/breaking-bad/seasons/1/episodes/1\" class=\"\">Pilot</a><!----><!----><!--]--><!----><!----></h3> <div class=\"meta\"><span class=\"tag-pills\"><!--[--><!--[-1--><!----><span class=\"pill primary\"><!--[-1--><!--]--><!--[-1-->January 21, 2008 2:00 AM<!--]--><!----></span><!----><!--]--><!--[-1--><!----><span class=\"pill\"><!--[-1--><!--]--><!--[-1-->59m<!--]--><!----></span><!----><!--]--><!--[-1--><!----><span class=\"pill colored\"><!--[-1--><!--]--><!--[-1-->Series Premiere<!--]--><!----></span><!----><!--]--><!--]--></span><!----></div></div></article><article class=\"row\"><span class=\"rating-trigger\"><span class=\"value\">83%</span></span></article><article class=\"row\"><span class=\"rating-trigger\"><span class=\"value\">81%</span></span><div class=\"titles\"><h3 class=\"\"><a href=\"/shows/breaking-bad/seasons/1/episodes/2\" class=\"\"><span class=\"number\">1x02</span></a> <!----><!--[-1--><a href=\"/shows/breaking-bad/seasons/1/episodes/2\" class=\"\">Cat's in the Bag...</a><!----><!----><!--]--><!----><!----></h3> <div class=\"meta\"><span class=\"tag-pills\"><!--[--><!--[-1--><!----><span class=\"pill primary\"><!--[-1--><!--]--><!--[-1-->January 28, 2008 2:00 AM<!--]--><!----></span><!----><!--]--><!--[-1--><!----><span class=\"pill\"><!--[-1--><!--]--><!--[-1-->49m<!--]--><!----></span><!----><!--]--><!--]--></span><!----></div></div></article><article class=\"row\"><span class=\"rating-trigger\"><span class=\"value\">81%</span></span></article><article class=\"row\"><span class=\"rating-trigger\"><span class=\"value\">80%</span></span><div class=\"titles\"><h3 class=\"\"><a href=\"/shows/breaking-bad/seasons/1/episodes/3\" class=\"\"><span class=\"number\">1x03</span></a> <!----><!--[-1--><a href=\"/shows/breaking-bad/seasons/1/episodes/3\" class=\"\">...And the Bag's in the River</a><!----><!----><!--]--><!----><!----></h3> <div class=\"meta\"><span class=\"tag-pills\"><!--[--><!--[-1--><!----><span class=\"pill primary\"><!--[-1--><!--]--><!--[-1-->February 11, 2008 2:00 AM<!--]--><!----></span><!----><!--]--><!--[-1--><!----><span class=\"pill\"><!--[-1--><!--]--><!--[-1-->49m<!--]--><!----></span><!----><!--]--><!--]--></span><!----></div></div></article><article class=\"row\"><span class=\"rating-trigger\"><span class=\"value\">80%</span></span></article><article class=\"row\"><span class=\"rating-trigger\"><span class=\"value\">79%</span></span><div class=\"titles\"><h3 class=\"\"><a href=\"/shows/breaking-bad/seasons/1/episodes/4\" class=\"\"><span class=\"number\">1x04</span></a> <!----><!--[-1--><a href=\"/shows/breaking-bad/seasons/1/episodes/4\" class=\"\">Cancer Man</a><!----><!----><!--]--><!----><!----></h3> <div class=\"meta\"><span class=\"tag-pills\"><!--[--><!--[-1--><!----><span class=\"pill primary\"><!--[-1--><!--]--><!--[-1-->February 18, 2008 2:00 AM<!--]--><!----></span><!----><!--]--><!--[-1--><!----><span class=\"pill\"><!--[-1--><!--]--><!--[-1-->49m<!--]--><!----></span><!----><!--]--><!--]--></span><!----></div></div></article></section>";

// Live og.trakt.tv Breaking Bad capture, 2026-10-31; trimmed to semantic mount anchors.
export const LIVE_RATINGS_SHOW_HTML = "<section class=\"seasons\"><article class=\"poster-card\"><a class=\"poster poster\" href=\"/shows/breaking-bad/seasons/5\"> <!--[-1--><!--]--> <!--[-1--><!--]--> <!--[-1--><!--]--> <!----></a><div class=\"quick-icons small\"><div class=\"actions\"><div class=\"tools\"></div></div> <button type=\"button\" class=\"rating-trigger card\" aria-label=\"Rate Season 5\"><span class=\"percentage\"><span class=\"value\">85%</span></span></button></div><a class=\"titles-link\" href=\"/shows/breaking-bad/seasons/5\"><h3 class=\"\"><!--[-1-->Season 5<!--]--></h3></a><a class=\"titles-link\" href=\"/shows/breaking-bad/seasons/5\"><span class=\"subtitle\"><!--[0-->16 episodes<!--]--></span></a></article><article class=\"poster-card\"><a class=\"poster poster\" href=\"/shows/breaking-bad/seasons/4\"> <!--[-1--><!--]--> <!--[-1--><!--]--> <!--[-1--><!--]--> <!----></a><div class=\"quick-icons small\"><div class=\"actions\"><div class=\"tools\"></div></div> <button type=\"button\" class=\"rating-trigger card\" aria-label=\"Rate Season 4\"><span class=\"percentage\"><span class=\"value\">85%</span></span></button></div><a class=\"titles-link\" href=\"/shows/breaking-bad/seasons/4\"><h3 class=\"\"><!--[-1-->Season 4<!--]--></h3></a><a class=\"titles-link\" href=\"/shows/breaking-bad/seasons/4\"><span class=\"subtitle\"><!--[0-->13 episodes<!--]--></span></a></article><article class=\"poster-card\"><a class=\"poster poster\" href=\"/shows/breaking-bad/seasons/3\"> <!--[-1--><!--]--> <!--[-1--><!--]--> <!--[-1--><!--]--> <!----></a><div class=\"quick-icons small\"><div class=\"actions\"><div class=\"tools\"></div></div> <button type=\"button\" class=\"rating-trigger card\" aria-label=\"Rate Season 3\"><span class=\"percentage\"><span class=\"value\">85%</span></span></button></div><a class=\"titles-link\" href=\"/shows/breaking-bad/seasons/3\"><h3 class=\"\"><!--[-1-->Season 3<!--]--></h3></a><a class=\"titles-link\" href=\"/shows/breaking-bad/seasons/3\"><span class=\"subtitle\"><!--[0-->13 episodes<!--]--></span></a></article><article class=\"poster-card\"><a class=\"poster poster\" href=\"/shows/breaking-bad/seasons/2\"> <!--[-1--><!--]--> <!--[-1--><!--]--> <!--[-1--><!--]--> <!----></a><div class=\"quick-icons small\"><div class=\"actions\"><div class=\"tools\"></div></div> <button type=\"button\" class=\"rating-trigger card\" aria-label=\"Rate Season 2\"><span class=\"percentage\"><span class=\"value\">85%</span></span></button></div><a class=\"titles-link\" href=\"/shows/breaking-bad/seasons/2\"><h3 class=\"\"><!--[-1-->Season 2<!--]--></h3></a><a class=\"titles-link\" href=\"/shows/breaking-bad/seasons/2\"><span class=\"subtitle\"><!--[0-->13 episodes<!--]--></span></a></article><article class=\"poster-card\"><a class=\"poster poster\" href=\"/shows/breaking-bad/seasons/1\"> <!--[-1--><!--]--> <!--[-1--><!--]--> <!--[-1--><!--]--> <!----></a><div class=\"quick-icons small\"><div class=\"actions\"><div class=\"tools\"></div></div> <button type=\"button\" class=\"rating-trigger card\" aria-label=\"Rate Season 1\"><span class=\"percentage\"><span class=\"value\">85%</span></span></button></div><a class=\"titles-link\" href=\"/shows/breaking-bad/seasons/1\"><h3 class=\"\"><!--[-1-->Season 1<!--]--></h3></a><a class=\"titles-link\" href=\"/shows/breaking-bad/seasons/1\"><span class=\"subtitle\"><!--[0-->7 episodes<!--]--></span></a></article></section>";

/** og.trakt.tv/users/justin/lists, signed out (trakt-og d41f511): the Lists dropdown, the Watchlist row and one personal list row. */
export const ALL_LISTS_HTML = `<div class="dropdown svelte-121basj" style="anchor-name: --dropdown-s13;"><button type="button" class="trigger default svelte-121basj" popovertarget="dropdown-s13"><span class="section svelte-121basj">Lists:</span> Personal <span class="caret svelte-1qkvb7r"><svg class="icon svelte-v7nk5l" viewBox="0 0 320 512" aria-hidden="true" focusable="false"><path fill="currentColor" d="M137 375Q147 384 160 384Q173 384 183 375L311 247Q325 231 318 212Q309 193 288 192L32 192Q11 193 2 212Q-5 231 9 247"></path></svg></span></button> <div id="dropdown-s13" class="menu svelte-121basj" popover="auto" role="presentation" style="position-anchor: --dropdown-s13; --check: url(&quot;data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20512%20512'%3e%3cpath%20fill='currentColor'%20d='M457%2078L440%2061Q427%2048%20409.50%2048Q392%2048%20380%2061L218%20223L133%20137Q120%20125%20102.50%20125Q85%20125%2073%20137L56%20154Q44%20167%2044%20184.50Q44%20202%2056%20214L218%20376L457%20137Q469%20125%20469%20107.50Q469%2090%20457%2078'/%3e%3c/svg%3e&quot;);"><ul><li class="header" role="presentation">Lists</li> <li><a href="/users/justin/lists" aria-current="page">Personal</a></li> <li><a href="/users/justin/smart-lists" aria-label="Smart lists">Smart</a></li> <li><a href="/users/justin/lists/collaborations">Collaborations</a></li></ul> <hr/> <ul><li class="header" role="presentation">Liked</li> <li><a href="/users/justin/lists/liked" aria-label="Liked personal lists">Personal</a></li> <li><a href="/users/justin/lists/liked/official" aria-label="Liked official lists">Official</a></li></ul></div></div>
<section class="lists svelte-wj9vv6" aria-labelledby="lists-heading"><div class="container svelte-93310j"><h2 id="lists-heading" class="visually-hidden">Justin's personal lists</h2>  <div> <article class="list-row svelte-vtg29f"><div class="card svelte-vtg29f"><div class="fan-frame svelte-vtg29f"> <a class="fan svelte-vtg29f" href="/users/justin/watchlist" tabindex="-1" aria-hidden="true"><span class="slot svelte-vtg29f" aria-describedby="tooltip-s20"><img class="poster svelte-vtg29f" src="https://media.trakt.tv/images/fixture.jpg.webp" alt="" loading="lazy" decoding="async"/></span><span id="tooltip-s20" class="tooltip top svelte-1eit85n" popover="hint" role="tooltip" style="position-anchor: --tooltip-s20;"><span class="tooltip-box top svelte-9t9j78"><span class="text svelte-1eit85n">Three Pines</span></span></span><span class="slot svelte-vtg29f" aria-describedby="tooltip-s21"><img class="poster svelte-vtg29f" src="https://media.trakt.tv/images/fixture.jpg.webp" alt="" loading="lazy" decoding="async"/></span><span id="tooltip-s21" class="tooltip top svelte-1eit85n" popover="hint" role="tooltip" style="position-anchor: --tooltip-s21;"><span class="tooltip-box top svelte-9t9j78"><span class="text svelte-1eit85n">Spider-Man: Beyond the Spider-Verse</span></span></span><span class="slot svelte-vtg29f" aria-describedby="tooltip-s22"><img class="poster svelte-vtg29f" src="https://media.trakt.tv/images/fixture.jpg.webp" alt="" loading="lazy" decoding="async"/></span><span id="tooltip-s22" class="tooltip top svelte-1eit85n" popover="hint" role="tooltip" style="position-anchor: --tooltip-s22;"><span class="tooltip-box top svelte-9t9j78"><span class="text svelte-1eit85n">National Treasure: Edge of History</span></span></span><span class="slot svelte-vtg29f" aria-describedby="tooltip-s23"><img class="poster svelte-vtg29f" src="https://media.trakt.tv/images/fixture.jpg.webp" alt="" loading="lazy" decoding="async"/></span><span id="tooltip-s23" class="tooltip top svelte-1eit85n" popover="hint" role="tooltip" style="position-anchor: --tooltip-s23;"><span class="tooltip-box top svelte-9t9j78"><span class="text svelte-1eit85n">The English</span></span></span><span class="slot svelte-vtg29f" aria-describedby="tooltip-s24"><img class="poster svelte-vtg29f" src="https://media.trakt.tv/images/fixture.jpg.webp" alt="" loading="lazy" decoding="async"/></span><span id="tooltip-s24" class="tooltip top svelte-1eit85n" popover="hint" role="tooltip" style="position-anchor: --tooltip-s24;"><span class="tooltip-box top svelte-9t9j78"><span class="text svelte-1eit85n">Willow</span></span></span></a>  </div> <div class="body svelte-vtg29f"><div class="head svelte-vtg29f"><a class="name-link svelte-vtg29f" href="/users/justin/watchlist"><h3 class="svelte-vtg29f">Watchlist</h3></a> <span class="chips svelte-vtg29f"> <span class="tag tint svelte-1axs3vw"><svg class="icon svelte-v7nk5l" viewBox="0 0 384 512" aria-hidden="true" focusable="false"><path fill="currentColor" d="M0 48L0 488L0 48L0 488Q2 510 24 512Q32 512 38 508L192 400L346 508Q352 512 360 512Q382 510 384 488L384 48Q383 28 370 14Q356 1 336 0L48 0Q28 1 14 14Q1 28 0 48"></path></svg>Watchlist</span>    </span></div> <p class="by svelte-vtg29f"><a class="owner svelte-vtg29f" href="/users/justin"><span class="avatar svelte-vtg29f"><img src="https://media.trakt.tv/images/fixture.jpg.webp" alt="" class="svelte-vtg29f"/></span>Justin</a> <span class="label-vip compact pill svelte-lytdbn"><span class="name svelte-lytdbn"><span class="mark svelte-lytdbn"><svg class="icon svelte-v7nk5l" viewBox="0 0 512 512" aria-hidden="true" focusable="false"><path fill="currentColor" d="M104 363Q133 394 172 412Q211 430 256 430Q279 430 300.50 425Q322 420 342 411L199 269L104 363M198 182L90 290L76 276L323 29Q307 24 290 21Q273 18 256 18Q213 18 176 34Q138 50 110 78Q82 106 66 144Q50 181 50 224Q50 259 61 290.50Q72 322 91 348L199 240L206 247L361 401Q363 400 365.50 398.50Q368 397 370 396L199 225L95 329L81 314L199 196L206 203L387 383Q389 382 391 380Q393 378 395 377L200 182L198 182M360 64L242 182L228 167L346 49L360 64M263 204L249 190L351 88L366 102L263 204M409 362Q434 335 448 299.50Q462 264 462 224Q462 162 429 112Q396 62 343 37L214 167L409 362M256-6Q208-6 166 12Q124 30 93 61Q62 92 44 134Q26 176 26 224Q26 272 44 314Q62 356 93 387Q124 418 166 436Q208 454 256 454Q304 454 346 436Q388 418 419 387Q450 356 468 314Q486 272 486 224Q486 176 468 134Q450 92 419 61Q388 30 346 12Q304-6 256-6M256 480Q203 480 156 460Q110 440 75 405Q40 370 20 324Q0 277 0 224Q0 171 20 124Q40 78 75 43Q110 8 156-12Q203-32 256-32Q309-32 356-12Q402 8 437 43Q472 78 492 124Q512 171 512 224Q512 277 492 324Q472 370 437 405Q402 440 356 460Q309 480 256 480"></path></svg></span>Director</span>  </span></p> <div class="overview svelte-vtg29f"><div class="clamp svelte-vtg29f"><div class="comment-text svelte-1mv903h"><p class="svelte-1mv903h">Movies, shows, seasons, and episodes I plan to watch.</p></div></div></div> <footer class="foot svelte-vtg29f"><div class="counts svelte-vtg29f"> <a href="/users/justin/watchlist" class="count svelte-1c8x1ot"><svg class="icon svelte-v7nk5l" viewBox="0 0 384 512" aria-hidden="true" focusable="false"><path fill="currentColor" d="M320 464Q335 463 336 448L336 160L256 160Q242 160 233 151Q224 142 224 128L224 48L64 48Q49 49 48 64L48 448Q49 463 64 464L320 464M0 64Q1 37 19 19Q37 1 64 0L230 0Q256 0 275 19L365 109Q384 128 384 155L384 448Q383 475 365 493Q347 511 320 512L64 512Q37 511 19 493Q1 475 0 448"></path></svg><strong class="svelte-1c8x1ot">316</strong><span class="count-text svelte-1c8x1ot">items</span></a>  </div> <div class="tools svelte-vtg29f">     <span class="share svelte-vtg29f"><button type="button" class="share normal svelte-1iqgfs3" aria-label="Copy Link" aria-describedby="tooltip-s25"><svg class="icon svelte-v7nk5l" viewBox="0 0 448 512" aria-hidden="true" focusable="false"><path fill="currentColor" d="M241 7Q224-7 207 7L79 135Q65 152 79 169Q96 183 113 169L200 82L200 328Q202 350 224 352Q246 350 248 328L248 82L335 169Q352 183 369 169Q383 152 369 135L241 7M48 344Q46 322 24 320Q2 322 0 344L0 424Q1 461 26 486Q51 511 88 512L360 512Q397 511 422 486Q447 461 448 424L448 344Q446 322 424 320Q402 322 400 344L400 424Q400 441 388 452Q377 464 360 464L88 464Q71 464 60 452Q48 441 48 424"></path></svg></button><span id="tooltip-s25" class="tooltip top svelte-1eit85n" popover="hint" role="tooltip" style="position-anchor: --tooltip-s25;"><span class="tooltip-box top svelte-9t9j78"><span class="text svelte-1eit85n">Copy Link</span></span></span></span></div></footer></div></div></article><article class="list-row svelte-vtg29f"><div class="card svelte-vtg29f"><div class="fan-frame svelte-vtg29f"><span class="rank-anchor svelte-vtg29f"><p class="rank svelte-tvo534">2</p></span> <a class="fan svelte-vtg29f" href="/users/justin/lists/all-time-favorite-movies" tabindex="-1" aria-hidden="true"><span class="slot svelte-vtg29f"><img class="poster svelte-vtg29f" src="https://media.trakt.tv/images/fixture.jpg.webp" alt="" loading="lazy" decoding="async"/></span><span class="slot svelte-vtg29f"><img class="poster svelte-vtg29f" src="https://media.trakt.tv/images/fixture.jpg.webp" alt="" loading="lazy" decoding="async"/></span><span class="slot svelte-vtg29f"><img class="poster svelte-vtg29f" src="https://media.trakt.tv/images/fixture.jpg.webp" alt="" loading="lazy" decoding="async"/></span><span class="slot svelte-vtg29f"><img class="poster svelte-vtg29f" src="https://media.trakt.tv/images/fixture.jpg.webp" alt="" loading="lazy" decoding="async"/></span><span class="slot svelte-vtg29f"><img class="poster svelte-vtg29f" src="https://media.trakt.tv/images/fixture.jpg.webp" alt="" loading="lazy" decoding="async"/></span></a>  </div> <div class="body svelte-vtg29f"><div class="head svelte-vtg29f"><a class="name-link svelte-vtg29f" href="/users/justin/lists/all-time-favorite-movies"><h3 class="svelte-vtg29f">All Time Favorite Movies</h3></a> </div> <p class="by svelte-vtg29f"><a class="owner svelte-vtg29f" href="/users/justin"><span class="avatar svelte-vtg29f"><img src="https://media.trakt.tv/images/fixture.jpg.webp" alt="" class="svelte-vtg29f"/></span>Justin</a> <span class="label-vip compact pill svelte-lytdbn"><span class="name svelte-lytdbn"><span class="mark svelte-lytdbn"><svg class="icon svelte-v7nk5l" viewBox="0 0 512 512" aria-hidden="true" focusable="false"><path fill="currentColor" d="M104 363Q133 394 172 412Q211 430 256 430Q279 430 300.50 425Q322 420 342 411L199 269L104 363M198 182L90 290L76 276L323 29Q307 24 290 21Q273 18 256 18Q213 18 176 34Q138 50 110 78Q82 106 66 144Q50 181 50 224Q50 259 61 290.50Q72 322 91 348L199 240L206 247L361 401Q363 400 365.50 398.50Q368 397 370 396L199 225L95 329L81 314L199 196L206 203L387 383Q389 382 391 380Q393 378 395 377L200 182L198 182M360 64L242 182L228 167L346 49L360 64M263 204L249 190L351 88L366 102L263 204M409 362Q434 335 448 299.50Q462 264 462 224Q462 162 429 112Q396 62 343 37L214 167L409 362M256-6Q208-6 166 12Q124 30 93 61Q62 92 44 134Q26 176 26 224Q26 272 44 314Q62 356 93 387Q124 418 166 436Q208 454 256 454Q304 454 346 436Q388 418 419 387Q450 356 468 314Q486 272 486 224Q486 176 468 134Q450 92 419 61Q388 30 346 12Q304-6 256-6M256 480Q203 480 156 460Q110 440 75 405Q40 370 20 324Q0 277 0 224Q0 171 20 124Q40 78 75 43Q110 8 156-12Q203-32 256-32Q309-32 356-12Q402 8 437 43Q472 78 492 124Q512 171 512 224Q512 277 492 324Q472 370 437 405Q402 440 356 460Q309 480 256 480"></path></svg></span>Director</span>  </span></p> <div class="overview svelte-vtg29f"><div class="clamp svelte-vtg29f"><div class="comment-text svelte-1mv903h"><p class="svelte-1mv903h">My favorite movies throughout my entire movie watching career.</p></div></div></div> <footer class="foot svelte-vtg29f"><div class="counts svelte-vtg29f"><button type="button" aria-label="Like this list: 81 likes" aria-disabled="false" aria-describedby="tooltip-s44" class="glass-action glass card svelte-14tbi60" style="--glass-action-icon: var(--color-list-card-like);"><span class="icon svelte-14tbi60"><svg class="icon svelte-v7nk5l" viewBox="0 0 512 512" aria-hidden="true" focusable="false"><path fill="currentColor" d="M324 35Q294 27 269 41Q244 55 235 84L229 104Q223 124 210 139L158 196Q145 213 160 230Q178 243 194 228L245 172Q266 148 275 117L281 97Q289 77 311 81Q331 89 327 111L321 131Q313 161 295 186Q287 198 293 211Q300 224 314 224L448 224Q463 225 464 240Q463 251 454 255Q442 260 439 272Q436 284 444 293Q448 298 448 304Q447 317 435 320Q422 323 417 335Q413 348 421 358Q424 362 424 368Q423 379 414 383Q395 392 399 412Q400 414 400 416Q399 431 384 432L287 432Q267 432 251 421L189 380Q170 370 156 387Q145 406 163 420L224 461Q253 480 287 480L384 480Q411 480 429 462Q447 445 448 418Q471 400 472 368Q472 361 471 355Q495 337 496 304Q496 294 493 285Q511 267 512 240Q511 213 493 195Q475 177 448 176L356 176Q363 160 368 144L373 124Q381 94 367 69Q353 44 324 35M32 192Q18 192 9 201Q0 210 0 224L0 448Q0 462 9 471Q18 480 32 480L96 480Q110 480 119 471Q128 462 128 448L128 224Q128 210 119 201Q110 192 96 192"></path></svg></span> <span><span class="number svelte-ikpv7f">81</span><span class="count-text"> likes</span></span></button><span id="tooltip-s44" class="tooltip top svelte-1eit85n" popover="hint" role="tooltip" style="position-anchor: --tooltip-s44;"><span class="tooltip-box top svelte-9t9j78"><span class="text svelte-1eit85n">Like this list</span></span></span> <a href="/users/justin/lists/all-time-favorite-movies" class="count svelte-1c8x1ot"><svg class="icon svelte-v7nk5l" viewBox="0 0 384 512" aria-hidden="true" focusable="false"><path fill="currentColor" d="M320 464Q335 463 336 448L336 160L256 160Q242 160 233 151Q224 142 224 128L224 48L64 48Q49 49 48 64L48 448Q49 463 64 464L320 464M0 64Q1 37 19 19Q37 1 64 0L230 0Q256 0 275 19L365 109Q384 128 384 155L384 448Q383 475 365 493Q347 511 320 512L64 512Q37 511 19 493Q1 475 0 448"></path></svg><strong class="svelte-1c8x1ot">38</strong><span class="count-text svelte-1c8x1ot">items</span></a>  <a href="/users/justin/lists/all-time-favorite-movies/comments" class="count svelte-1c8x1ot" style="--count-icon: var(--color-stat-comments);"><svg class="icon svelte-v7nk5l" viewBox="0 0 640 512" aria-hidden="true" focusable="false"><path fill="currentColor" d="M208 352Q296 350 355 300Q414 251 416 176Q414 101 355 52Q296 2 208 0Q120 2 61 52Q2 101 0 176Q1 235 40 279Q34 294 25 304Q18 313 12 318Q9 321 8 322Q7 323 7 323L6 323Q-2 330 1 341Q5 351 16 352Q50 351 78 340Q92 334 103 328Q150 351 208 352M448 176Q445 262 384 318Q322 374 232 383Q251 440 305 475Q359 511 432 512Q490 511 537 488Q548 494 562 500Q590 511 624 512Q635 511 639 501Q642 490 633 483Q633 483 633 482Q632 482 632 482Q631 481 628 478Q622 473 615 464Q606 453 600 439Q639 395 640 336Q638 265 584 216Q530 167 447 160Q448 168 448 176"></path></svg><strong class="svelte-1c8x1ot">0</strong><span class="count-text svelte-1c8x1ot">comments</span></a></div> <div class="tools svelte-vtg29f">     <span class="share svelte-vtg29f"><button type="button" class="share normal svelte-1iqgfs3" aria-label="Copy Link" aria-describedby="tooltip-s45"><svg class="icon svelte-v7nk5l" viewBox="0 0 448 512" aria-hidden="true" focusable="false"><path fill="currentColor" d="M241 7Q224-7 207 7L79 135Q65 152 79 169Q96 183 113 169L200 82L200 328Q202 350 224 352Q246 350 248 328L248 82L335 169Q352 183 369 169Q383 152 369 135L241 7M48 344Q46 322 24 320Q2 322 0 344L0 424Q1 461 26 486Q51 511 88 512L360 512Q397 511 422 486Q447 461 448 424L448 344Q446 322 424 320Q402 322 400 344L400 424Q400 441 388 452Q377 464 360 464L88 464Q71 464 60 452Q48 441 48 424"></path></svg></button><span id="tooltip-s45" class="tooltip top svelte-1eit85n" popover="hint" role="tooltip" style="position-anchor: --tooltip-s45;"><span class="tooltip-box top svelte-9t9j78"><span class="text svelte-1eit85n">Copy Link</span></span></span></span></div></footer></div></div></article></div></div></section>`;
