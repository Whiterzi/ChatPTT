# ChatPTT

用聊天介面閱讀 PTT 公開看板、文章與推文。React / Vinext / Cloudflare Workers。

## 開發

```sh
npm install
npm run dev
```

## 使用

- 點常逛看板，或輸入 `看一下 C_Chat`。首次閱讀需自行確認年齡。
- `搜尋 鋼彈`：搜尋目前看板的文章標題。
- `再多一點`：讀取更多文章。
- `大家怎麼說？`：展開最近閱讀文章的推文。
- 貼上 `https://www.ptt.cc/bbs/.../M....html`：直接開啟文章。
- 低調模式或 Esc：隱藏看板代號、推噓數和 PTT 頁籤標題。

這是瀏覽指令介面，沒有串接 AI，沒有登入、發文或推文功能。對話只存在目前分頁；年齡確認和顯示偏好保存在目前瀏覽器。PTT 的文章與推文網頁可能延遲更新；後端僅快取 30 秒。原文圖片以連結呈現。

## 驗證

```sh
npx tsc --noEmit
node scripts/verify-live.mjs
npm run build
```

`verify-live.mjs` 需先啟動本機 5173 開發伺服器；以公開資料檢查列表、文章、推文、搜尋、翻頁與輸入驗證，不發布內容。

API 僅允許固定 PTT 網域、合法看板/文章/頁碼；外部 HTML 解析成文字後交由 React 跳脫呈現，不執行來源腳本。圖片與外部連結不會預先下載。
