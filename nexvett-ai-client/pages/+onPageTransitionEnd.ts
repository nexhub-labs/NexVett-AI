export async function onPageTransitionEnd() {
  console.log("Page transition end");
  document.body.classList.remove("page-transition");

  if (typeof window.gtag === 'function' && import.meta.env.VITE_GOOGLE_ANALYTICS_ID) {
    window.gtag('config', import.meta.env.VITE_GOOGLE_ANALYTICS_ID, {
      page_path: window.location.pathname,
    });
  }
}
