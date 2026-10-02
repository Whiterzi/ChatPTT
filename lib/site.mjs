const fallbackOrigin = 'https://chatptt.iswhiter.net';
const configuredOrigin = typeof __CHATPTT_SITE_ORIGIN__ !== 'undefined' ? __CHATPTT_SITE_ORIGIN__ : typeof process !== 'undefined' ? process.env.CHATPTT_ORIGIN || fallbackOrigin : fallbackOrigin;
const siteUrl = new URL(configuredOrigin);
if (!['http:', 'https:'].includes(siteUrl.protocol) || siteUrl.username || siteUrl.password || siteUrl.pathname !== '/' || siteUrl.search || siteUrl.hash) throw new Error('CHATPTT_ORIGIN must be an HTTP(S) origin without a path, query or fragment.');

export const SITE = {
  name: 'ChatPTT',
  origin: siteUrl.origin,
  title: 'ChatPTT — 用聊天介面逛 PTT｜看板、作者與推文搜尋',
  description: 'ChatPTT 是免費、免登入的 PTT 網頁瀏覽器。用熟悉的聊天介面閱讀看板、文章與推文，支援作者搜尋、推文分數篩選、圖片大小切換與低調工作模式。',
};
export const siteStructuredData = JSON.stringify({
  '@context': 'https://schema.org', '@type': 'WebSite',
  name: SITE.name, alternateName: 'ChatPTT PTT 瀏覽器',
  url: SITE.origin + '/', description: SITE.description, inLanguage: 'zh-Hant-TW',
});
const escape = text => text.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function seoHead(page = '/') {
  const title = page === '/about' ? '關於 ChatPTT｜PTT 聊天瀏覽器與使用說明' : SITE.title;
  const description = page === '/about' ? '認識 ChatPTT：用聊天介面閱讀 PTT，搜尋作者與推文分數、調整圖片預覽，了解低調模式、資料來源與閱讀隱私。' : SITE.description;
  const url = SITE.origin + page;
  return `<title>${escape(title)}</title>
    <meta name="description" content="${escape(description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta name="theme-color" content="#161616" />
    <meta name="application-name" content="ChatPTT" />
    <meta name="apple-mobile-web-app-title" content="ChatPTT" />
    <link rel="canonical" href="${url}" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico?v=2" sizes="16x16 32x32 48x48" />
    <link rel="icon" type="image/png" href="/favicon.png?v=2" sizes="96x96" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg?v=2" sizes="any" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" sizes="180x180" />
    <link rel="manifest" href="/site.webmanifest" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="zh_TW" />
    <meta property="og:site_name" content="ChatPTT" />
    <meta property="og:title" content="${escape(title)}" />
    <meta property="og:description" content="${escape(description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${SITE.origin}/social-card.png" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="ChatPTT — 用對話逛 PTT，支援作者搜尋、推文分數篩選與圖片預覽" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escape(title)}" />
    <meta name="twitter:description" content="${escape(description)}" />
    <meta name="twitter:image" content="${SITE.origin}/social-card.png" />
    <meta name="twitter:image:alt" content="ChatPTT — 用對話逛 PTT" />
    <script type="application/ld+json">${siteStructuredData}</script>`;
}
