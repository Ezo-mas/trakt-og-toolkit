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
