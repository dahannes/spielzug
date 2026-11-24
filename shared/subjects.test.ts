import { describe, expect, it } from 'vitest'
import { fitsGrade, gradeLabel, planFor, tapGrade } from './subjects.js'

describe('subjects and grades', () => {
  it('[SR-13] a player sees only the subjects and training types of their grade', () => {
    expect(planFor(1).map((s) => [s.subject, s.disciplines.map((d) => d.name)])).toEqual([['Deutsch', ['Wort-Diktat']]])
    expect(planFor(2).map((s) => s.subject)).toEqual(['Deutsch', 'Mathematik'])
    expect(planFor(4).flatMap((s) => s.disciplines.map((d) => d.name))).toEqual(['Wort-Diktat', 'Einmaleins', 'Dividieren', 'Vokabeln'])
  })

  it('[SR-13] grade ranges include both ends', () => {
    expect(fitsGrade({ min: 1, max: 2 }, 2)).toBe(true)
    expect(fitsGrade({ min: 1, max: 2 }, 3)).toBe(false)
    expect(gradeLabel({ min: 4, max: 4 })).toBe('4')
    expect(gradeLabel({ min: 1, max: 2 })).toBe('1–2')
  })

  it('[SR-13] a tap picks one grade; only with "Mehrere Klassen" a second tap spans a range', () => {
    expect(tapGrade({ min: 4, max: 4 }, 2)).toEqual({ min: 2, max: 2 })
    expect(tapGrade({ min: 2, max: 4 }, 3)).toEqual({ min: 3, max: 3 })
    const range = tapGrade({ min: 4, max: 4 }, 2, true)
    expect(range).toEqual({ min: 2, max: 4 })
    expect(tapGrade(range, 5, true)).toEqual({ min: 5, max: 5 })
    expect(tapGrade({ min: 3, max: 3 }, 3, true)).toEqual({ min: 3, max: 3 })
  })
})
