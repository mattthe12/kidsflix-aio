# KidsFlix 🌈

A complete kids' streaming app — **React Native + Expo + TypeScript**, with real video
playback, real accounts, kid profiles, parental controls, screen-time limits, offline
downloads and a parent dashboard behind a PIN.

Built for phones, tablets and TV-sized screens with a big, colourful, cartoon-friendly
interface. No ads, no chat, no comments, no social features.

**Version 2.0** adds a shared responsive system, a redesigned profile editor and emoji
picker, curated collections, My Cartoon World, richer home rows, smarter search, player
controls and parent analytics. Everything from 1.x is still here.

---

## What actually works

### Kids' experience
- **Animated welcome screen** with mascots and a soft entrance animation.
- **Home**: greeting, featured banner, My Cartoon World, Continue Watching (with real resume
  position), featured collections, Trending, Popular, New Arrivals, Recommended, Because You
  Watched, Learning recommendations, Bedtime picks, Recently Added, Favorites, recently watched,
  category bubbles and skeleton loading.
- **My Cartoon World**: choose a buddy and up to four favourite characters, see favourite worlds,
  a watchlist and recent cartoons; saved per profile.
- **Featured collections**: eight curated collections (Classic Cartoons, Animal Adventures, Funny
  Cartoons, Space Adventures, Fairy Tales, Learning Adventures, Bedtime Stories, Family Favorites)
  built only from real catalogue titles and filtered by the child's age level.
- **Shows & Movies** tab: search entry, category cards, filters, full responsive grid.
- **Learning Zone**: six learning paths (alphabet, numbers, science, reading, geography,
  quizzes) plus Bedtime Zone shortcuts.
- **Favorites** tab: favorites grid, watchlist rail, recently watched, downloads shortcut.
- **Browse by category**: every one of the 27 subcategories from the brief, with rails.
- **Search**: live suggestions, saved recent searches (clearable), category filters, results grid,
  friendly empty state, search by title or category.
- **Title page**: artwork, rating, tags, Resume/Play, favorite, watchlist, download,
  age gate, episode list with per-episode progress, "More like this".
- **Profile**: avatar, age band, today's watch time, favorites/downloads counts,
  language switch (EN/ES/FR), large-text and calm-animation toggles, captions default,
  parent area, subscription, sign out.

### Video player
- **Real streaming** via `expo-video`: verified open MP4s on both web and native.
- Play/pause, ±10 s skip, double-tap left/right to seek, previous/next episode, draggable seek bar
  with buffer-aware progress, volume slider + mute, fullscreen, episode sheet, sleep timer
  (15/30/45/60 min), real closed captions sourced from NASA, Wikimedia Commons and
  Internet Archive where published, adjustable size/background, playback speed (0.75–1.5×),
  offline playback, loading, recovery and error states.
- Saves progress every 5 seconds and on exit; marks episodes complete at 94%; auto-plays
  the next episode after an 8-second countdown (parent switch); end screen with
  recommendations.
- Watching is blocked when the daily screen-time limit is reached.

### Kids profiles
- Multiple profiles per family, each with name, cartoon avatar, age band and content level.
  The editor is scrollable and keyboard-aware, names are capped at 24 characters with a live
  counter, long names truncate cleanly elsewhere, and the emoji grid measures the available
  width to choose its own columns and tile size (no clipping from 320 px phones to desktop).
- Independent favorites, watchlist, history, progress, downloads and recommendations.
- Age bands (2–4 / 5–7 / 8–10) map to content ratings **G / PG / Y7**; parents can
  override the level per kid.
- Selecting a profile is one tap; "Who's watching?" picker with a grown-ups link.

### Parent dashboard (PIN protected)
- **Overview**: today's watch time per kid, 7-day usage chart, most-watched cartoons, category
  breakdown, daily limit (off/30/45/60/90/120 min), +15 minutes treat, downloads/notifications/
  autoplay switches, plan and PIN shortcuts, safety checklist.
- **Kids**: create, edit, delete profiles with confirmation, set max content level.
- **Controls**: per-kid approve/block for every title, remove favorites, download permission.
- **History**: per-kid watch log with episode, minutes watched and time; clear history.
- **Account**: display name, email, plan, PIN change, account settings, privacy summary,
  sign out.
- PIN is salted + SHA-256 hashed. Forgotten PIN can only be reset with the **parent
  account password**, then a new PIN is set. Three wrong PINs lock every parent-PIN
  path for 5 seconds; each additional three wrong attempts doubles the wait (10, 20,
  40, 80 seconds…). The countdown and failure state survive screen changes and app
  restarts. A successful PIN clears the counter. See **Parent PIN lockout alerts**
  below for the rate-limited email notification.

### Accounts, subscription
- Parent sign-up / sign-in / sign-out, password recovery (Supabase email), persistent session.
- Subscription screen with monthly/yearly plans, trial countdown, billing summary and
  **Stripe Checkout** hand-off. Kids cannot reach any purchase UI.
- Demo mode stores accounts on-device with salted hashed passwords; configure Supabase for
  real multi-device auth.

### Downloads
- Real offline downloads (MP4 rendition) with progress, size, play-offline and delete.
- Native: `expo-file-system` into the app document directory.
- Web: streamed into IndexedDB and replayed from a `blob:` URL.
- Parent switch disables downloads for the whole account.

---

## Stack

| Layer | Choice |
| --- | --- |
| App | Expo SDK 58, React Native 0.88, React 19, TypeScript (strict) |
| Navigation | Custom stack + bottom tab bar (no router dependency) |
| Video | `expo-video` + verified open MP4 library (Mux for production) |
| Auth/DB | Supabase Auth + Postgres with row-level security; local-first fallback |
| Offline | `expo-file-system` (native), IndexedDB (web) |
| Payments | Stripe Checkout edge function (optional) |
| UI | Custom design system, Baloo 2 + Nunito, gradients, haptics |

---

## Run it

```bash
npm install
npm run web          # http://localhost:8081
npm run android      # Expo Go / emulator
npm run ios          # macOS only
npm run typecheck    # tsc --noEmit
```

There is **no pre-seeded account** — the first screen asks a grown-up to create one.
In demo mode, any email + password (6+ characters) works, then you set a parent PIN and
create the first kid profile. Data persists in AsyncStorage on that device.

Create `.env` from `.env.example` before starting to enable Supabase / Stripe. Expo reads
`EXPO_PUBLIC_*` variables at build time.

---

## External configuration

### 1. Supabase (optional → full backend)

1. Create a project at <https://supabase.com>.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor. It creates
   `kid_profiles`, `parent_settings`, `watch_progress`, `favorites`, `watchlist`,
   `content_approvals`, `watch_history`, `downloads`, a signup trigger, a summary view
   and RLS policies scoping every row to `auth.uid()`.
3. Enable Email auth. For production enable "Confirm email" and set a minimum password length.
4. Add the project URL and anon key to `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
5. Restart Expo.

With Supabase configured, the app authenticates through Supabase, restores sessions, and
mirrors every mutation (profiles, settings, progress, favorites, watchlist, history,
approvals) to Postgres. It stays local-first: a failed network write never stops playback.

**Kids never get Supabase accounts.** One parent auth user owns all kid profiles, so no
child email addresses are collected.

### 2. Video (open demo library → Mux for production)

Demo titles stream **verified, openly licensed MP4s** from `src/data/media.ts`:
Blender Foundation open movies (CC BY 3.0 / 4.0), NASA and NOAA (public domain),
Ub Iwerks ComiColor cartoons (public domain) and Prelinger Archives public-domain films.
Cartoon and movie cards use the real film titles and play that exact film, one per card
(for example **Big Buck Bunny**, **Jack and the Beanstalk** and **Puss in Boots**).
Learning, music and bedtime shows use themed clip pools (ocean footage for ocean shows,
alphabet film for alphabet shows, slow space/aurora footage for bedtime). Every episode
carries its clip credit, shown in the player's **Playback** sheet.

To use your own content:

1. Upload licensed videos to Mux and create playback IDs.
2. Replace the clip entries and mappings in `src/data/media.ts` (or each episode's
   `hlsUrl` / `mp4Url` in `src/data/catalog.ts`).
3. Or set `EXPO_PUBLIC_MUX_PLAYBACK_ID` and use `muxStream()` from `src/lib/supabase.ts`.
4. For signed playback, mint an HS256 JWT on a server and append `?token=…`; never put a
   Mux signing key in the app.

HLS downloads are not a single file; this app downloads the progressive MP4 rendition
(`downloadUrl`, or the streaming MP4 when no smaller rendition exists). For DRM-protected
offline playback, use Mux's offline SDK/DRM instead.

#### Demo video sources & licences

| Creator | Clips | Licence |
| --- | --- | --- |
| Blender Foundation | Big Buck Bunny, Caminandes 1–3, Spring, Wing It! | CC BY 3.0 / 4.0 |
| Ub Iwerks / Celebrity Pictures | Jack and the Beanstalk, Puss in Boots, Jack Frost, The Valiant Tailor, The Three Bears, Simple Simon, The Queen of Hearts, Balloon Land, Mary's Little Lamb, The Bremen Town Musicians, Don Quixote, The Brave Tin Soldier, Summertime, Happy Days, Tom Thumb, Dick Whittington's Cat | Public domain |
| NASA | Earth Views from the ISS, STEMonstrations: Moon Phases, GPM Water Cycle, The Aurora Named STEVE, TROPICS Rocket Launch | Public domain |
| NOAA Ocean Exploration | Octopus Friday on Saturday, Grumpy Goosefish, Twirling Jelly, Sea Lion Cave, Deep-Sea Underdogs | Public domain |
| Prelinger Archives | Andy's Animal Alphabet, Mother Goose Stories, Making Books | Public domain |

Caption sources are listed in `src/data/captions.ts` (NASA public-domain captions,
Wikimedia Commons TimedText under CC BY-SA 4.0, and Internet Archive auto-captions for
public-domain films). Full media source and licence URLs are in `MEDIA_CLIPS` in
`src/data/media.ts`. The
Blender films require attribution: keep the credit line and the source link when you reuse
them. The demo library is a legally usable starting point, not a production catalogue.

**Matching notes (honest):** alphabet, reading, rhymes, science, geography, animals,
space and bedtime map to genuinely topical films. Counting episodes use a real NASA launch
countdown and moon-phase lesson; dance and music episodes use music-driven animated shorts
because no free, licensed nursery-rhyme/dance video with a reusable licence was found. The
KidsFlix characters remain original; the demo clips are stand-ins for commissioned episodes.

### 3. Payments (Stripe)

Kids can never buy anything. Subscriptions intentionally do **not** activate locally, so
the app never fakes a successful charge.

1. `supabase functions deploy stripe-checkout`
2. `supabase functions deploy stripe-webhook --no-verify-jwt`
3. Set secrets:
   ```
   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
   supabase secrets set STRIPE_PRICE_MONTHLY=price_...
   supabase secrets set STRIPE_PRICE_YEARLY=price_...
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   supabase secrets set APP_URL=https://your-app.example
   ```
4. Add the webhook URL in Stripe for `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted`.
5. Set `EXPO_PUBLIC_STRIPE_CHECKOUT_URL` to the deployed checkout function URL.

Without this configuration the subscription screen explains exactly what is missing.
App Store / Play Store builds should use native in-app purchase instead of Stripe Checkout,
per store policy — that needs its own product IDs and receipt validation.

### 4. Parent PIN lockout alerts (Resend)

Parent-PIN lockouts work locally in demo mode and are backed by Supabase when a
project is configured. The database, not the browser, owns the counter and the
lockout deadline; the client keeps a mirror so a reload cannot remove the
countdown. The alert recipient is taken from the authenticated account, never
from a request body.

1. Re-run `supabase/schema.sql` in the SQL editor. This adds
   `parent_pin_security` plus the `record_pin_attempt`, `pin_security_status`
   and `claim_pin_security_alert` RPCs. There is deliberately no client-callable
   “clear lockout” RPC; only a correct PIN resets the counter.
2. Create a [Resend](https://resend.com) API key and verify the sending domain.
3. Set the server-side secrets and deploy the function:
   ```
   supabase secrets set RESEND_API_KEY=re_...
   supabase secrets set SECURITY_ALERT_FROM="KidsFlix Security <security@your-verified-domain>"
   supabase functions deploy pin-security-alert
   ```
4. Confirm the Edge Function is available to the app. No email key belongs in
   `EXPO_PUBLIC_*` variables or the browser bundle.

Each third failed attempt produces at most one alert every 15 minutes. The email
contains the time, failed-attempt count, lockout duration and recovery guidance;
it never contains the PIN or its hash. Resend also receives a per-lockout
idempotency key so retries cannot duplicate the message. If the function or key
is missing, the lockout still works locally and the app does not claim an email
was delivered.

---

## Safety & privacy

- No messaging, comments, public profiles, follower counts or social feeds anywhere.
- No behavioural/targeted advertising and no ad SDKs.
- Kids never create accounts, enter email addresses or see billing UI.
- Age ratings enforced per profile; parents can also block individual titles.
- Parent area is PIN-gated with escalating lockouts, a persistent countdown,
  password-based recovery (paused during an active lockout) and rate-limited
  security-alert emails to the registered parent address.
- Downloads require a parent permission.
- Privacy text in the dashboard describes what is stored (first name, avatar, age band,
  progress, history) and that history is parent-only and deletable.

**Compliance is not automatic.** A public deployment must add verifiable parental consent
(COPPA), a published privacy policy, data-retention/deletion processes and a review against
GDPR-K / the UK Age Appropriate Design Code. The included schema and UI provide the
technical controls; legal review of your deployment is still required.

---

## Project structure

```
App.tsx                     Root flow: welcome → auth → PIN → profiles → tabs
src/
  theme.ts                  Colours, fonts, layout breakpoints, shadows
  types.ts                  Domain types
  nav.tsx                   Small stack + tab navigation context
  data/catalog.ts           27 subcategories, 54 titles, episode data
  data/captions.ts         sourced CC tracks for clips that publish captions
  data/media.ts             verified open video library + per-title clip mapping
  data/avatars.ts           12 cartoon avatars, age groups
  lib/auth.ts               Local + Supabase auth, PIN/password hashing
  lib/pinLockout.ts         Pure 3-strike/doubling lockout rules + countdown math
  lib/pinSecurity.ts        Backend PIN verification, local mirror, alert call
  lib/remote.ts             Best-effort Supabase mirror + pull
  lib/downloads.ts          Native file downloads / web IndexedDB offline
  lib/storage.ts            AsyncStorage family state + defaults
  lib/i18n.ts               EN / ES / FR UI strings
  state/AppProvider.tsx     Single source of truth for profiles, limits, data
  components/               Logo, avatars, poster art, rails, buttons, seek bar, sheets…
  screens/                  All 19 screens (see above)
supabase/
  schema.sql                Tables, trigger, RLS, PIN lockout RPCs
  functions/stripe-checkout Stripe Checkout session creator
  functions/stripe-webhook  Subscription sync (signature verified)
  functions/pin-security-alert Rate-limited parent lockout email (Resend)
```

Tests for the shared lockout rules: `npm run test:pin` (no network or database required).

---

## Known limitations (honest list)

- **Catalogue is demo content.** Cartoon and movie cards are real public-domain or
  Creative Commons films (22 titles, one exact film each). The 32 learning, music and
  bedtime cards are KidsFlix demo brands that stream 19 themed open clips. Counting uses a
  launch countdown and moon phases; dance/music use music-driven animation. Replace those
  with commissioned or licensed episodes before launch.
- **UI localisation is partial.** Navigation, core actions and common labels are translated
  to English/Spanish/French; show descriptions, parent dashboard copy and legal text remain
  English. CC coverage depends on the source: NASA, Wikimedia Commons (Big Buck Bunny,
  Spring) and Internet Archive auto-captions are bundled. Clips without a published caption
  file show “no captions published” instead of fake dialogue. Auto-captions are labelled and
  may contain errors; classic ComiColor/NOAA clips currently have no published CC track.
- **Supabase paths are implemented but untested against a live project** in this build —
  there were no project credentials. Demo (local) mode is what runs out of the box.
  The PIN lockout works there; email alerts require the updated schema, the deployed
  `pin-security-alert` function and Resend secrets described above.
- **Stripe is not live.** Checkout only opens when configured; plan state changes are driven
  by the webhook, so nothing pretends a payment succeeded.
- **Notifications** are a parent-controlled preference toggle, not a push-notification
  implementation (that needs Expo push credentials and a sender).
- **Smart TV**: the layout scales to TV breakpoints and the player supports fullscreen, but
  shipping to tvOS/Android TV requires `react-native-tvos`/TV build config and remote-control
  focus styling.
- **Watch Party** is not implemented: a real family watch party needs an authenticated realtime
  service (websocket/room server) plus a shared playback clock. There is no public chat or social
  layer, and no fake "party" button was added.
- **Downloads on the web** depend on the media host sending CORS headers. The demo Internet Archive
  clips do not, so the title page now explains the failure and offers Retry instead of failing
  silently; native downloads do not have this browser restriction.
- **Downloads** are per device and are not synced to Supabase (only metadata schema exists).
  On web, browser downloads require the media host to send CORS headers: NASA-backed
  episodes download fine, but Internet Archive does not send CORS for its MP4 files, so
  those clips download only in the native app. Use your own Mux/CORS-enabled host in
  production to make every title downloadable on every platform.
- **Icons/splash** use the generated Expo assets; replace `assets/*.png` with KidsFlix
  branding before store submission.

---

## Verification performed

- `npx tsc --noEmit` passes with strict TypeScript.
- `npm run build:web` produces a fresh `dist/` export.
- Responsive checks: Home at 320×568, 360×640, 375×812, 390×844, 412×915, 430×932,
  600×960, 768×1024, 800×1280, 1024×1366, 1280×720, 1366×768, 1920×1080 and 844×390
  landscape — no page-level horizontal overflow at any of them. The profile editor was checked
  at 320/360/430/768/1280/1920, the profile picker at 320/844, and My World, collections, search,
  parent dashboard and the player at 320 (dashboard also at 844). The player video element was
  fixed to 100% width after a 640 px intrinsic video caused 320 px pages to scroll horizontally.
- Demo flows exercised: parent sign-in, PIN gate, profile creation with a 24-character name,
  profile editing, switching between two profiles, home browse, My Cartoon World save,
  collection open, search + saved search history, favorite toggle, title page, playback with
  captions, caption size and 1.25× speed, parent dashboard charts. A web download failure was
  observed (Internet Archive CORS); an inline retry note was added and typechecked, but a
  successful download was not re-run on the web.
- Download on web for Internet Archive titles is blocked by CORS and is reported in the UI;
  native download and actual Android/iOS builds were not tested here.

Anything requiring Supabase, Mux dashboard access, Stripe keys or store accounts is
documented above and still needs your credentials to verify end-to-end.

---

Made with 💜 for little dreamers.
