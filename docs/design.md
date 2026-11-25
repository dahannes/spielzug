# Design rules

Visual language: football collector cards (Panini sticker). The start page (`PlayerCardPage.tsx`, `CardFace.tsx`, `RoundsBar.tsx`) is the reference implementation. Tailwind v4; tokens in `src/index.css`. "Target" = agreed, not implemented yet.

## Design tool

The main UI tool is the **design canvas "Spielzug UX-Entwurf"**: https://claude.ai/artifact/UpsjxGtHUt8HTZfG8cmzLu (a claude.ai Design artifact, private to the maintainer's account; agents read and update it with the Artifact tool, never by web fetch). Agents without access to it skip the canvas steps and say in their handoff which boards need an update (e.g. the sitemap W0); the code and this file are the source of truth.

| Page | Content |
|---|---|
| Fächer & Klassen | Trainingsplan by subject and Klasse (T12/P11), trainer lists with Fach and Klasse (T13) |
| Visuelle Exploration · Moodboards | collector-card directions (M1–M3) |
| Iteration 2 · Wireframes | **Sitemap (W0)** – all routes and flows, kept current; tablet (T1–T11) and phone (P1–P10) wireframes |
| Iteration 1 | first prototype (history only) |

- New screens and larger UI changes are sketched there first (tablet and phone board), then built; the boards may lag behind the code – the code and this file win.
- The sitemap board (W0) is updated in the same change as a route or flow change (`src/app/paths.ts`, round steps). It carries its date ("Stand …") in the title.
- Keep only fictional data on the canvas (no real child names or photos, ADR-010).

## Fonts

| Font | Use | Weights |
|---|---|---|
| Barlow Condensed (`font-display`) | Page titles, card eyebrows/labels, player name, shirt number, button labels on cards. Always `uppercase`. | 700, 800 |
| B612 (`font-sans`, default) | Everything a child reads as words: list titles, words, body, captions. Never `uppercase` – German nouns keep their capital (spelling app). | 400, 700 only |
| B612 Mono digits | Digits inside B612 text (face `B612 Digits`), so numbers line up. | 400, 700 |

- B612 has no 600/800: use `font-bold` only. `font-semibold`/`font-extrabold` on B612 render as faux bold or nothing. (Target: `buttonClass` in `src/components/styles.ts` still uses `font-semibold`.)
- `font-extrabold` only together with `font-display`.

## Type scale

| Role | Classes |
|---|---|
| Page title | `font-display text-3xl font-extrabold tracking-wide uppercase` |
| Card title | `text-xl leading-tight font-bold` |
| Eyebrow / label | `font-display text-sm font-bold tracking-[0.12em] text-slate-500 uppercase` |
| Body | `text-base`; emphasis `font-bold text-slate-700` |
| Meta / caption | `text-sm text-slate-500` – no `text-xs` for content parents read |
| Badge / chip text | `text-sm font-bold` |
| Numbers on cards | display: `font-display font-extrabold`; stat values: B612 `font-bold` |

The player card uses the same roles in `cqw` (it scales with its width, see `CardFace.tsx`): eyebrow `font-display text-[3.6cqw] font-bold tracking-[0.12em] uppercase`. One weight per role.

## Spacing

- Tailwind scale only; steps in use: 0.5, 1.5, 2, 3, 4, 6.
- **Card frame:** one frame around everything inside a sticker card – `p-3` (12px) on list cards, `p-[2.5cqw]` on the player card. Inner blocks (picture, start button, bar) touch the frame; text inside adds `px-2`.
- **Edges align:** left text edges, right edges of bar and button – within a card and across stacked cards and placeholders.
- **Group by meaning:** lines that belong together `mt-0.5`–`mt-2`; a new group `mt-4`. A caption sits close to what it describes.

## Radii

- Sticker card and placeholder: `rounded-2xl` (16px).
- Nesting: inner radius ≈ outer − frame → 8px inside cards (`rounded-lg`; on the player card `rounded-[2cqw]`).
- Pills (badges, chips, colour tag): `rounded-full`. No other radius values.

## Touch targets

- Everything tappable ≥ 44px: chips `min-h-11`, bar segments `h-11`, buttons `min-h-12` (`buttonClass`).
- A small visual hint inside a larger target is fine (✎ on the player picture; the whole picture is the button).

## Colour

| Use | Token |
|---|---|
| Player scheme action colour (CSS variable `--player`) | `bg-player`, `text-player`, `border-player`; `bg-player-soft` is the action colour mixed 80% with white for a visible focus ring |
| Hero surfaces (player picture, start button) | `heroStyle(scheme)` + `HeroPattern`: dark kit = action colour → navy with white text; light kit = kit colour with the scheme's dark text (see Colour schemes) |
| Page background | `bg-chalk` |
| Text primary / secondary / meta | `text-slate-900` / `text-slate-700` / `text-slate-500` |
| Quiet surfaces (stat tiles, empty bar) | `bg-slate-100` (bar: `+ ring-1 ring-inset ring-slate-200`) |
| Status new / active / done | `bg-slate-100 text-slate-600` / `bg-amber-100 text-amber-900` / `bg-emerald-100 text-emerald-800` |
| Disabled | primary `bg-slate-400`; secondary `bg-slate-100 text-slate-400`; link `text-slate-400` – a locked button must never look tappable |

Player scheme marks identity and the primary action, never a status.

The base is neutral (chalk, white, slate) on purpose: colour belongs to the player. The only fixed colour is navy `#0b1b3a`, the end of every hero gradient. `brand-*` (green `#0f5132`) is left over from the prototype and only used on login messages, error and not-found pages and the photo capture bar; don't use it for anything new.

## Logo

Key visual: a trainer's whiteboard, with runs drawn in marker. The logo ("Navy · Kreide") is an S made of two half-circle arrows (runs) that both point to the ball in the middle, drawn in chalk `#fbfaf6` on navy `#0b1b3a`.

- The shape has wide oval arcs like Barlow Condensed, round caps and small arrowheads, so it still reads at 16 px. Don't add a ring (it reads as a sync icon) or dashed lines (they vanish at 16 px).
- In the app it is `<Logo>` (`src/components/Logo.tsx`), next to the wordmark "Spielzug" in the page-title style. Header: `size-8`, `text-2xl`. Login: `size-12`, `text-4xl`.
- Icons: `public/icon.svg` is the favicon (rounded). The PNGs (`apple-touch-icon.png` 180, `icon-192.png`, `icon-512.png`) are full-bleed squares, because iOS and Android round the corners themselves; the mark stays inside the maskable safe zone. `theme_color` and `background_color` are navy.
- When the shape changes, update `Logo.tsx` and `icon.svg` together and render the PNGs again from `icon.svg` (with `rx="0"`).

## Colour schemes (Verein)

- Each player card stores one scheme id in `children.color`; the form calls it **Verein**. A scheme is built from attributes, defined in `src/features/children/schemes.ts` and drawn by `PlayerCrest`:
  - `shape`: shield, round-shield, curved, circle, oval, diamond, square
  - `pattern.type`: plain, stripes, halves, quarters, band, sash, lozenges, waves, flanks, chevron; `pattern.direction`: vertical, horizontal, rising (↗), falling (↘); optional count, split, piping
  - `colors` (field, pattern, piping), `trim` (rim inside the navy outline), optional `emblem` (ball)
  - `text`: text colour on the card picture; `action`: the app colour (`--player`)
- Inspired by well-known club colours and kit patterns, never by a crest: no club names, abbreviations, monograms, founding years, heraldic figures (crown, cannon, lion, birds, towers) and never the layout of a real logo (e.g. a roundel with a ring around a pattern). Colours and generic kit patterns are fine. Names are colour names ("Rot-Weiß-Blau").
- **Dark kits** (white `text`): the picture runs from the action colour into navy `#0b1b3a`. **Light kits** (dark `text`, e.g. Weiß-Gold, Himmelblau, Schwarz-Gelb): the picture is the kit colour itself with dark text. The kit pattern lies on top (`HeroPattern`: 20 % screen on dark, 14 % multiply on light). Same on the start button.
- Unit tests check every scheme: white on `action` ≥ 4.5:1, focus ring ≥ 3:1, `text` on the picture ≥ 4.5:1 and ≥ 3:1 where the pattern lies (large text). Crest colours need no contrast with each other: the navy outline carries the shape, down to 16 px.
- Earlier ids map to their closest scheme (migrations `20261113110000`, `20261113120000`; the client also maps them for stale caches). Default: Schwarz-Weiß (one star; migration `20261113130000`).
- The list will grow (later tied to progress), so the picker is a swipe row, not a grid.
- **Card body:** the sticker edge around the picture, name, position and stats takes the crest's rim colour (`trim`, ADR-039). Name (`cardText`) and position (`cardAccent`) use a colour from the scheme's own set, white or navy, ≥ 4.5:1 on the rim; stat tiles follow `cardTile`. Unit tests check this for every scheme.
- **Rarity (`tier`, 1–5 ★):** how elaborately the crest is made, never how good a club is. 1 Basis (two colours, plain pattern, white/black rim) · 2 Muster (sash, band, chevron, piping) · 3 Farbrand (coloured rim, lozenges, waves) · 4 Metall (old-gold rim) · 5 Glanz (metal plus emblem or three colours). Keep it a pyramid: no tier over 35 %, tier 5 at most 20 %.
- Stars (`TierStars`): only filled ones, never empty ones (no "3 of 5" that reads like a mark for the child); navy; in the crest pill right after the club name and under each club in the picker, never next to name, position or stats. The picker sorts by tier with a thin divider between tiers.
- Later (P3): metal gradient on the rim for tier 4, a static foil streak for tier 5 – contrast of name and position must hold on every gradient stop.

## Patterns

| Pattern | Classes | Notes |
|---|---|---|
| Sticker card | `rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,.15),0_10px_24px_rgba(0,0,0,.16)]` | `STICKER` in `ListParts.tsx`. The player card (`CardFace.tsx`) lies flat like paper on a table instead: `card-paper` (index.css) – bevel, a 2px edge in board colour stepped down-right so its thickness shows, contact shadow and a short soft one; light from the top left (target: one `stickerClass` in `styles.ts`) |
| Placeholder ("kommt später") | `rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 px-5 py-4 text-slate-500` | no shadow: not playable yet |
| Badge | `inline-flex h-6 items-center rounded-full border-2 px-2.5 text-xs font-bold` (`BADGE`) | outlined `border-player text-player` for dates; filled `border-transparent` + status colour; same height either way. On list cards they share the label's line (right, `shrink-0`; the label truncates); phones drop "Spieltag" and "Abgeschlossen" (✓ only, name for screen readers) |
| Filter chip | `min-h-11 rounded-full px-3 sm:px-4 text-sm font-bold` | pressed `bg-player text-white`, else `border border-slate-300 bg-white text-slate-700`; row label `sm:w-14`, `sr-only` on phones. On the start page the chips fold away behind a "Filter" toggle (funnel, chevron, `aria-expanded`), closed by default; the closed toggle names the active filters ("Filter · Neu") |
| Progress bar | `rounded-full`, `h-6` on cards, `h-8` in the Spielvorbereitung; segments `bg-player` / `bg-player/70` alternating, 2px white dividers, numbered like their game (`text-xs`); the rest `bg-slate-100` | shows only (`role="img"`, "x von n Wörtern sicher"); no tap targets in it. Notches at the bottom: one per word boundary (`w-px h-2`, every fifth `h-3.5`; `bg-white/25`/`/40` on segments, `bg-slate-500/15`/`slate-600/25` on the rest), lists over 60 words every fifth only; segment edges carry none |
| List card (Trainingsplan) | sticker card `p-3`: label line (subject tag, training type, badges right), title `text-xl`, then the bar with a chevron `text-slate-400` | the whole card is one link (the title's `Link` stretched with `after:absolute after:inset-0`, focus ring on it); hover lifts it 2px with a stronger shadow (none with reduced motion) |
| Spielvorbereitung | back link "Trainingsplan"; eyebrow "Spielvorbereitung", label line, title as page title (`font-display text-4xl uppercase`); sticker card `p-4` with the bar `h-8`, "**x** von n Wörtern sicher" and the start (hero surface, `h-18`, full width, ▶ + "Training starten"); section titles "Spiele" / "Wörter n" `font-display text-2xl uppercase` | tablet: two columns (start left, games and words right); phone: one. A game is a white row (`rounded-xl ring-1 ring-slate-200`, `min-h-14`): number tile `size-8 rounded-lg` in its segment's shade (slate without a segment), "Spiel n" with the date, "x von n richtig" and "+n Tore" right, chevron; its Berichtigung below (`border-t`, indented): a secondary button on `bg-amber-50` while open, a link "✓ geschafft" when done. Words as chips: secure `bg-emerald-100 text-emerald-800 font-bold` with ✓, others white with a slate border |
| Subject tag | `h-6 min-w-7.5 rounded-md px-1 font-display text-base font-extrabold text-white normal-case`; Deutsch `bg-rose-700` "De", Mathematik `bg-teal-700` "Ma", Englisch `bg-indigo-700` "En" | like a school timetable; fixed colours, independent of the kit. Leads the card label ("[De] WORT-DIKTAT") and the Fach chips; `role="img"` with the subject as name, `aria-hidden` where the name is written next to it |
| Tabs (start page) | `role="tablist"` with `border-b-2 border-slate-200`; tab = page title (`font-display text-3xl font-extrabold uppercase`), `min-h-11 border-b-4 -mb-0.5`; selected `border-player text-slate-900`, else `border-transparent text-slate-400` | Trainingsplan · Liga, equal rank. Arrow keys/Home/End switch; the open tab is in the URL (`?tab=liga`, replace); both panels stay mounted (`hidden`) |
| Card tilt (start page) | the player card lies at a random angle, −1.5° to +1.5° rotation and ±0.3° skew (`randomTilt` in `PlayerCardPage`), drawn anew on every change of player | on a wrapper inside the shared-layout element, so the flight into the editor measures an upright box |
| Card picture (film look) | three layers in `CardFace`'s picture, classes in `index.css`: `film-focus` (backdrop blur `0.7cqw`, masked to the edges – the player stays sharp), `film-light` (warm light from the top left, vignette, darker foot; `soft-light`), `film-grain` (still SVG noise, 22 %, `overlay`) | slightly cinematic, analogue print; no animation. Club pill, pen and team label lie above it and stay clean |
| Stat tile | `rounded-[1.6cqw] px-[2.5cqw] py-[1.6cqw]`, background `cardTile(scheme)` (white on a coloured rim, `slate-100` on a white one); label `text-slate-600`, value `font-bold text-slate-900` | target: `rounded-[2cqw]`, label as eyebrow |
| Club picker (Verein) | `SwipeRow` of bare crests (`size-24`, no card): the chosen one springs to full size with its name (`text-xs font-bold`) and stars below, the others at two thirds and 60 % opacity; native radio overlay with the club name as `aria-label` | drag with finger or mouse, snaps; a drag never selects; arrows (fine pointer only) choose the previous/next club; the chosen club starts centred. Clubs above the league (SR-63): crest greyed (`opacity-35 grayscale`) with a padlock and its stars on top, radio disabled, `aria-label` "<Club>, ab der <Liga>"; arrows and card swipe skip them; one caption below the row (`text-sm text-slate-500`) names the next league |
| Liga panel | sticker card (`p-3`, text `px-2`) in the Liga tab: the league name with its stars as title (`text-2xl`, no eyebrow – the tab says "Liga"), then the next league's goals – label and `x/y` (✓ in `text-emerald-800` when met) over a thin bar (`h-2 rounded-full`, `bg-player`, met `bg-emerald-600`) | stars filled only (like `TierStars`); no empty stars |
| Aufstieg dialog | shared `Dialog size="compact"`, centred: eyebrow "Aufstieg!", league name as page title with stars, one sentence, the newly opened crests (`size-16`) with names, a hint to tap the card, "Super!" in the `DialogFooter` | shown once per promotion, from the layout (any page) |
| Labels in the player form | `legend` | Game UI: self-explaining controls (crests, shirt, pitch) keep their legend for screen readers only (`sr-only`); visible legends only where a control does not explain itself (Klasse, Foto – trainers only). Every control keeps an accessible name |
| Swipe row | shared `SwipeRow` (`src/components/SwipeRow.tsx`, plain pointer events like `CardSwiper`) | for growing horizontal lists; the first 8px decide: sideways drags the row (pointer captured), up/down is left to the page; a flick carries on and snaps; wheel/trackpad and keyboard focus move it; reduced motion: no momentum. Parents must allow it to shrink (`min-w-0`; grid columns `minmax(0,1fr)`; fieldsets are `min-content` wide by default) |
| Modal sheet | shared `Dialog`, `size="compact"` or `"wide"` | Bottom-anchored, edge-to-edge on phones; width capped and centered on larger screens; scrolls, respects the bottom safe area, and Motion fades/slides it from and to the bottom (240 ms); the backdrop dims and blurs the page with it (`--backdrop` 0–1, 4px). While closing it keeps its last content. Reduced motion: no transition. |
| Player editor | `Dialog presentation="stage"` + `PlayerForm` layers (`player-editor-layer` / `-sheet` / `-column` in index.css) | The whole card (stats included) lies on its own layer, tilted 1.5°, at most 85% of the column and leaving room for the form; the white form sheet slides up and scrolls over it, covering exactly the stats at the top. From the start page the card flies in from its place (shared `layoutId`) and back on close; from the gallery it just appears. Swiping the card changes the club in tier order, in step with the club row (stops at the ends); tapping free space (not card, not form) closes it. |
| Card swipe | shared `CardSwiper` (`src/features/player/CardSwiper.tsx`) | the card follows the finger with a slight tilt, moves on past 60px and the next one slides in from that side (220 ms); at an end it only gives a little; a swipe never counts as a tap. Start page: players (wrap around, arrows and dots below); editor: clubs. |
| Modal footer | shared `DialogFooter` | the action row of every modal sticks to the bottom of what scrolls (border-top, white, safe area); only the main actions (Abbrechen, Speichern/confirm). Rare destructive actions (Spieler löschen) sit at the end of the content, not in the footer |
| Shirt back | `ShirtBack` (`PlayerControls.tsx`) | name and number are edited on the back of the club's shirt (clip-path silhouette with sleeves and collar, at most 17rem, name and digits in container units (`cqw`) so it works in a half-width column, `heroStyle` + `HeroPattern` like the card picture; a new club's kit fades in over the old one): the name as a printed input (Barlow, uppercase, centred, underline), below it the `NumberRoller` in `printed` mode (big digits in the shirt's text colour, quiet arrows that brighten on touch or focus). Sections of the form are 24px apart. In the player form all labels (legends) and tile rows are centred. |
| Number roll | `NumberRoller` (`src/features/player/PlayerControls.tsx`) | shirt number as two scoreboard digits (tens, ones), navy tiles, Barlow digits; ▲/▼, swipe up/down (one digit per 24px), arrow keys or typing a digit; each digit a `spinbutton`; no number shows dashes |
| Position pitch | `PositionPitch` (`PlayerControls.tsx`) | a pitch from above, upright, next to the shirt like a line-up board (grid `1.15fr / 1fr` on every width) and as tall as the shirt: it stretches non-proportionally (SVG markings with `preserveAspectRatio="none"` and non-scaling strokes; centre circle and spot as HTML so they stay round). `#1e6b35`, mown stripes. Sturm at the opponent's box on top, Mittelfeld above the halfway line, Abwehr below it, Tor in the own box; zones are radio tap areas (labels white, 6.5:1, ≥ 44px tall on phones); the chosen zone holds the player's shirt in miniature (`MiniShirt`: club kit, number or initial) that runs to a new zone (Motion `layoutId`). Wings later, maybe by drag and drop |
| Full-screen modal | shared `Dialog`, `presentation="fullscreen"` | Only for immersive photo review/zoom; keeps the same focus, close, backdrop and bottom-transition behavior as a sheet. |

Use the shared `Dialog` for every modal; do not create dialog markup or animation styles per feature. Prefer the bottom-sheet presentation and select only its size. Use full-screen presentation only when the task needs the entire viewport. The component owns placement, motion, backdrop, focus, Escape and backdrop dismissal; feature code supplies the content.

## Motion & layout pitfalls (learned 2026-11-13)

Motion (`motion/react`) is the only animation system for interactions (ADR-038). What cost time:

- **Top layer:** a modal `<dialog>` and its `::backdrop` lie above everything on the page. A page element can never fly above the backdrop; a shared `layoutId` flight back to the page therefore runs under it (accepted for the player card).
- **Containing blocks:** `transform`, `filter`, `will-change` or `container-type` on a dialog make it the containing block, even for `position: fixed` children, and a scroll container clips transformed children. Layers that must fly across the screen sit in a non-transformed, non-containing stage (`presentation="stage"`).
- **Transforms add scroll overflow:** an element sliding in with `translateY(100%)` inside a scroll container makes it scrollable meanwhile. Slide the scroll container itself, inside a parent that does not scroll.
- **Initial focus scrolls:** `showModal()` focuses the first control and scrolls it into view, before the content is in place. A stage focuses itself (`autofocus` on the dialog).
- **Effect order:** layout effects run child first, so a child cannot measure the dialog the parent opens in its layout effect; measure in passive effects (or let Motion measure, `layoutId`).
- **No Motion `drag` for gestures inside a scroller** (learned 2026-11-17, iPhone): with `touch-action: pan-y`, iOS takes a slightly diagonal swipe as scrolling and cancels the pointer, so Motion's drag stopped halfway ("sometimes it works"). Use plain pointer events with a direction lock and `setPointerCapture` (`SwipeRow`, `CardSwiper`). They also work in Playwright's phone emulation, where Motion's drag did not start. Wait until surrounding animations are done before asserting a drag in E2E.
- **iOS does not scroll a scroller with `pointer-events: none`**, even where its children take touches (learned 2026-11-17: the player editor's form could not be pulled up on an iPhone). Let the scroller take touches; put what must be touchable behind it inside it, `position: fixed` (the player editor's card layer), and never put a transform on that scroller.
- **Animations fight gestures:** don't start an animation on focus that a press also triggers (only `:focus-visible`), or it overrides the drag.
- **Click guards:** after a drag, swallow exactly one pointer click; never a keyboard click (`event.detail === 0`).
- **Variants** flow only to motion children with the same labels (`when: 'beforeChildren' | 'afterChildren'`); imperative `animate()` does not take part.
- **`::backdrop`** inherits custom properties from its dialog: animate a variable (`--backdrop`) instead of the pseudo-element.
- **Flex/grid min sizes:** grid items and flex children default to `min-width: auto` and a `<fieldset>` to `min-content`: a wide row (the club picker) stretched the whole form. Use `grid-cols-[minmax(0,1fr)]` and `min-w-0`.
- **Debug slowly:** a temporary slow-motion factor (springs: stiffness ÷ f², damping ÷ f) and frame strips from Playwright screenshots showed problems that guessing did not. Never commit the factor.
- **Browsers:** Chrome on iPad requests desktop sites by default and keeps the first orientation's width; check layouts in Safari.

## Review checklist (every UI change)

- [ ] Screenshots at iPad landscape and phone width, next to the start page, with fictional data.
- [ ] Left text edges and right edges align within the card and across stacked cards.
- [ ] One frame per card; nothing sits closer to the edge than the frame.
- [ ] Inner radii follow the nesting rule; no new radius values.
- [ ] Each text has a role from the type scale; one weight per role.
- [ ] No `font-semibold`/`font-extrabold` and no `uppercase` on B612.
- [ ] Tap targets ≥ 44px; focus ring visible (`focusClass`).
- [ ] Dialogs use the shared `Dialog`, remain usable at the bottom safe area, and honor reduced-motion preferences.
- [ ] Player colour only for identity and the primary action; status uses status colours.
- [ ] Empty, disabled, long-text and phone states checked (titles truncate, badges and chips wrap cleanly).
- [ ] Classes come from the patterns above or shared constants; a new pattern is added here in the same commit.
- [ ] New route or changed flow: sitemap board (W0) on the [design canvas](#design-tool) updated.
