/** Trimmed, hand-written mirrors of the real og markup these selectors rely on. */

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
