import { describe, expect, it } from 'vitest'
import { cardTile, DEFAULT_SCHEME, HERO_PATTERN, isLightKit, mixHex, NAVY, PLAYER_SCHEMES, playerScheme, playerSchemeId } from './schemes'

const WHITE = '#ffffff'

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('player colour schemes', () => {
  it.each(PLAYER_SCHEMES.map((s) => [s.label, s] as const))('[SR-62] %s keeps app and card text legible', (_, scheme) => {
    // buttons in the app carry white text on the action colour; the focus ring stays visible on white
    expect(contrast(WHITE, scheme.action)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(mixHex(scheme.action, WHITE, 0.2), WHITE)).toBeGreaterThanOrEqual(3)

    // card picture: where the gradient starts, and where the kit pattern lies on it (large text: 3:1)
    const start = isLightKit(scheme) ? scheme.colors[0] : scheme.action
    const { opacity } = isLightKit(scheme) ? HERO_PATTERN.light : HERO_PATTERN.dark
    expect(contrast(scheme.text, start)).toBeGreaterThanOrEqual(4.5)
    for (const colour of scheme.colors) expect(contrast(scheme.text, mixHex(start, colour, opacity))).toBeGreaterThanOrEqual(3)
  })

  it.each(PLAYER_SCHEMES.map((s) => [s.label, s] as const))('[SR-62] %s keeps the card body legible on its rim colour', (_, scheme) => {
    // name and position use the scheme's own colours (or white/navy) and pass on the rim
    const allowed = new Set<string>([...scheme.colors, scheme.trim, scheme.text, scheme.action, WHITE, NAVY])
    expect(allowed).toContain(scheme.cardText)
    expect(allowed).toContain(scheme.cardAccent)
    expect(contrast(scheme.cardText, scheme.trim)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(scheme.cardAccent, scheme.trim)).toBeGreaterThanOrEqual(4.5)
    // stat tiles: label slate-600, value slate-900
    expect(contrast('#475569', cardTile(scheme))).toBeGreaterThanOrEqual(4.5)
    expect(contrast('#0f172a', cardTile(scheme))).toBeGreaterThanOrEqual(4.5)
  })

  it('[SR-62] rarity: basic clubs stay plain, no tier crowds the list, sorted for the picker', () => {
    for (const scheme of PLAYER_SCHEMES.filter((s) => s.tier === 1)) {
      expect([WHITE, '#111111']).toContain(scheme.trim)
      expect('piping' in scheme.pattern && scheme.pattern.piping).toBeFalsy()
    }
    for (const tier of [1, 2, 3, 4, 5]) expect(PLAYER_SCHEMES.filter((s) => s.tier === tier).length / PLAYER_SCHEMES.length).toBeLessThanOrEqual(0.35)
    expect(PLAYER_SCHEMES.filter((s) => s.tier === 5).length / PLAYER_SCHEMES.length).toBeLessThanOrEqual(0.2)
    expect(PLAYER_SCHEMES.map((s) => s.tier)).toEqual([...PLAYER_SCHEMES.map((s) => s.tier)].sort())
  })

  it('[SR-62] has unique ids', () => {
    expect(new Set(PLAYER_SCHEMES.map((s) => s.id)).size).toBe(PLAYER_SCHEMES.length)
  })

  it('[SR-62] maps earlier ids to their closest scheme and unknown ones to the default', () => {
    expect(['blue', 'red', 'green', 'yellow', 'purple', 'orange'].map(playerSchemeId)).toEqual(['koenigsblau', 'rot-weiss-blau', 'gruen-weiss', 'schwarz-gelb', 'blau-granat', 'rot-schwarz'])
    expect(['rot-weiss', 'blau-weiss', 'weinrot-blau', 'weiss-schwarz'].map(playerSchemeId)).toEqual(['rot-weiss-blau', 'koenigsblau', 'blau-granat', 'schwarz-weiss'])
    expect(playerSchemeId('unknown')).toBe(DEFAULT_SCHEME)
    expect(playerScheme(null).id).toBe(DEFAULT_SCHEME)
  })
})
