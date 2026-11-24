import type { CSSProperties } from 'react'
import { focusClass } from '../../components/styles'
import { usePlayerPhoto, type Child } from '../children/queries'
import { cardTile, heroStyle, playerScheme, playerTheme } from '../children/schemes'
import { cardOf, useCardStats, type CardData, type CardStat } from './card'
import { positionLabel } from './positions'
import { HeroPattern, PlayerCrest, TierStars } from './PlayerCrest'

/**
 * The player card as a collector's sticker (iteration 1, ADR-032): white die-cut edge, the
 * player's scheme and crest with the shirt number, the stylised photo standing on the bottom
 * edge (or the initial), name, position and grade. Always 5:7; type and spacing scale with the
 * card's own width (`cqw`). It carries its own scheme, so cards in different colours sit side by
 * side. Like a printed card it is always whole: the stats are part of it, never left out.
 */
export function CardFace({
  team,
  card,
  photo,
  className = 'w-44',
  label,
  onEdit,
  stats,
}: {
  team: string
  card: CardData
  /** URL of the stylised photo; without one the initial stands in. */
  photo?: string
  /** Sets the width (default: gallery size); the height follows from the format. */
  className?: string
  label?: string
  /** Makes the whole card a button that opens its edit modal. */
  onEdit?: () => void
  stats: readonly CardStat[]
}) {
  const initial = card.name.trim().slice(0, 1).toUpperCase() || '?'
  const number = card.shirtNumber ?? ''
  const scheme = playerScheme(card.color)
  const pictureClass = 'relative block min-h-0 w-full flex-1 overflow-hidden rounded-[2cqw] text-left'
  const picture = (
    <>
      <HeroPattern scheme={scheme} />
      <span className="absolute top-[-1cqw] right-[2cqw] font-display text-[34cqw] leading-none font-extrabold opacity-15" aria-hidden>
        {number}
      </span>
      <span className="absolute top-[3cqw] left-[3cqw] z-10 flex flex-col gap-[0.5cqw]" aria-hidden>
        <span className="font-display text-[10.5cqw] leading-none font-extrabold">{number}</span>
        <span className="max-w-[60cqw] truncate font-display text-[3.6cqw] font-bold tracking-[0.15em] uppercase opacity-85">Team {team}</span>
      </span>
      {/* depth of field: the kit behind the player blurs towards the edges */}
      <span className="film-focus pointer-events-none absolute inset-0" aria-hidden />
      {photo ? (
        // not draggable and not a pointer target: a swipe moves the card, a tap reaches the card button
        <img
          src={photo}
          alt=""
          draggable={false}
          className="pointer-events-none absolute bottom-0 left-1/2 h-[92%] max-w-none -translate-x-1/2 select-none filter-[drop-shadow(0_0_0.6cqw_#fff)_drop-shadow(0_0_0.6cqw_#fff)] [-webkit-user-drag:none]"
        />
      ) : (
        <span className="absolute inset-0 grid place-items-center font-display text-[40cqw] font-extrabold opacity-80" aria-hidden>
          {initial}
        </span>
      )}
      {/* analogue print over picture and player: warm light, vignette, film grain; the club pill and the pen stay clean */}
      <span className="film-light pointer-events-none absolute inset-0" aria-hidden />
      <span className="film-grain pointer-events-none absolute inset-0" aria-hidden />
      <span className="absolute bottom-[3cqw] left-[3cqw] z-10 flex items-center gap-[1.4cqw] rounded-full bg-white/90 px-[2.5cqw] py-[0.8cqw] text-[3cqw] text-slate-900" aria-hidden>
        <PlayerCrest schemeId={card.color} className="size-[8cqw]" />
        {scheme.label}
        <TierStars tier={scheme.tier} className="text-[3cqw]" />
      </span>
      {onEdit && (
        <span className="absolute right-[3cqw] bottom-[3cqw] z-10 grid size-[11cqw] place-items-center rounded-full bg-white text-[5.5cqw] text-slate-700 shadow" aria-hidden>
          ✎
        </span>
      )}
    </>
  )

  return (
    <article
      aria-label={label}
      // the sticker edge in the crest's rim colour (ADR-039); name, position and tiles take matching colours
      style={{ ...playerTheme(card.color), backgroundColor: scheme.trim } as CSSProperties}
      // a card of thick paper on the table, lit from the top left (card-paper in index.css)
      className={`card-paper @container group relative aspect-5/7 rounded-2xl ${className}`}
    >
      <div className="flex h-full flex-col gap-[2.2cqw] p-[2.5cqw]">
        <div data-testid="card-picture" className={`${pictureClass} ${onEdit ? 'group-hover:brightness-105' : ''}`} style={heroStyle(scheme)}>
          {picture}
        </div>
        <div className="flex items-baseline justify-between gap-[2cqw] px-[1cqw]">
          <h2 className="truncate font-display text-[11.5cqw] leading-[0.9] font-extrabold uppercase" style={{ color: scheme.cardText }}>{card.name.trim() || 'Name'}</h2>
          <p className="shrink-0 text-right font-display text-[4.2cqw] font-bold tracking-wide uppercase" style={{ color: scheme.cardAccent }}>
            {positionLabel(card.position)} · Klasse {card.grade ?? '–'}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-[1.4cqw]">
          {stats.map(([term, value]) => (
            <div key={term} className="min-w-0 rounded-[1.6cqw] px-[2.5cqw] py-[1.6cqw] text-slate-900" style={{ backgroundColor: cardTile(scheme) }}>
              <dt className="truncate text-[2.8cqw] tracking-wide text-slate-600 uppercase">{term}</dt>
              <dd className="truncate text-[4.6cqw] leading-tight font-bold">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      {/* the whole card is the button (laid over it, since a button may not hold the heading and the stats) */}
      {onEdit && (
        <button type="button" onClick={onEdit} aria-label="Karte bearbeiten" className={`absolute inset-0 z-20 cursor-pointer rounded-2xl ${focusClass}`} />
      )}
    </article>
  )
}

/** A player's whole card with their stored photo and stats (gallery, start page). */
export function PlayerSticker({ child, team, familyId, ...rest }: { child: Child; team: string; familyId: string } & Omit<Parameters<typeof CardFace>[0], 'card' | 'photo' | 'team' | 'stats'>) {
  const stats = useCardStats(familyId, child)
  return <CardFace team={team} card={cardOf(child)} photo={usePlayerPhoto(child.photo_path)} stats={stats} {...rest} />
}
