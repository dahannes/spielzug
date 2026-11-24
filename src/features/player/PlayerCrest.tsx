import { useId, type ReactNode } from 'react'
import { HERO_PATTERN, isLightKit, NAVY, playerScheme, type CrestShape, type PlayerScheme } from '../children/schemes'

// Drawn in a 100 × 120 box; the shapes leave room for the outline.
const SHAPES: Record<CrestShape, string> = {
  shield: 'M8 6H92V56C92 86 72 103 50 114C28 103 8 86 8 56Z',
  'round-shield': 'M8 6H92V68A42 42 0 0 1 8 68Z',
  curved: 'M6 14C22 14 36 10 50 3C64 10 78 14 94 14V58C94 88 72 104 50 115C28 104 6 88 6 58Z',
  circle: 'M4 60a46 46 0 1 0 92 0a46 46 0 1 0 -92 0Z',
  oval: 'M10 60a40 53 0 1 0 80 0a40 53 0 1 0 -80 0Z',
  diamond: 'M50 4L96 60L50 116L4 60Z',
  square: 'M22 14H78Q92 14 92 28V92Q92 106 78 106H22Q8 106 8 92V28Q8 14 22 14Z',
}

/** The scheme's crest: shape, kit pattern, navy outline and rim. Decorative; the scheme name stands next to it. */
export function PlayerCrest({ schemeId, className = '' }: { schemeId: string; className?: string }) {
  const scheme = playerScheme(schemeId)
  const id = `crest${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const shape = SHAPES[scheme.shape]
  return (
    <svg viewBox="-5 -3 110 126" className={`shrink-0 ${className}`} aria-hidden="true">
      <defs>
        <clipPath id={`${id}c`}>
          <path d={shape} />
        </clipPath>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".32" />
          <stop offset=".45" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${id}c)`}>
        <KitPattern scheme={scheme} id={id} />
        {scheme.emblem === 'ball' && <Ball />}
        <rect x="-20" y="-20" width="140" height="160" fill={`url(#${id}g)`} />
      </g>
      <path d={shape} fill="none" stroke={NAVY} strokeWidth="12" strokeLinejoin="round" />
      {scheme.trim !== NAVY && <path d={shape} fill="none" stroke={scheme.trim} strokeWidth="6" strokeLinejoin="round" />}
    </svg>
  )
}

/** The kit pattern over a whole hero surface (card picture, start button); place it first inside a `relative overflow-hidden` box. */
export function HeroPattern({ scheme }: { scheme: PlayerScheme }) {
  const id = `hero${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  if (scheme.pattern.type === 'plain') return null
  const { opacity, blend } = isLightKit(scheme) ? HERO_PATTERN.light : HERO_PATTERN.dark
  return (
    <svg viewBox="0 0 100 120" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 size-full" style={{ opacity, mixBlendMode: blend }} aria-hidden="true">
      <KitPattern scheme={scheme} id={id} />
    </svg>
  )
}

const FIELD = { x: -80, y: -80, width: 260, height: 280 }

function KitPattern({ scheme, id }: { scheme: PlayerScheme; id: string }): ReactNode {
  const [a, b = a, c = '#ffffff'] = scheme.colors
  const { type, direction = 'vertical', count = 5, split = 0.5, piping = false } = scheme.pattern
  const tilt = (angle: number, node: ReactNode) =>
    direction === 'rising' ? <g transform={`rotate(${angle} 50 60)`}>{node}</g> : direction === 'falling' ? <g transform={`rotate(${-angle} 50 60)`}>{node}</g> : node
  const field = <rect {...FIELD} fill={a} />

  switch (type) {
    case 'plain':
      return field
    case 'stripes': {
      if (direction === 'vertical' || direction === 'horizontal') {
        const vertical = direction === 'vertical'
        const step = (vertical ? 92 : 112) / count
        return (
          <>
            {field}
            {Array.from({ length: count }, (_, i) =>
              i % 2 ? <rect key={i} {...(vertical ? { x: 4 + i * step, y: -20, width: step, height: 160 } : { x: -20, y: 4 + i * step, width: 140, height: step })} fill={b} /> : null,
            )}
          </>
        )
      }
      return tilt(
        35,
        <>
          {field}
          {Array.from({ length: 7 }, (_, i) => (
            <rect key={i} x={4 + (2 * i - 6) * 14} y={-80} width={14} height={280} fill={b} />
          ))}
        </>,
      )
    }
    case 'halves':
      if (direction === 'horizontal') return <>{field}<rect x={-20} y={4 + 112 * split} width={140} height={160} fill={b} /></>
      return tilt(35, <>{field}<rect x={4 + 92 * split} y={-80} width={180} height={280} fill={b} /></>)
    case 'quarters':
      return <>{<rect {...FIELD} fill={b} />}<rect x={-20} y={-20} width={70} height={78} fill={a} /><rect x={50} y={58} width={70} height={80} fill={a} /></>
    case 'band': {
      const band = (
        <>
          {field}
          {piping && <rect x={50 - 13 - 3.5} y={-80} width={26 + 7} height={280} fill={c} />}
          <rect x={50 - 13} y={-80} width={26} height={280} fill={b} />
        </>
      )
      return direction === 'horizontal' ? <g transform="rotate(90 50 56)">{band}</g> : tilt(35, band)
    }
    case 'sash':
      return (
        <>
          {field}
          <g transform={`rotate(${direction === 'falling' ? -40 : 40} 50 60)`}>
            {piping && <rect x={35} y={-80} width={30} height={280} fill={c} />}
            <rect x={38} y={-80} width={24} height={280} fill={b} />
          </g>
        </>
      )
    case 'lozenges':
      return (
        <>
          <defs>
            <pattern id={`${id}l`} width="17" height="26" patternUnits="userSpaceOnUse" patternTransform="translate(-0.5 -3)">
              <rect width="17" height="26" fill={b} />
              <path d="M8.5 0L17 13L8.5 26L0 13Z" fill={a} />
            </pattern>
          </defs>
          <rect x={-20} y={-20} width={140} height={160} fill={`url(#${id}l)`} />
        </>
      )
    case 'waves':
      return (
        <>
          {field}
          {Array.from({ length: count }, (_, i) => (
            <path key={i} d={`M-10 ${46 + i * 15}q7.5 -7 15 0t15 0t15 0t15 0t15 0t15 0t15 0t15 0`} fill="none" stroke={b} strokeWidth="6" strokeLinecap="round" />
          ))}
        </>
      )
    case 'flanks':
      return <>{field}<rect x={-20} y={-20} width={44} height={160} fill={b} /><rect x={76} y={-20} width={44} height={160} fill={b} /></>
    case 'chevron':
      return <>{field}<path d="M-12 104L50 50L112 104" fill="none" stroke={b} strokeWidth="22" /></>
  }
}

function Ball() {
  const corners = Array.from({ length: 5 }, (_, i) => {
    const t = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    return [Math.cos(t), Math.sin(t)] as const
  })
  return (
    <>
      <circle cx="50" cy="60" r="14" fill="#fff" stroke={NAVY} strokeWidth="2.2" />
      <path d={`M${corners.map(([x, y]) => `${50 + 5.2 * x} ${60 + 5.2 * y}`).join('L')}Z`} fill={NAVY} />
      {corners.map(([x, y], i) => (
        <path key={i} d={`M${50 + 5.2 * x} ${60 + 5.2 * y}L${50 + 13 * x} ${60 + 13 * y}`} stroke={NAVY} strokeWidth="1.6" />
      ))}
    </>
  )
}

const STAR = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z'

/** A club's rarity as filled stars only – never empty ones, so it does not read like a mark for the child. */
export function TierStars({ tier, className = '' }: { tier: number; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-[0.12em] ${className}`} aria-hidden>
      {Array.from({ length: tier }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" className="size-[1em]" fill={NAVY}>
          <path d={STAR} />
        </svg>
      ))}
    </span>
  )
}
