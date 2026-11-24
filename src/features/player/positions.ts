// Positions on the pitch, top (attack) to bottom (goal); the database allows exactly these ids.

export const POSITIONS = [
  { id: 'sturm', label: 'Sturm' },
  { id: 'mittelfeld', label: 'Mittelfeld' },
  { id: 'abwehr', label: 'Abwehr' },
  { id: 'tor', label: 'Tor' },
] as const

export type PositionId = (typeof POSITIONS)[number]['id']

const DEFAULT_POSITION: PositionId = 'mittelfeld'

export const positionId = (value: string | null | undefined): PositionId => POSITIONS.find((p) => p.id === value)?.id ?? DEFAULT_POSITION

export const positionLabel = (value: string | null | undefined): string => POSITIONS.find((p) => p.id === positionId(value))!.label
