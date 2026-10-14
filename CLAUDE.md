# MyMind Web (frontend)

Maqola platformasining Angular ilovasi. Backend (`my-mind`) va deploy (`ci-cd`) alohida repolarda.
Loyiha hujjati: https://claude.ai/code/artifact/bc7af302-472b-403d-8183-42299d926533

## Stek

Angular 22 + SSR (`@angular/ssr`, hydration), signals, Tailwind CSS v4 (`src/styles.css`, PostCSS), `@angular/localize`, TipTap 3 (muharrir), Vitest.

## Buyruqlar

```
npm ci
npx ng serve                 # http://localhost:4200; /api → http://localhost:5071 (proxy.conf.json)
npx ng build
npx ng test --watch=false
npx prettier --check .
```

## Qoidalar

- Render rejimlari `src/app/app.routes.server.ts` da: ommaviy sahifalar `Server`, `/me/*` va auth `Client`, statik sahifalar `Prerender` (hujjat 9.1).
- API manzili faqat `API_BASE_URL` token orqali (`src/app/core/api-base-url.ts`); brauzerda `/api`, SSR'da `API_URL` env.
- `bypassSecurityTrustHtml` faqat `SafeArticleHtml` pipe ichida ishlatiladi.
- Foydalanuvchiga ko'rinadigan matnlar o'zbek tilida (lotin), `i18n` / `$localize` ichida.
- Komponent stillari CSS (Sass emas — Tailwind v4 bilan mos emas); dark mode `.dark` klassi orqali.
- `src/server.ts`: `trustProxyHeaders` faqat Caddy o'rnatadigan sarlavhalar uchun.
