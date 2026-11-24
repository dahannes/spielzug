// Player colour schemes (ADR-036): each card gets a crest built from a shape, a pattern with a
// direction and the scheme's colours. Inspired by club colours and kit patterns, never by a real
// crest: no names, monograms, heraldic figures or the exact layout of a real logo.

export type CrestShape = 'shield' | 'round-shield' | 'curved' | 'circle' | 'oval' | 'diamond' | 'square'

type PatternType = 'plain' | 'stripes' | 'halves' | 'quarters' | 'band' | 'sash' | 'lozenges' | 'waves' | 'flanks' | 'chevron'

/** Rising runs from bottom left to top right (↗), falling from top left to bottom right (↘). */
type PatternDirection = 'vertical' | 'horizontal' | 'rising' | 'falling'

interface SchemePattern {
  type: PatternType
  direction?: PatternDirection
  /** Stripes or waves. */
  count?: number
  /** Halves: share of the first colour (0–1). */
  split?: number
  /** Band and sash: thin edges in the third colour. */
  piping?: boolean
}

export interface PlayerScheme {
  id: string
  label: string
  shape: CrestShape
  pattern: SchemePattern
  /** Field colour, pattern colour, piping colour. */
  colors: readonly [string, ...string[]]
  /** Rim of the crest, inside the navy outline. */
  trim: string
  emblem?: 'ball'
  /** Text on the card picture. White on dark kits; a dark colour turns the picture into the light kit itself. */
  text: string
  /** Buttons and highlights in the app (`--player`); always carries white text. */
  action: string
  /** Rarity 1–5: how elaborately the crest is made (pattern, piping, emblem, metal rim) – never how good a club is. */
  tier: 1 | 2 | 3 | 4 | 5
  /** Name on the card body, whose colour is the rim (`trim`); from the scheme's own colours, white or navy. */
  cardText: string
  /** Position line on the card body; same rule. */
  cardAccent: string
}

export const NAVY = '#0b1b3a'
const WHITE = '#ffffff'

// Sorted by tier: the picker shows them in this order.
export const PLAYER_SCHEMES = [
  { id: 'schwarz-weiss', label: 'Schwarz-Weiß', tier: 1, shape: 'diamond', pattern: { type: 'stripes', direction: 'vertical', count: 7 }, colors: ['#111111', '#ffffff'], trim: '#111111', text: WHITE, action: '#111111', cardText: WHITE, cardAccent: WHITE },
  { id: 'rot-schwarz', label: 'Rot-Schwarz', tier: 1, shape: 'oval', pattern: { type: 'stripes', direction: 'vertical', count: 5 }, colors: ['#d4141a', '#111111'], trim: '#ffffff', text: WHITE, action: '#d4141a', cardText: '#111111', cardAccent: '#d4141a' },
  { id: 'rot-tuerkis', label: 'Rot-Türkis', tier: 1, shape: 'curved', pattern: { type: 'flanks' }, colors: ['#c8102e', '#00b2a9'], trim: '#ffffff', text: WHITE, action: '#c8102e', cardText: NAVY, cardAccent: '#c8102e' },
  { id: 'gruen-weiss', label: 'Grün-Weiß', tier: 2, shape: 'curved', pattern: { type: 'sash', direction: 'rising', piping: true }, colors: ['#00843d', '#ffffff', '#0b1b3a'], trim: '#ffffff', text: WHITE, action: '#00843d', cardText: NAVY, cardAccent: '#00843d' },
  { id: 'nachtblau-rot', label: 'Nachtblau-Rot', tier: 2, shape: 'shield', pattern: { type: 'band', direction: 'vertical', piping: true }, colors: ['#004170', '#da291c', '#ffffff'], trim: '#ffffff', text: WHITE, action: '#004170', cardText: NAVY, cardAccent: '#004170' },
  { id: 'schwarz-gelb', label: 'Schwarz-Gelb', tier: 2, shape: 'shield', pattern: { type: 'chevron' }, colors: ['#fde100', '#111111'], trim: '#111111', text: '#111111', action: '#111111', cardText: WHITE, cardAccent: '#fde100' },
  { id: 'himmelblau', label: 'Himmelblau', tier: 3, shape: 'circle', pattern: { type: 'waves', count: 3 }, colors: ['#6cabdd', '#ffffff'], trim: '#1c2c5b', text: '#1c2c5b', action: '#1c2c5b', cardText: WHITE, cardAccent: '#6cabdd' },
  { id: 'rot-weiss-blau', label: 'Rot-Weiß-Blau', tier: 3, shape: 'shield', pattern: { type: 'lozenges' }, colors: ['#0066b2', '#ffffff'], trim: '#dc052d', text: WHITE, action: '#c8042a', cardText: WHITE, cardAccent: WHITE },
  { id: 'blau-granat', label: 'Blau-Granat', tier: 3, shape: 'curved', pattern: { type: 'stripes', direction: 'vertical', count: 5 }, colors: ['#004d98', '#a50044'], trim: '#edbb00', text: WHITE, action: '#004d98', cardText: NAVY, cardAccent: '#004d98' },
  { id: 'rot-gold', label: 'Rot-Gold', tier: 4, shape: 'shield', pattern: { type: 'halves', direction: 'horizontal', split: 0.66 }, colors: ['#db0007', '#063672'], trim: '#b09b6e', text: WHITE, action: '#db0007', cardText: NAVY, cardAccent: NAVY },
  { id: 'schwarz-blau', label: 'Schwarz-Blau', tier: 4, shape: 'shield', pattern: { type: 'stripes', direction: 'vertical', count: 5 }, colors: ['#0068a8', '#111111'], trim: '#a29161', text: WHITE, action: '#0068a8', cardText: '#111111', cardAccent: '#111111' },
  { id: 'koenigsblau', label: 'Königsblau', tier: 5, shape: 'circle', pattern: { type: 'plain' }, emblem: 'ball', colors: ['#034694'], trim: '#dba111', text: WHITE, action: '#034694', cardText: NAVY, cardAccent: NAVY },
  { id: 'weiss-gold', label: 'Weiß-Gold', tier: 5, shape: 'round-shield', pattern: { type: 'sash', direction: 'falling', piping: true }, colors: ['#ffffff', '#3d2c8d', '#febe10'], trim: '#febe10', text: '#3d2c8d', action: '#3d2c8d', cardText: NAVY, cardAccent: '#3d2c8d' },
] as const satisfies readonly PlayerScheme[]

export type PlayerSchemeId = (typeof PLAYER_SCHEMES)[number]['id']

/** New players start with a one-star club. */
export const DEFAULT_SCHEME: PlayerSchemeId = 'schwarz-weiss'

/** Earlier ids, kept for stale cached rows; the migrations convert the stored ones. */
const LEGACY_IDS: Record<string, PlayerSchemeId> = {
  blue: 'koenigsblau',
  red: 'rot-weiss-blau',
  green: 'gruen-weiss',
  yellow: 'schwarz-gelb',
  purple: 'blau-granat',
  orange: 'rot-schwarz',
  'rot-weiss': 'rot-weiss-blau',
  'blau-weiss': 'koenigsblau',
  'weinrot-blau': 'blau-granat',
  'weiss-schwarz': 'schwarz-weiss',
}

const byId = new Map<string, PlayerScheme>(PLAYER_SCHEMES.map((scheme) => [scheme.id, scheme]))

export const playerSchemeId = (value: string | null | undefined): PlayerSchemeId =>
  (byId.has(value ?? '') ? (value as PlayerSchemeId) : LEGACY_IDS[value ?? '']) ?? DEFAULT_SCHEME

export const playerScheme = (value: string | null | undefined): PlayerScheme => byId.get(playerSchemeId(value))!

/** Themes the app with the scheme's action colour. */
export const playerTheme = (value: string | null | undefined) => ({ '--player': playerScheme(value).action })

/** A light kit shows its own colour behind dark text; a dark kit runs from the action colour into navy. */
export const isLightKit = (scheme: PlayerScheme) => scheme.text !== WHITE

/** Background and text colour of a hero surface (card picture, start button); the pattern lies on top. */
export function heroStyle(scheme: PlayerScheme): { backgroundImage: string; color: string } {
  const field = scheme.colors[0]
  return {
    backgroundImage: isLightKit(scheme) ? `linear-gradient(160deg,${field} 30%,${mixHex(field, NAVY, 0.12)})` : `linear-gradient(160deg,${scheme.action} 15%,${NAVY})`,
    color: scheme.text,
  }
}

/** Stat tiles on the card body: white on a coloured rim, light grey on a white one (labels slate-600 on both). */
export const cardTile = (scheme: PlayerScheme) => (scheme.trim === WHITE ? '#f1f5f9' : WHITE)

/** How strongly the kit pattern shows on hero surfaces. */
export const HERO_PATTERN = { light: { opacity: 0.14, blend: 'multiply' }, dark: { opacity: 0.2, blend: 'screen' } } as const

export function mixHex(base: string, overlay: string, share: number): string {
  const channel = (hex: string, i: number) => Number.parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16)
  return `#${[0, 1, 2].map((i) => Math.round(channel(base, i) * (1 - share) + channel(overlay, i) * share).toString(16).padStart(2, '0')).join('')}`
}
