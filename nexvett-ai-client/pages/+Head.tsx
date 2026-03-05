// https://vike.dev/Head

import { ColorSchemeScript } from "@mantine/core";
import logoUrl from "../assets/logo.webp";

export function Head() {
  return (
    <>
      <link rel="icon" href={logoUrl} />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Outfit:wght@100..900&display=swap" rel="stylesheet" />
      <ColorSchemeScript />
      {import.meta.env.VITE_GOOGLE_ANALYTICS_ID && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${import.meta.env.VITE_GOOGLE_ANALYTICS_ID}`}></script>
          <script dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${import.meta.env.VITE_GOOGLE_ANALYTICS_ID}', {
                send_page_view: false
              });
            `
          }} />
        </>
      )}
    </>
  );
}
