"use client";

import "./globals.css";

// Last-resort boundary: replaces the root layout when it crashes, so it must
// render its own <html>/<body> and can't rely on fonts, nav or animations.
// No locale is known here, so it speaks both languages.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">Erreur critique · Critical error</p>
        <h1 className="text-6xl font-semibold tracking-tight sm:text-8xl">500</h1>
        <p className="max-w-md text-muted">
          La page de statut n&apos;a pas pu se charger. Réessayez dans un instant.
          <br />
          <span lang="en">The status page failed to load. Please try again in a moment.</span>
        </p>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={reset}
            className="cursor-pointer rounded-full bg-accent px-8 py-4 text-background"
          >
            Réessayer · Retry
          </button>
          {/* Plain <a>: the router may be unusable at this point. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="rounded-full border border-foreground/20 px-8 py-4">
            Accueil
          </a>
        </div>
      </body>
    </html>
  );
}
