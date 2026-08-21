// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { abilityMod, type Speeds } from '../../schema/primitives.ts'
import { speedLines } from '../../combat/speed.ts'
import type { Action } from '../../schema/action.ts'
import type { Creature, SpellRef } from '../../schema/creature.ts'
import type { Concentration, HitPoints } from '../../schema/combatant.ts'
import { hpTierOf } from '../../combat/resources.ts'
import { isAutoLabel } from '../../combat/combatant.ts'
import { useCampaignRules } from '../../state/campaignRules.ts'
import {
  crDetail,
  formatCr,
  formatSenses,
  legendaryPreamble,
  signed,
  titleCase,
} from '../../compendium/format.ts'
import { hpToneFor } from '../ui/hpTone.ts'
import { Markdown } from './Markdown.tsx'
import {
  AbilityTable,
  DefensesAndSenses,
  Section,
  SkillsTable,
  SECTION_HEADING,
  type OnCheck,
} from './parts.tsx'
import { ActionSection } from './ActionSection.tsx'
import { SpellcastingSection, type ResolveSpell, type SpellUsesOf } from './SpellcastingSection.tsx'
import { SourceLink } from './SourceLink.tsx'
import { ShareIcon } from '../icons/ShareIcon.tsx'
import { Button } from '../ui/primitives.tsx'
import { HeaderStat, StatHeader } from './StatHeader.tsx'

/** The ability block for a creature (always shows the Save column). */
function AbilityScores({ creature, onCheck }: { creature: Creature; onCheck?: OnCheck }) {
  return (
    <AbilityTable abilities={creature.abilities} saves={creature.saves ?? {}} onCheck={onCheck} />
  )
}

/** The full creature stat block; in combat the on* callbacks make HP, actions, and spells live. */
export function CreatureStatBlock({
  creature,
  hp,
  liveAc,
  liveSpeed,
  concentration,
  label,
  onRename,
  onHpInput,
  onTempInput,
  hpEditRequest,
  onAction,
  rechargeState,
  onRecharge,
  onCheck,
  onCastSpell,
  spellUsesOf,
  actionUsesOf,
  onUseAction,
  slotsLeftOf,
  resolveSpell,
  onReaction,
  onLegendaryAction,
  legendaryRemaining,
  legendaryResistanceLeft,
  inLair = false,
  onEdit,
  onDelete,
  onShare,
  strangers,
}: {
  creature: Creature
  /** Live hit points when shown in combat; absent in the reference compendium. */
  hp?: HitPoints
  /** Armor class with active effects folded in (combat); the stat block's otherwise. */
  liveAc?: number
  /** Speeds with active effects folded in (combat); the stat block's otherwise. */
  liveSpeed?: Speeds
  /** Live concentration, when in combat — drives the "C" badge. */
  concentration?: Concentration | null
  /** The combatant's display name (shown in the tracker); defaults to the creature name. */
  label?: string
  /** Rename the combatant's tracker label. */
  onRename?: (label: string) => void
  /** Edit current HP from a raw input ("12", "+5", "-3"). */
  onHpInput?: (raw: string) => void
  /** Bump to begin editing the hit points from the keyboard. */
  hpEditRequest?: number
  /** Edit temp HP from a raw input. */
  onTempInput?: (raw: string) => void
  /** Resolve an action (roll to-hit / save and apply damage). Combat only. */
  onAction?: (action: Action) => void
  /** id → charged? Spent recharge abilities render disabled with a recharge button. */
  rechargeState?: Record<string, boolean>
  /** Roll the recharge die for a spent ability. */
  onRecharge?: (action: Action) => void
  /** Roll an ability check / save / skill (d20 + modifier). Combat only. */
  onCheck?: OnCheck
  /** Cast a spell from the spellcasting block. Combat only. */
  onCastSpell?: (spell: SpellRef) => void
  /** Per-day uses left for an action ("N/Day"), or null if untracked. Combat only. */
  actionUsesOf?: (action: Action) => number | null
  /** Spend one per-day use of an action (and roll it if rollable). Combat only. */
  onUseAction?: (action: Action) => void
  /** Uses left for a spell on the live combatant (null = unlimited). Combat only. */
  spellUsesOf?: SpellUsesOf
  /** Spell slots left at a given level on the live combatant. Combat only. */
  slotsLeftOf?: (level: number) => number
  /** Resolve a spell's compendium entry for the hover preview / cast card. */
  resolveSpell?: ResolveSpell
  /** Use a reaction (spends the round's reaction, then resolves it if it's rollable). Combat only. */
  onReaction?: (action: Action) => void
  /** Use a legendary action (spends one, then resolves it if it's rollable). Combat only. */
  onLegendaryAction?: (action: Action) => void
  /** Legendary actions left this round, when in combat. */
  legendaryRemaining?: number
  /** Legendary Resistance uses left, shown as its own section header in combat
   *  (the Use button + In-lair toggle live in the controls). */
  legendaryResistanceLeft?: number
  /** Whether the creature is currently in its lair — swaps the lair XP/legendary budget. */
  inLair?: boolean
  /** Edit this creature (custom library only) — shown in the source row. */
  onEdit?: () => void
  /** Delete this creature from the library (custom only) — shown in the source row. */
  onDelete?: () => void
  /** Publish this creature to a link, from wherever the stat block has its own controls. */
  onShare?: () => void
  /** Rendered for somebody who doesn't own it: a shared link rather than their library. */
  strangers?: boolean
}) {
  const displayName = label ?? creature.name
  // A milestone campaign hides XP in the combat view (and the recap). The compendium
  // is a reference — it always shows everything, whatever the campaign uses.
  const inCombat = hp != null
  const milestone = useCampaignRules().leveling === 'milestone'
  const showXp = !inCombat || !milestone
  // Legendary Resistance gets its own section (counter header + trait text); pull its
  // trait out of the plain Traits list so it isn't shown twice.
  const lrTrait = creature.traits?.find((t) => /^Legendary Resistance/i.test(t.name))
  const showLrSection = legendaryResistanceLeft != null && lrTrait != null
  const traits = showLrSection ? creature.traits?.filter((t) => t !== lrTrait) : creature.traits
  const la = creature.legendaryActions
  const perRound = la && inLair && la.perRoundLair != null ? la.perRoundLair : la?.perRound
  const lairNote = la?.perRoundLair != null && !inLair ? `, or ${la.perRoundLair} in lair` : ''
  const legendaryTitle = !la
    ? 'Legendary Actions'
    : legendaryRemaining != null
      ? `Legendary Actions (${legendaryRemaining} of ${perRound} left)`
      : `Legendary Actions (${perRound}/round${lairNote})`

  const current = hp ? hp.current : creature.maxHp
  const max = hp ? hp.max : creature.maxHp
  const hpTone = hp ? hpToneFor(hpTierOf(hp.current, hp.max)) : 'text-slate-900 dark:text-slate-100'
  const hpValue = (
    <span>
      <span className={hpTone}>{current}</span>
      <span className="text-slate-400 dark:text-slate-500">/{max}</span>
    </span>
  )
  const tmpValue =
    hp && hp.temp > 0 ? (
      <span className="text-sky-600 dark:text-sky-400">{hp.temp}</span>
    ) : (
      <span className="text-slate-400 dark:text-slate-500">—</span>
    )
  const speeds = speedLines(liveSpeed ?? creature.speed)

  return (
    <div className="@container flex flex-1 flex-col space-y-4">
      <StatHeader
        name={displayName}
        onRename={onRename}
        originalName={label && !isAutoLabel(label, creature.name) ? creature.name : undefined}
        subtitle={
          <>
            {[creature.size, titleCase(creature.type)].filter(Boolean).join(' ')}
            {creature.alignment ? `, ${titleCase(creature.alignment)}` : ''} · CR{' '}
            {formatCr(creature.cr)}
            {crDetail(creature, { inLair, combat: inCombat, showXp })}
          </>
        }
        legendary={creature.legendaryActions != null}
        concentration={concentration}
        speeds={speeds}
        stats={
          <>
            <HeaderStat label="AC" value={liveAc ?? creature.ac} />
            <HeaderStat
              label={creature.hpFormula ? `HP (${creature.hpFormula})` : 'HP'}
              value={hpValue}
              edit={
                onHpInput
                  ? {
                      initial: '',
                      onCommit: onHpInput,
                      title: 'Set hit points, or type +5 or -8',
                      editRequest: hpEditRequest,
                    }
                  : undefined
              }
            />
            <HeaderStat
              label="TMP"
              value={tmpValue}
              edit={
                onTempInput
                  ? {
                      initial: '',
                      onCommit: onTempInput,
                      title: 'Set temporary hit points, or type +5 or -8',
                    }
                  : undefined
              }
            />
            <HeaderStat
              label="Init"
              value={signed(creature.initiative ?? abilityMod(creature.abilities.dex))}
            />
          </>
        }
      />

      <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
        <div className="min-w-[20rem] flex-1">
          <AbilityScores creature={creature} onCheck={onCheck} />
        </div>
        {creature.skills && (
          <div className="min-w-[12rem] flex-1">
            <SkillsTable skills={creature.skills} onCheck={onCheck} />
          </div>
        )}
      </div>

      <DefensesAndSenses
        resistances={creature.resistances?.join(', ')}
        immunities={[...(creature.immunities ?? []), ...(creature.conditionImmunities ?? [])].join(
          ', ',
        )}
        vulnerabilities={creature.vulnerabilities?.join(', ')}
        senses={formatSenses(creature.senses)}
        languages={creature.languages?.join(', ')}
        gear={creature.gear?.join(', ')}
      />

      {showLrSection && lrTrait && (
        <div>
          <h4 className={SECTION_HEADING}>Legendary Resistance ({legendaryResistanceLeft} left)</h4>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {lrTrait.text}
          </p>
        </div>
      )}
      <Section title="Traits" items={traits} resolveSpell={resolveSpell} />
      {creature.spellcasting && (
        <SpellcastingSection
          spellcasting={creature.spellcasting}
          onCast={onCastSpell}
          usesOf={spellUsesOf}
          slotsLeftOf={slotsLeftOf}
          resolveSpell={resolveSpell}
        />
      )}
      <ActionSection
        title="Actions"
        actions={creature.actions}
        onAction={onAction}
        rechargeState={rechargeState}
        onRecharge={onRecharge}
        resolveSpell={resolveSpell}
        actionUsesOf={actionUsesOf}
        onUseAction={onUseAction}
      />
      <ActionSection
        title="Bonus Actions"
        actions={creature.bonusActions}
        onAction={onAction}
        rechargeState={rechargeState}
        onRecharge={onRecharge}
        resolveSpell={resolveSpell}
        actionUsesOf={actionUsesOf}
        onUseAction={onUseAction}
      />
      <ActionSection
        title="Reactions"
        actions={creature.reactions}
        onAction={onReaction ?? onAction}
        clickAll={onReaction != null}
        useHint="Use this reaction (spends this round's reaction)"
        rechargeState={rechargeState}
        onRecharge={onRecharge}
        resolveSpell={resolveSpell}
        actionUsesOf={actionUsesOf}
        onUseAction={onReaction ?? onUseAction}
      />
      <ActionSection
        title={legendaryTitle}
        note={la ? legendaryPreamble(creature.edition) : undefined}
        actions={creature.legendaryActions?.actions}
        onAction={onLegendaryAction ?? onAction}
        clickAll={onLegendaryAction != null}
        legendaryRemaining={legendaryRemaining}
        rechargeState={rechargeState}
        onRecharge={onRecharge}
        resolveSpell={resolveSpell}
      />
      <ActionSection
        title="Lair Actions"
        actions={creature.lairActions}
        onAction={onAction}
        rechargeState={rechargeState}
        onRecharge={onRecharge}
        resolveSpell={resolveSpell}
      />

      {/* Open by default: a creature's own words often answer what the table asks mid-fight
          — how a person-sized husk opens as something Huge — and collapsed at the foot of a
          long stat block, nobody finds them. Still a details, so it can be folded away. */}
      {creature.description && (
        <details open>
          <summary className="mb-2 cursor-pointer select-none border-b border-slate-200 pb-1 text-base font-semibold tracking-wide text-slate-600 dark:border-slate-800 dark:text-slate-300">
            Description
          </summary>
          <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <Markdown resolveSpell={resolveSpell}>{creature.description}</Markdown>
          </div>
        </details>
      )}

      <SourceLink
        source={creature.source}
        page={creature.sourcePage}
        derivedFrom={creature.derivedFrom}
        license={creature.license}
        strangers={strangers}
        actions={
          onEdit || onDelete || onShare ? (
            <span className="flex shrink-0 gap-2">
              {onShare && (
                <button
                  type="button"
                  onClick={onShare}
                  aria-label="Share this creature"
                  title="Share this creature"
                  className="tap-area flex items-center justify-center rounded border border-slate-300 px-2 py-1 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ShareIcon className="h-3.5 w-3.5" />
                </button>
              )}
              {onEdit && (
                <Button size="sm" onClick={onEdit}>
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button size="sm" variant="danger" onClick={onDelete}>
                  Delete
                </Button>
              )}
            </span>
          ) : undefined
        }
      />
    </div>
  )
}
