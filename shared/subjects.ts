// School subjects and the training types in them (ADR-035). The catalog lives in code, not in the
// database: a training type needs code anyway. Each type names the school grades it suits; the
// content (a word list) carries its own, narrower grade range.

const SUBJECTS = ['Deutsch', 'Mathematik', 'Englisch'] as const
export type Subject = (typeof SUBJECTS)[number]

export interface Discipline {
  id: string
  name: string
  subject: Subject
  /** School grades (Klasse) it suits, inclusive. */
  grades: GradeRange
  /** False: shown as "kommt später". */
  available: boolean
}

export interface GradeRange {
  min: number
  max: number
}

export const GRADES = [1, 2, 3, 4, 5, 6] as const

const DISCIPLINES: readonly Discipline[] = [
  { id: 'word-dictation', name: 'Wort-Diktat', subject: 'Deutsch', grades: { min: 1, max: 6 }, available: true },
  { id: 'times-tables', name: 'Einmaleins', subject: 'Mathematik', grades: { min: 2, max: 4 }, available: false },
  { id: 'division', name: 'Dividieren', subject: 'Mathematik', grades: { min: 3, max: 4 }, available: false },
  { id: 'vocabulary', name: 'Vokabeln', subject: 'Englisch', grades: { min: 3, max: 6 }, available: true },
]

/** Training types with word lists (column `word_lists.discipline`). */
export const LIST_DISCIPLINES = ['word-dictation', 'vocabulary'] as const
export type ListDiscipline = (typeof LIST_DISCIPLINES)[number]

/** The catalog entry of a list's training type. */
export const disciplineOf = (id: ListDiscipline): Discipline => DISCIPLINES.find((d) => d.id === id)!

/** The language the child writes in: German words or English vocabulary. */
export const languageOf = (id: ListDiscipline): 'de' | 'en' => (id === 'vocabulary' ? 'en' : 'de')

export const fitsGrade = (range: GradeRange, grade: number) => range.min <= grade && grade <= range.max

/** "4" or "1–2". */
export const gradeLabel = ({ min, max }: GradeRange) => (min === max ? String(min) : `${min}–${max}`)

/** The subjects with their training types for one player's grade, in catalog order; empty subjects are left out. */
export function planFor(grade: number): { subject: Subject; disciplines: Discipline[] }[] {
  return SUBJECTS.map((subject) => ({ subject, disciplines: DISCIPLINES.filter((d) => d.subject === subject && fitsGrade(d.grades, grade)) })).filter(
    (s) => s.disciplines.length > 0,
  )
}

/**
 * Next range after tapping a grade chip (ADR-043): a tap picks just that grade. Only with
 * `multiple` on, a tap next to a single picked grade spans the range between them.
 */
export function tapGrade(range: GradeRange, grade: number, multiple = false): GradeRange {
  if (multiple && range.min === range.max && grade !== range.min) return { min: Math.min(range.min, grade), max: Math.max(range.max, grade) }
  return { min: grade, max: grade }
}
