# Visavis — сайт

Публічний сайт та особисті кабінети мережі салонів краси Visavis (Харків).
Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Prisma/PostgreSQL, Redis.

Референс дизайну: [@salon_vis_a_vis](https://www.instagram.com/salon_vis_a_vis) — тьмяний преміум, чорний фон із золотим акцентом.

## Стек

- **Next.js 16** (App Router, Turbopack), React 19, TypeScript
- **Tailwind CSS v4** (CSS-first конфіг у `src/app/globals.css`, без `tailwind.config.*`)
- **Prisma** (`prisma/schema.prisma`) + **PostgreSQL** (Railway) — спільна БД з `Visavis_bot`
- **Redis** (`src/lib/redis.ts`, Railway) — rate-limiting, кеш, черга нагадувань — спільний з ботом
- Шрифти: Playfair Display (заголовки) + Inter (текст), обидва з підтримкою кирилиці

## Початок роботи

```bash
npm install
cp .env.example .env   # заповнити DATABASE_URL / REDIS_URL перед реальною роботою з БД
npx prisma generate
npm run dev
```

Сайт буде доступний на [http://localhost:3000](http://localhost:3000) (або наступному вільному порту).

## Структура

```
src/
  app/                 # маршрути App Router (публічні сторінки)
  components/
    layout/            # хедер, футер, мобільне меню
    sections/          # секції головної сторінки
    ui/                # переиспользуемые примітиви (Button, Container, Reveal, ...)
  lib/
    data/              # placeholder-контент каталогу/команди/філій/відгуків
                        # (замінити на реальні дані з БД у Stage 2+)
    prisma.ts          # синглтон Prisma Client
    redis.ts           # синглтон ioredis
    rate-limit.ts      # rate-limit хелпер на Redis (для майбутніх /api/auth, /api/booking)
prisma/
  schema.prisma        # повна схема БД: філії, послуги, майстри, графік, бронювання,
                        # відгуки, лог нотифікацій, транзакції (заділ під оплату), аудит-лог
```

## Поточний стан (Етап 0–1 з майстер-плану)

Готово:
- дизайн-система (кольори, типографіка, компоненти) і публічні сторінки (`/`, `/services`, `/masters`, `/locations`, `/reviews`) на placeholder-контенті українською;
- SEO-фундамент: SSG для каталогу/майстрів, унікальні meta, JSON-LD (BeautySalon/Service/Person), `sitemap.ts`, `robots.ts`;
- Prisma-схема під мультифіліальну модель, графік майстрів (регулярний + разові зміни), бронювання, відгуки, лог нотифікацій та заділ під оплату.

Не входить у цей етап (наступні кроки за майстер-планом):
- онлайн-запис (візард), OTP-авторизація, особисті кабінети клієнта/майстра/адміна — Етап 2–5;
- інтеграція з Visavis_bot через спільну БД;
- реальний контент і фото від замовника (зараз усюди explicit placeholder-дані з `src/lib/data`).

## Безпека

- Секрети — лише через `.env` (не комітиться, є `.env.example`) / Railway env vars.
- Заготовлений `rateLimit()` на Redis для майбутніх публічних `/api/*` (OTP, booking).
- У Prisma-схемі є `AdminAuditLog` під аудит дій адміна.
- `prisma`/`@prisma/client` навмисно закріплені на стабільній лінійці 6.x — останній `latest`-тег (8.0.0-rc) тягне експериментальні залежності з відкритими CVE в CLI-тулінгу.
- Критичні пакети (`prisma`, `@prisma/client`, `jose`, `bcryptjs`, `ioredis`) закріплені на точних версіях у `package.json` (без `^`) — оновлення лише свідомо, руками, а не автоматично першим-ліпшим `npm install`. `next`, `react`, `react-dom` теж без діапазону з тієї ж причини.
- `.npmrc` містить `audit=true` — `npm install` завжди друкує звіт `npm audit`, а не лише за явним викликом.
- Регулярна перевірка: `npm audit` (без прапорців — подивитись, нічого не чіпаючи). Якщо є фікс без брейкінг-чейнджів: `npm audit fix`. Ніколи не запускати `npm audit fix --force` наосліп на цьому проєкті — для `prisma`/`@prisma/client` це може відкотити версію нижче свідомо закріпленої (див. пункт вище); спочатку прочитати, що саме він хоче змінити.
  - Відомий поточний стан: `npm audit` показує high-severity в `deepmerge-ts` (транзитивна залежність `@prisma/config`, яку використовує лише CLI `prisma` під час `migrate`/`generate` — не входить у рантайм `@prisma/client`, що виконується на сервері). Форс-фікс тягне за собою даунгрейд `prisma` до `6.12.0`. Поки апстрім не випустить патч-версію в лінійці 6.19.x, свідомо залишено як є — ризик у продакшн-рантаймі відсутній, а даунгрейд коштує дорожче за саму вразливість.
  - Другий відомий пункт: moderate `uuid <11.1.1` через `exceljs` (xlsx-експорт звітів). Advisory стосується виключно виклику `v3`/`v5`/`v6` з явним параметром `buf` без перевірки довжини — `exceljs` викликає лише `uuid.v4()` без аргументів (`node_modules/exceljs/lib/xlsx/xform/sheet/cf-ext/cf-rule-ext-xform.js`), тобто вразливий код-шлях у проєкті недосяжний. Форс-фікс відкотив би `exceljs` до `3.4.0` (брейкінг-чейндж) заради непридатного до експлуатації пункту — свідомо залишено як є.
