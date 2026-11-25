<template>
  <main class="container py-8 sm:py-12">
    <div class="max-w-prose flex flex-col gap-8">
      <div class="flex flex-col gap-2">
        <h1 class="text-lg font-mono text-fg">about</h1>
        <p class="text-sm text-fg-muted">track is a log of the movies and shows you watch.</p>
      </div>

      <!-- TMDB's API terms require its logo and this notice in an "About" or
           "Credits" section. Trakt's app review required the Trakt notice. -->
      <section class="flex flex-col gap-3" aria-labelledby="credits">
        <h2 id="credits" class="text-xs font-mono text-fg-muted">credits</h2>
        <a href="https://www.themoviedb.org" class="self-start focus-ring rounded">
          <img src="/tmdb.svg" alt="TMDB" width="137" height="18" />
        </a>
        <p class="text-sm text-fg-muted">
          This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise
          approved by TMDB.
        </p>
        <p class="text-sm text-fg-muted">
          movies.rising.sh uses Trakt but is not endorsed or certified by Trakt.
        </p>
      </section>

      <a
        class="self-start text-sm font-mono quiet-link underline underline-offset-2"
        href="https://rising.sh/privacy/#movies"
        >privacy policy</a
      >
    </div>
  </main>
</template>
