import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  const SITE_META = {
    title: "RHEA Finance",
    image: "https://img.rhea.finance/images/rhea-twitter-share3.png",
    url: "https://app.rhea.finance",
  };
  return (
    <Html lang="en">
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <meta
          name="description"
          content="The first DEX on NEAR. The Chain-Abstracted Liquidity Solution. NEAR wallet to store, buy, send and stake assets for DeFi."
        />
        <meta
          name="keywords"
          content="NEAR DEX,DEX on NEAR,Top dex on NEAR, DEX, Swap, LP, Farming"
        />
        <meta
          name="twitter:title"
          content={SITE_META.title}
          key="twitter-title"
        />
        <meta
          name="twitter:site"
          content={SITE_META.title}
          key="twitter-site"
        />
        <meta
          name="twitter:image"
          content={SITE_META.image}
          key="twitter-image"
        />
        <meta
          name="twitter:image:src"
          content={SITE_META.image}
          key="twitter-image-src"
        />
        <meta name="twitter:card" content="summary_large_image" />

        <meta property="og:url" content={SITE_META.url} />
        <meta property="og:title" content={SITE_META.title} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_META.title} />
        <meta property="og:image" content={SITE_META.image} key="og-image" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest"></link>
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
