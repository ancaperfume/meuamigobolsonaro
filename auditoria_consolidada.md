# Relatório de Auditoria de Desenvolvimento - Meu Amigo Bolsonaro
Este relatório foi extraído das sessões de auditoria executadas pelos subagentes do Claude Code antes da interrupção por limite de créditos.


## Security audit
---------------------------------------

I have enough information. Let me compile the final report.

---

# Security Audit Report â€” meuamigobolsonaro

## CRITICAL

1. **OpenRouter API key hardcoded in source.** `src/lib/photo.functions.ts:47-57` â€” array `["sk-or-", "v1-2905ccc7", ...]` joined via `keyParts.join("")` produces `sk-or-v1-2905ccc7...[REDACTED]...`. Used at line 57 as default when env var missing. Anyone with repo access (or who downloads the public JS bundle if this server file is bundled to client) drains the AI budget on any model OpenRouter exposes.

2. **Supabase SERVICE_ROLE_KEY committed to git history and currently in tracked `.env`.** `.env:3` contains the live service-role JWT for project `dnmgxrzwbpnytqymddoc`. `git log --all -- .env` shows it was first added in commit `e2b34f54` ("Changes") and updated in `ee934c41`. Despite `.gitignore:35` listing `.env`, `git ls-files` confirms `.env` is still tracked. Service role bypasses RLS â€” anyone with this key has full read/write to `generations`, `orders`, every table, plus auth admin. Token `exp` â‰ˆ 2095, so it is valid for ~70 years.

3. **Watermark is a CSS overlay sibling div â€” original image URL is fully exposed pre-payment.** `src/routes/index.tsx:619-625`: `<img src={generatedUrl} ...>` is rendered with `<div className="watermark-overlay" />` next to it. `src/styles.css:94-103` shows watermark is a separate background-image div. User opens devtools, deletes the overlay (or `Save Image As` directly on the `<img>` URL), gets clean HD photo. Server returns the raw `imageUrl` at `src/lib/photo.functions.ts:141` with zero gating. Free product.

4. **`mock-pix` short-circuit returns `paid` for any client-supplied externalId starting with that prefix.** `src/lib/payment.functions.ts:102-105`. Zod validator at line 97 only checks length 5â€“64. The flow: client calls `getOrderStatus({externalId: "mock-pix-anything"})` â†’ server returns `{status:"paid"}` â†’ client `handlePaid()` fires â†’ `localStorage.setItem("has_paid_before","true")` â†’ unlimited Trump/Milei generations + Pixel `Purchase` event fired. Works in production even when `NEXUSPAG_API_KEY` is set, because the prefix check is unconditional, ahead of the env check.

5. **Premium gate is entirely client-side localStorage flag.** `src/routes/index.tsx:250-251, 387, 1031`. `unlocked_lideres_mundiais` and `has_paid_before` are read/written only in the browser. DevTools â†’ `localStorage.setItem('unlocked_lideres_mundiais','true')` instantly unlocks Trump/Milei. No server-side entitlement table, no token, no signature.

6. **Webhook is dead code.** `src/routes/api/public/nexuspag-webhook.ts:40-42` validates HMAC then only `console.log`s and returns 200. No DB write, no order state transition. Payment confirmation never reaches persistent storage, and `getOrderStatus` queries NexusPag directly each poll â€” so if NexusPag is unreachable, paid users are denied. There is no immutable record of who paid.

7. **Admin auth is fully client-side.** `src/routes/admin.tsx:84` defines `ADMIN_PASSWORD = "patriaamada"` literally in a public-bundled component. Check happens in React (`admin.tsx:102`), gate is `localStorage.getItem("admin_logged_in") === "true"` at line 94. Server functions `getGenerationsLog`, `testSupabaseConnection`, `saveTestGenerationLog` (`src/lib/photo.functions.ts:144, 156, 206`) have **no auth middleware** â€” anyone can POST to them directly without ever touching `/admin`. Exposes every user's IP, generated image URL, and lets attackers spam `saveTestGenerationLog` to forge stats. Second hardcoded credential pair `admin/patriaamada` at `src/routes/index.tsx:2297`.

## HIGH

8. **Unauthenticated, unrate-limited AI generation.** `generatePhoto` (`src/lib/photo.functions.ts:40`) has no rate limiting, no auth, no captcha. Schema permits `imageBase64` up to unlimited size (`min(100)`, no max). Each call costs real money via OpenRouter Gemini. Trivial bash loop bankrupts the OpenRouter account (and given that account is the hardcoded key from #1, the attacker doesn't even need this site). The "rate_limiting" migration created a `generations` row-tracking table but no code consults it.

9. **IDOR via shared IP in `getUserPhotosByIP`.** `src/lib/logging.server.ts:58`, called by `getUserPhotos` (`photo.functions.ts:215`). Uses raw `CF-Connecting-IP`/`x-forwarded-for` as the sole identity key. Mobile carriers (Vivo/Claro/Tim/Oi) and corporate NATs put thousands of users on the same egress IP. Anyone visiting `/my-photos` from such a network sees every other user's uploaded-selfie-derived photo. `x-forwarded-for` is also trivially spoofed if the app is reached without going through Cloudflare.

10. **`generatedUrl` accepted from client into PIX charge metadata.** `src/lib/payment.functions.ts:11` `generatedUrl: z.string().optional()` â€” no URL validation. Could be used for stored XSS if rendered, or to associate arbitrary URLs with orders.

11. **`saveTestGenerationLog` is a public write endpoint.** `src/lib/photo.functions.ts:206-213`. Anyone can insert arbitrary rows into the `generations` table with arbitrary URLs and status="paid", poisoning admin metrics and potentially being rendered into the admin panel's `<img src=...>` (admin XSS via `javascript:` URL or admin browser exploitation via attacker-chosen image host).

12. **`testSupabaseConnection` exposes config and DB write to anyone.** `src/lib/photo.functions.ts:156-204`. Returns `hasUrl`, `urlPrefix`, query error messages, and inserts/deletes a diagnostic row â€” all unauthenticated.

## MEDIUM

13. **`generations` RLS enabled but with no policies (defense in depth).** `supabase/migrations/20260526182500_rate_limiting.sql:16` enables RLS without policies, so anon key gets nothing â€” that part is fine. But the *publishable anon key* is exposed at `src/integrations/supabase/client.ts:9` (expected). Because all DB access goes through the server-only `supabaseAdmin` client, an attacker getting the anon key alone gets nothing â€” *unless* they also have the leaked service role key from #2, in which case RLS is meaningless.

14. **Selfie images sent base64 to OpenRouter (third-party AI), no consent banner, no LGPD notice.** `photo.functions.ts:94`. Image is not stored in Supabase (only the resulting URL is), but the selfie transits through OpenRouter â†’ Google AI Studio. Footer at `index.tsx:993-996` is a generic disclaimer; no privacy policy, no opt-in, no DPA. LGPD Art. 7/8 issue.

15. **No MIME validation beyond client-set string.** `photo.functions.ts:13` `mimeType: z.string().min(3)` accepts anything. Combined with `min(100)` base64 only, a user can upload arbitrary blobs (TIFF, SVG with embedded scripts, etc.) which then get embedded as a `data:` URL into the OpenRouter request.

16. **Image upload size limit only enforced client-side.** `index.tsx:287` checks `file.size > 8MB` in the browser. Server (`photo.functions.ts:11`) has no max on `imageBase64`. Attacker bypasses input by calling the server function directly with a 100MB payload â†’ Worker memory exhaustion / cost.

17. **Sensitive admin "noindex" meta is the only obscurity for `/admin`** (`admin.tsx:46`). Combined with #7, route is publicly accessible.

18. **PUT/POST not restricted by origin.** No CORS hardening visible. TanStack server functions are POST endpoints; CSRF protection isn't explicitly demonstrated. Attacker site can have a user accidentally trigger paid generations.

19. **`dangerouslySetInnerHTML` audit.** `admin.tsx:125, 341` and `index.tsx:543` all inject static CSS string literals (no interpolation). `components/ui/chart.tsx:73` injects color values from chart config (developer-controlled, not user). No XSS sink here â€” confirmed safe.

20. **CGNAT IP-based admin stats are unreliable** (`logging.server.ts:93`). Not a security bug, but `totalUniqueUsers` is meaningless and may be cited in business decisions.

21. **`exposed admin@patriaamada` in DOM string.** `index.tsx:2680` writes `admin@patriaamada` in the DevDashboardModal footer â€” credential reminder visible in any user's DOM if that modal renders.

## FALSE ALARMS

- **`.env` is in `.gitignore` (line 35)** but `git ls-files` shows it is still tracked because it was committed before the rule was added. The gitignore rule does NOT untrack already-tracked files. So claim #3 "verify .gitignore excludes .env" technically passes â€” but the file is committed anyway. Not a false alarm; finding stands.
- **XSS via `dangerouslySetInnerHTML`** â€” checked all 4 occurrences (admin.tsx:125, 341; index.tsx:543; chart.tsx:73). All inject static or developer-controlled strings; no user data flows in. Not exploitable.
- **RLS on `orders` / `generations`** â€” both have `ENABLE ROW LEVEL SECURITY` with zero policies, which is the correct posture given that only `service_role` accesses these tables. RLS itself is OK; the real risk is the leaked service-role key (#2).

## Relevant files
- C:\Users\artur\.gemini\antigravity\scratch\meuamigobolsonaro\.env
- C:\Users\artur\.gemini\antigravity\scratch\meuamigobolsonaro\src\lib\photo.functions.ts
- C:\Users\artur\.gemini\antigravity\scratch\meuamigobolsonaro\src\lib\payment.functions.ts
- C:\Users\artur\.gemini\antigravity\scratch\meuamigobolsonaro\src\lib\logging.server.ts
- C:\Users\artur\.gemini\antigravity\scratch\meuamigobolsonaro\src\routes\admin.tsx
- C:\Users\artur\.gemini\antigravity\scratch\meuamigobolsonaro\src\routes\index.tsx
- C:\Users\artur\.gemini\antigravity\scratch\meuamigobolsonaro\src\routes\api\public\nexuspag-webhook.ts
- C:\Users\artur\.gemini\antigravity\scratch\meuamigobolsonaro\src\integrations\supabase\client.server.ts
- C:\Users\artur\.gemini\antigravity\scratch\meuamigobolsonaro\src\styles.css
- C:\Users\artur\.gemini\antigravity\scratch\meuamigobolsonaro\supabase\migrations\20260526182500_rate_limiting.sql

## Code quality and dead code audit
---------------------------------------

.

## Bugs and correctness audit
---------------------------------------

Now I have enough to compile the report. Let me also briefly verify the polling â€” it doesn't stop if the modal is closed during pending payment, but the cleanup function clears the interval when component unmounts. The modal unmounts when `showPayment=false`, so polling stops. But if user pays AFTER closing modal, the payment is never detected client-side.

Also, note `onPaid` (handlePaid) is a useCallback dep of the polling effect. When `bumps`/`total` change, the effect re-runs, restarting the polling interval (minor leak/restart).

I have all the info needed. Generating the report.

---

## Audit Report â€” Bolsonaro Meu Amigo

### CRITICAL

1. **`src/lib/photo.functions.ts:118,134` â€” Photo URL persistence is broken.** OpenRouter returns the image as `image_url.url`. For `google/gemini-3.1-flash-image-preview`, that field is a temporary signed/data URL (per OpenRouter docs, image-generation responses are short-lived signed URLs from the upstream provider). The code stores it verbatim in Supabase via `saveGenerationToLog(imgUrl, ...)`. When `/my-photos` later renders `<img src={photo.url}>` from that row, the URL has expired â†’ broken images. No image is downloaded/copied to permanent storage. **Repro:** generate a photo, wait ~1 hour, open `/my-photos` â†’ image fails to load. Same issue on the admin dashboard thumbnails (`index.tsx:2611`, `admin.tsx`).

2. **`src/routes/index.tsx:62` vs `admin.tsx:52` and `my-photos.tsx:27` â€” CharKey mismatch crashes/degrades non-Bolsonaro photos.** Only `jair|flavio|michelle|nikolas` are defined in `admin.tsx` (line 52) and `my-photos.tsx` (line 27). `my-photos.tsx:65 getChar` returns a fallback with `example: ""`. Result on `/my-photos` for a trump/milei photo: `ch.name` shows the raw key `"trump"`/`"milei"`, no avatar (line 211 `{ch.example && ...}` skips), and the share message reads "Olha minha foto realista com trump". Admin's character stats grid (admin.tsx:491+, 714+) iterates only the 4-key local CHARACTERS, so trump/milei generations are silently hidden from per-character counts (but counted in totals â†’ numbers don't reconcile).

3. **`src/routes/index.tsx:1276-1294` (and parallel `1860-1899`) â€” Polling stops as soon as user closes the PIX modal.** The poll-status `useEffect` cleanup runs on unmount. If a customer copies the PIX code, closes the modal (which is easy: `X`, backdrop tap, or the auto-opened DownsellModal replacing it via `handlePaymentClose` â†’ `setShowPayment(false)`), then pays in their banking app, the client never detects payment. Combined with the webhook handler (`nexuspag-webhook.ts:42`) which only `console.log`s the payload and does NOT update any DB row or push to the client, the user has paid but never gets their photo. **Data-loss / paid-but-undelivered.**

4. **`src/routes/api/public/nexuspag-webhook.ts:40-42` â€” Webhook is a no-op on payment.** No DB write, no broadcast, no fulfillment. Combined with bug #3, paid orders made after-the-fact are lost.

### HIGH

5. **`src/routes/index.tsx:329-349 reset()` does not clear `unlockedLideres`, `hasPaidBefore`, or `showCrossSellModal`.** That is intentional for the unlock flags, but reset is called on every `CharacterSwitcher` change (line 494) and on `CrossSellModal.onSelectCharacter` (line 1134). `setPromoPrice(6.22)` runs *before* the caller's `setPromoPrice(4.99)` (line 1135) â€” order is fine because both are queued in the same render; React batches and the later one wins. OK. But `showCrossSellModal` stays open if reset is triggered while it's mounted â†’ minor. More importantly, `activeUpsell` is NOT reset; switching characters mid-upsell-modal keeps it open with stale `characterKey` already passed as prop. OK because prop is captured.

6. **`src/routes/index.tsx:268-279 total` useMemo wrong for premium + bumps.** For a premium character (Trump/Milei) at full price R$9,90 + OraÃ§Ãµes R$3,99 + Guia R$14,90 = R$28,79. That works. But `isDownsellActive` only applies the standard downsell prices (4.90/3.90); there is no equivalent `isLideresDownsellActive` term in `total`. Since the LideresCheckout modal hardcodes its total as `isLideresDownsellActive ? 9.90 : 27.00` (line 1100), the `total` memo is irrelevant for that flow â€” but if a user enters the regular payment modal as a premium character on the main path (which they cannot, because premium calls `handlePaid` directly when `unlockedLideres` â€” line 676), there's no issue here. Verified inert; downgrade to MEDIUM.

7. **`src/routes/index.tsx:281-327 handleFile` â€” no FileReader error handler.** `reader.onerror` is unset. If file read fails, `step` stays `"generating"` forever (no toast, no reset). Also `dataUrl.split(",")[1]` is passed without checking â€” if reading produces a non-data-URL or empty string, the server-side Zod `.min(100)` will throw but at least surfaces an error. Bigger issue: no debounce/lock â€” clicking the upload input twice quickly triggers two `handleFile` runs in parallel; the second `callGenerate` race wins.

8. **`src/routes/index.tsx:672-693, 1027-1049` â€” "Liberar minha foto" race: no in-flight guard.** Clicking the green button rapidly toggles `setShowPayment(true)` repeatedly â€” the modal isn't multi-instanced (single boolean), so no double-modal. However, inside `PaymentModal.handleGenerate` (line 1296), there is no idempotency: a user can click "Pagar com Pix" multiple times before `setLoading(true)` paints, spawning multiple `createPixCharge` calls and orphaned `externalId`s. The `loading` flag only blocks after the first re-render.

9. **`src/lib/payment.functions.ts:42` â€” total amount sent to gateway is client-controlled.** `amount` comes from the React state; no server-side validation that it matches a known product price. A user can intercept and pay R$0,01 yet still call `getOrderStatus` and receive `paid` â†’ `handlePaid` fires â†’ photo released. The whole "paid" flow trusts client claims.

10. **`src/lib/payment.functions.ts:102-105 getOrderStatus` auto-approves any `externalId` starting with `mock-pix-`.** This branch runs unconditionally in production. If `NEXUSPAG_API_KEY` is unset for any reason (env miss, deploy bug), `createPixCharge` falls back to `mock-pix-${Date.now()}` (line 20), and the status check auto-returns `paid`. Free photos at scale on a misconfigured deploy.

11. **`src/routes/index.tsx:1276-1294` â€” polling effect's dep array includes `onPaid` (which is `handlePaid`).** `handlePaid` is rebuilt whenever `bumps` or `total` change. Toggling an OrderBump in the PIX phase re-creates the polling interval (clears + restarts â†’ up to ~3s delay each time + lost ticks). Minor, but visible UX issue.

### MEDIUM

12. **`src/routes/index.tsx:194-225` progress simulation deps OK (`[step]`), but `setProgress(0)` etc. on `step !== "generating"` runs after the cleanup, which is fine. However `startTime = Date.now()` recaptures on every effect run; if `step` flips generatingâ†’previewâ†’generating quickly, prior intervals have already been cleaned. No bug.

13. **`src/routes/index.tsx:1378-1380` â€” base-price computation via subtraction has float drift.** `total - 3.99 - 14.9` for total `R$ 19,99` (6.22+3.99 not... actually 6.22+3.99+14.9 = 25.11) â†’ 25.11 - 3.99 - 14.9 = 6.22 (exact). But `9.90 + 3.99 + 14.9 = 28.79` â†’ 28.79 - 3.99 - 14.9 = 9.9 (good). With `4.99 + 14.9 = 19.89`, 19.89 - 14.9 = 4.99 (good after `.toFixed(2)`). The `.toFixed(2)` masks drift; OK.

14. **`src/lib/photo.functions.ts:43` â€” `getRequest()` inside `createServerFn` handler is supported in TanStack Start (it reads from AsyncLocalStorage). Confirmed pattern reused in `auth-middleware.ts`. Not a bug â€” but be aware no `getRequest` guard exists; if called outside a request context, returns undefined and `getClientIP` crashes.**

15. **`src/routes/index.tsx:898-918` â€” "Select Trump/Milei" buttons in the post-purchase block call `reset()` which clears `step` to `idle` and tears the user out of the upsell sequence (activeUpsell state lost). Likely intended, but combined with `paidBumps` reset, the downloaded bonuses panel disappears on switch.**

16. **`src/routes/index.tsx:2297` â€” Admin password `"patriaamada"` hardcoded client-side** in both `admin.tsx` and `index.tsx` AdminLoginModal. Not a correctness bug per se but useful to flag.

17. **`src/integrations/supabase/client.server`** uses `SUPABASE_SERVICE_ROLE_KEY` from `process.env`. On Cloudflare Workers (your deploy), env vars come via the `cloudflare:workers` env binding; `process.env` works only with the `nodejs_compat` flag enabled (it is) AND when secrets are exposed as plain vars â€” Wrangler does this by default, so OK. Not a bug, but a fragile coupling.

### Skipped / verified non-issues
- `wrangler.jsonc` does include `nodejs_compat` (line 5) â€” webhook crypto OK.
- Social-proof rotation effect (line 178) deps are correctly `[]`.
- `(window as any)` usage in `__root.tsx:156` is the standard pixel-init pattern; not hiding a bug.
- `total.toFixed(2)` rounding for all current price combos resolves to correct centavos.

## Payment flow deep dive
---------------------------------------

Confirmed: no `NEXUSPAG_API_KEY`, no `NEXUSPAG_WEBHOOK_SECRET`, no `PUBLIC_APP_URL` in `.env`. I have everything I need.

---

# PIX Checkout Audit â€” meuamigobolsonaro

## CRITICAL (money loss / fraud / no verification)

**C1. Server has zero record of payments â€” unlock is 100% client-trusted.**
`src/lib/payment.functions.ts:14-95` only proxies NexusPag; never writes to `orders` table. `src/routes/api/public/nexuspag-webhook.ts:40` validates HMAC then `console.log`s and returns 200 â€” no DB update, no business logic. The `orders` migration (`supabase/migrations/20260527000001_create_orders_table.sql`) exists but is never read or written by any code (only `generations` table is used â€” `src/lib/photo.functions.ts:185`, `src/lib/logging.server.ts:9`). Unlock decision in `src/routes/index.tsx:400-427` (`handlePaid`) and `src/routes/index.tsx:1276-1294` (poll loop) trusts whatever `getOrderStatus` returns from the (stateless) gateway round-trip.

**C2. `mock-pix` bypass â€” anyone can call `getOrderStatus` and be marked paid.**
`src/lib/payment.functions.ts:97` validator is `z.string().min(5).max(64)` â€” no prefix restriction. `src/lib/payment.functions.ts:102-105`: `if (data.externalId.startsWith("mock-pix")) return { status: "paid", ... }`. Exploit: open devtools, call the `getOrderStatus` server-fn POST with `{externalId:"mock-pix-x"}` â€” returns paid. Then in `PaymentModal` (`index.tsx:1281-1283`) the polling loop fires `onPaid()`. Even simpler: just set `localStorage.setItem("has_paid_before","true")` â€” but the photo-level unlock still requires `step="paid"` (`index.tsx:616-632`). The truly trivial bypass is C3 below.

**C3. Watermark is a sibling `<div>` â€” devtools delete = free HD photo, no payment.**
`src/routes/index.tsx:625` renders `{step === "preview" && <div className="watermark-overlay" />}` next to the `<img src={generatedUrl} ...>` at line 618. `src/styles.css:94-103` confirms `.watermark-overlay` is `position:absolute; inset:0; background-image: <svg>; mix-blend-mode: multiply` â€” purely visual CSS overlay, not a canvas composite, not a server-side stamped image. `generatedUrl` is a direct OpenRouter/CDN URL of the unwatermarked image. Exploit: F12 â†’ delete the div â†’ right-click â†’ "Save image as" (or copy `generatedUrl` from React props / network tab). No payment needed.

**C4. Pricing tampering â€” pay R$ 1,00 (or any amount â‰¥ 1) and unlock.**
`src/lib/payment.functions.ts:5`: `amount: z.number().min(1).max(1000)`. Client sends `total` from `index.tsx:1300-1305`. Exploit: in devtools, monkey-patch or replay the `createPixCharge` server-fn with `amount: 1`. NexusPag generates a R$ 1,00 PIX, user pays it, polling sees "paid", `onPaid()` fires. No server-side price recomputation per `(character, isPremium, bumps)`.

**C5. Premium pack ("Trump+Milei R$ 27") entitlement is pure `localStorage`.**
`src/routes/index.tsx:387` `localStorage.setItem("unlocked_lideres_mundiais","true")`. Read at `index.tsx:250, 676, 1031`. Server has no record of premium entitlement. Exploit: `localStorage.setItem("unlocked_lideres_mundiais","true")` in devtools â†’ unlimited Trump/Milei generations forever (`index.tsx:676-677` short-circuits payment: `if (CHARACTERS[character].isPremium && unlockedLideres) handlePaid()`). Also bypasses paid status entirely since `handlePaid` itself doesn't verify anything (`index.tsx:400`).

**C6. Bonus PDFs ungated â€” public static assets.**
`public/downloads/250-oracoes-secretas.pdf` and `public/downloads/guia-filho-de-direita.pdf` exist as static files. `index.tsx:796-815` only renders the links when `paidBumps.oracoes/guia` is true client-side, but anyone can hit `/downloads/250-oracoes-secretas.pdf` and `/downloads/guia-filho-de-direita.pdf` directly. Same applies to `/downloads/dark-horse.pdf` referenced at `index.tsx:1808`.

**C7. Hard-coded Lovable preview as webhook host.**
`src/lib/payment.functions.ts:31-33`: `process.env.PUBLIC_APP_URL ?? "https://project--14abfb64-7c25-4b6e-b573-5a86b49933f1.lovable.app"`. `.env` does NOT set `PUBLIC_APP_URL` (only Supabase keys). In production, NexusPag will POST webhooks to the Lovable preview host, not `meuamigobolsonaro.com.br`. Combined with C1 this is moot for unlock but breaks reconciliation, breaks moving off Lovable, and leaks signed webhook traffic to a dev URL.

## HIGH

**H1. `NEXUSPAG_API_KEY` absent â†’ silent mock mode in prod.**
`payment.functions.ts:18-27` falls back to returning a fake `mock-pix-${Date.now()}` PIX with a placeholder QR. `.env` does not define `NEXUSPAG_API_KEY` nor `NEXUSPAG_WEBHOOK_SECRET`. If deployed without those env vars, every checkout generates a fake QR; `getOrderStatus` auto-returns paid (C2). Effectively a free-photo factory.

**H2. NexusPag REST is the only "verification" path; outage = no unlocks.**
`payment.functions.ts:112-135` â€” `confirmPayment` (`index.tsx:1324-1339`) and the 3s polling loop (`index.tsx:1289`) both call `getOrderStatus`. On `resp.ok=false`, on JSON parse error, or on network failure the function returns `{status:"pending"}`. NexusPag down = legitimate paid users can't unlock. No reconciliation worker, no webhook-driven state.

**H3. Admin panel "Confirmar Pagamento" button fires Purchase pixel without any payment check.**
`admin.tsx:944-958` fires `fbq("track","Purchase",{value:6.22})` on click. Fine for testing, but the same pattern in `index.tsx:421-426, 392-397` runs on any `handlePaid()` â€” which is triggered the moment the client says paid (no server attest). Combined with C2/C3/C4, pixel events will fire on every fraud unlock, polluting ad data.

**H4. Webhook signature timing-attack handling is correct â€” but completely wasted.**
`nexuspag-webhook.ts:22-31` does HMAC + `timingSafeEqual` correctly, but the verified payload is then discarded. No idempotency table; if it were wired, replays would still go through (no dedup on `externalId` or NexusPag event id).

## MEDIUM

**M1. Duplicate PIX charges on every "Pagar com Pix" click.**
`index.tsx:1296-1322` `handleGenerate` creates a new `external_id = bma-${Date.now()}-${random}` every call (`payment.functions.ts:29`). No client-side debounce besides `disabled={loading}`. Reopening the modal (close â†’ reopen) generates a fresh PIX with a new ID â€” old PIX abandoned, never cleaned. The previous polling loop's `setInterval` is cleared (`index.tsx:1290`) so it's not duplicate-firing `onPaid`, but it floods the gateway with stale charges.

**M2. PIX expiration ignored.**
`index.tsx:1256` `setTimeLeft(600)` (10 min) is just a visual countdown. At `timeLeft <= 0` (line 1262) the interval stops but the QR/copy-paste stays usable; polling continues forever (no abort on 0). User can pay an expired PIX in their bank and the modal will never auto-detect â€” NexusPag's actual TTL (typically 30 min) is unrelated to the 10-min UI timer.

**M3. Idempotency â€” same `externalId` paid twice would re-fire `onPaid` repeatedly.**
The 3s poll (`index.tsx:1289`) doesn't stop after first paid; `onPaid()` calls `setShowPayment(false)`, which unmounts the modal and clears the interval. Practically fine. But if `getOrderStatus` is called concurrently (poll + manual "JÃ PAGUEI" button at `index.tsx:1686`), `onPaid` can be invoked twice in the same tick â†’ double Meta/TikTok Purchase pixel fires (`index.tsx:421-426`).

**M4. `confirmPayment` retry UX swallows server errors as "ainda nÃ£o detectado".**
`index.tsx:1332` shows the same toast for both "really pending" and "gateway returned 500". User can't distinguish.

**M5. `bumps.guia` price mismatch.**
`index.tsx:277` `t += 14.9` vs UI `R$ 14,90` (line 1402) â€” equal, fine. But `index.tsx:1378` subtracts `14.9` in the line-item recompute â€” correct. No bug, just confirms the entire price math lives client-side (C4).

**M6. `admin` panel auth is `localStorage.getItem("admin_logged_in") === "true"` with hard-coded password `"patriaamada"` (`admin.tsx:84, 94, 102`).** Not strictly payment, but the admin Test panel can call `createPixCharge` for any amount and disclose `qrCode`/`externalId` â€” anyone setting that localStorage key gets full admin including the diagnostic dump that may leak Supabase config.

---

## Question for Artur

The biggest gap is **C1 + C2 + C3 stacked**: the server doesn't persist payments, the watermark is pure CSS, and `mock-pix` auto-paid bypass is reachable even when `NEXUSPAG_API_KEY` is set (because the *client* picks the `externalId` it queries). Before going live:

**Do you want me to wire up the `orders` table now â€” write a row in `createPixCharge`, update it from the webhook, and gate `getOrderStatus` (and the photo unlock / PDF downloads) on the DB row rather than on what the client claims? Without that, any user with devtools (or just `mock-pix-x`) gets free HD photos, free premium pack, free PDFs, and you get inflated Meta Purchase events. Also: which production domain will host the webhook so I can replace the hard-coded Lovable URL â€” `meuamigobolsonaro.com.br`?**
