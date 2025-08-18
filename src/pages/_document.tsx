import Document, { Html, Head, Main, NextScript } from "next/document";

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="fr">
        <Head>
          {/* Google Fonts - Inter pour une typographie moderne */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
            rel="stylesheet"
          />

          {/* Meta tags pour améliorer le référencement */}
          <meta
            name="description"
            content="PixelWar - Canvas collaboratif en temps réel pour créer de l'art pixel par pixel"
          />
          <meta
            name="keywords"
            content="pixel art, canvas, collaboratif, temps réel, dessin, créatif"
          />
          <meta name="author" content="PixelWar Team" />

          {/* Favicons et icônes */}
          <link rel="icon" href="/favicon.ico" />
          <meta name="theme-color" content="#acfaf5" />

          {/* Open Graph pour les réseaux sociaux */}
          <meta property="og:title" content="PixelWar - Canvas Collaboratif" />
          <meta
            property="og:description"
            content="Créez de l'art pixel par pixel dans un canvas collaboratif en temps réel"
          />
          <meta property="og:type" content="website" />
          <meta property="og:image" content="/HUB-RP.webp" />

          {/* Twitter Card */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="PixelWar - Canvas Collaboratif" />
          <meta
            name="twitter:description"
            content="Créez de l'art pixel par pixel dans un canvas collaboratif en temps réel"
          />
        </Head>
        <body className="antialiased">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
