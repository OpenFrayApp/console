// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Ability } from '../../schema/primitives.ts'
import {
  advantageAgainst,
  condition,
  disadvantageOn,
  flatBonus,
  modifierEffect,
  reminder,
} from '../effects.ts'
import {
  CONSUME,
  MANUAL,
  is2024,
  saveOrTimed,
  timedDuration,
  type SpellEffectTable,
} from './shared.ts'

/**
 * Spells whose consequence lands on an enemy. A condition carries no note — the
 * condition name is the badge and hovers to its rules text; a second reminder is
 * added only for a number the GM has to keep applying (ongoing damage, an escalating
 * save, a damage-on-refusal clause).
 *
 * `saveOrTimed` is used only where the spell really lets the target repeat the save;
 * everything else keeps the spell's own duration even when applied from the resolver.
 */

/** Disadvantage on the target's own rolls of one kind (Enthrall, Bestow Curse). */
const disadvOn = (
  name: string,
  applies: 'savingThrows' | 'abilityChecks' | 'attackRolls' | 'all',
  opts: {
    source?: string
    duration?: ReturnType<typeof timedDuration>
    note?: string
    abilities?: Ability[]
  },
) =>
  modifierEffect(
    { name, mode: 'disadvantage', direction: 'outgoing', applies, abilities: opts.abilities },
    opts,
  )

export const DEBUFF_SPELLS: SpellEffectTable = {
  // — Abjuration —
  banishment: {
    summary: 'Banished to a harmless demiplane, Incapacitated',
    targeting: 'enemy',
    build: ({ source, spell }) => [
      condition('Incapacitated', { source, duration: timedDuration(spell) }),
    ],
  },
  'resilient sphere': {
    summary: 'Enclosed in an impassable sphere of force',
    targeting: 'enemy',
    build: ({ source, spell }) => [
      reminder('Resilient Sphere', 'Sealed in a force sphere', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  'planar binding': {
    summary: 'Bound to serve the caster',
    targeting: 'enemy',
    build: ({ source }) => [
      reminder('Planar Binding', 'Bound to service', { source, duration: MANUAL }),
    ],
  },
  imprisonment: {
    summary: 'Held by a magical restraint',
    targeting: 'enemy',
    build: ({ source }) => [reminder('Imprisonment', 'Imprisoned', { source, duration: MANUAL })],
  },

  // — Conjuration —
  'ensnaring strike': {
    summary: 'Restrained by vines, taking 1d6 piercing each turn',
    targeting: 'enemy',
    build: ({ source, spell }) => [
      condition('Restrained', { source, duration: timedDuration(spell) }),
      reminder('Ensnaring Strike', '1d6 piercing/turn', { source, duration: timedDuration(spell) }),
    ],
  },
  entangle: {
    summary: 'Restrained by grasping plants',
    targeting: 'enemy',
    multi: true,
    build: ({ source, spell }) => [
      condition('Restrained', { source, duration: timedDuration(spell) }),
    ],
  },
  grease: {
    summary: 'Knocked prone by the grease',
    targeting: 'enemy',
    multi: true,
    build: ({ source }) => [condition('Prone', { source, duration: MANUAL })],
  },
  web: {
    summary: 'Restrained by the webs',
    targeting: 'enemy',
    multi: true,
    build: ({ source, spell }) => [
      condition('Restrained', { source, duration: timedDuration(spell) }),
    ],
  },
  'sleet storm': {
    summary: 'Knocked prone on the icy ground',
    targeting: 'enemy',
    multi: true,
    build: ({ source }) => [condition('Prone', { source, duration: MANUAL })],
  },
  'stinking cloud': {
    summary: 'Retching in the cloud',
    targeting: 'enemy',
    multi: true,
    build: ({ source, spell }) =>
      is2024(spell)
        ? [condition('Poisoned', { source, duration: timedDuration(spell) })]
        : [reminder('Stinking Cloud', 'Retching: loses its action', { source, duration: MANUAL })],
  },
  'black tentacles': {
    summary: 'Restrained by the tentacles',
    targeting: 'enemy',
    multi: true,
    build: ({ source, spell }) => [
      condition('Restrained', { source, duration: timedDuration(spell) }),
    ],
  },
  'conjure elemental': {
    summary: 'Restrained by the elemental spirit',
    targeting: 'enemy',
    build: (ctx) => [condition('Restrained', { source: ctx.source, duration: saveOrTimed(ctx) })],
  },
  'conjure fey': {
    summary: 'Frightened of the fey spirit',
    targeting: 'enemy',
    build: ({ source, spell }) => [
      condition('Frightened', { source, duration: timedDuration(spell) }),
    ],
  },
  maze: {
    summary: 'Banished into a labyrinthine demiplane',
    targeting: 'enemy',
    build: ({ source, spell }) => [
      reminder('Maze', 'Banished to a maze', { source, duration: timedDuration(spell) }),
    ],
  },
  'storm of vengeance': {
    summary: 'Deafened by the thunderclap',
    targeting: 'enemy',
    multi: true,
    build: ({ source, spell }) => [
      condition('Deafened', { source, duration: timedDuration(spell) }),
    ],
  },

  // — Divination —
  'mind spike': {
    summary: 'The caster always knows where it is',
    targeting: 'enemy',
    build: ({ source, spell }) => [
      reminder('Mind Spike', 'Location known to caster', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  scrying: {
    summary: 'Watched and heard remotely',
    targeting: 'enemy',
    build: ({ source, spell }) => [
      reminder('Scrying', 'Being scried', { source, duration: timedDuration(spell) }),
    ],
  },
  'contact other plane': {
    summary: 'Mind reeling from the contact',
    targeting: 'self',
    build: ({ source }) => [condition('Incapacitated', { source, duration: MANUAL })],
  },

  // — Enchantment —
  'vicious mockery': {
    summary: 'Disadvantage on its next attack roll',
    targeting: 'enemy',
    // The disadvantage clears on the target's next attack (consumeOnRoll default).
    build: ({ source }) => [
      disadvantageOn('Vicious Mockery', { source, note: 'Disadv. next attack' }),
    ],
  },
  'animal friendship': {
    summary: 'Charmed by the caster',
    targeting: 'enemy',
    build: ({ source }) => [condition('Charmed', { source, duration: MANUAL })],
  },
  bane: {
    summary: '−1d4 to attack rolls and saving throws',
    targeting: 'enemy',
    multi: true,
    // Attack rolls and saving throws, per the text — never ability checks, which one
    // 'all' modifier would also have reached.
    build: ({ source, spell }) => [
      flatBonus('Bane', '-1d4', {
        source,
        applies: 'attackRolls',
        duration: timedDuration(spell),
        note: '−1d4 attacks',
      }),
      flatBonus('Bane', '-1d4', {
        source,
        applies: 'savingThrows',
        duration: timedDuration(spell),
        note: '−1d4 saves',
      }),
    ],
  },
  'charm person': {
    summary: 'Charmed by the caster',
    targeting: 'enemy',
    build: ({ source }) => [condition('Charmed', { source, duration: MANUAL })],
  },
  command: {
    summary: 'Must obey a one-word command on its next turn',
    targeting: 'enemy',
    build: ({ source }) => [
      reminder('Command', 'Obeys the command', { source, duration: { type: 'rounds', rounds: 1 } }),
    ],
  },
  'hideous laughter': {
    summary: 'Prone and Incapacitated with laughter',
    targeting: 'enemy',
    build: ({ source, spell }) => [
      condition('Incapacitated', { source, duration: timedDuration(spell) }),
      condition('Prone', { source, duration: timedDuration(spell) }),
    ],
  },
  sleep: {
    // 2024 is Incapacitated with a repeated save; 2014 drops the target Unconscious.
    summary: 'Falls asleep',
    targeting: 'enemy',
    multi: true,
    build: (ctx) =>
      is2024(ctx.spell)
        ? [
            condition('Incapacitated', { source: ctx.source, duration: saveOrTimed(ctx) }),
            reminder('Sleep', 'Wakes if damaged', {
              source: ctx.source,
              duration: timedDuration(ctx.spell),
            }),
          ]
        : [condition('Unconscious', { source: ctx.source, duration: timedDuration(ctx.spell) })],
  },
  'animal messenger': {
    summary: 'Charmed into carrying a message',
    targeting: 'enemy',
    build: ({ source }) => [condition('Charmed', { source, duration: MANUAL })],
  },
  'calm emotions': {
    summary: 'Charmed and Frightened end; hostility suppressed',
    targeting: 'enemy',
    multi: true,
    build: ({ source, spell }) => [
      reminder('Calm Emotions', 'Calm: charm/fear ended', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  enthrall: {
    // 2024 is a flat −10 to Wisdom (Perception) checks; 2014 is disadvantage instead.
    summary: 'Its Perception checks suffer while the words distract it',
    targeting: 'enemy',
    multi: true,
    build: ({ source, spell }) =>
      is2024(spell)
        ? [
            modifierEffect(
              {
                name: 'Enthrall',
                mode: 'flatBonus',
                direction: 'outgoing',
                applies: 'abilityChecks',
                value: -10,
                abilities: ['wis'],
              },
              { source, duration: timedDuration(spell), note: '−10 Perception' },
            ),
          ]
        : [
            disadvOn('Enthrall', 'abilityChecks', {
              source,
              duration: timedDuration(spell),
              note: 'Disadv. on Perception',
              abilities: ['wis'],
            }),
          ],
  },
  'hold person': {
    summary: 'Paralyzed until it saves',
    targeting: 'enemy',
    build: (ctx) => [condition('Paralyzed', { source: ctx.source, duration: saveOrTimed(ctx) })],
  },
  suggestion: {
    summary: 'Charmed into following the suggested course',
    targeting: 'enemy',
    build: ({ source, spell }) => [
      condition('Charmed', { source, duration: timedDuration(spell) }),
    ],
  },
  'zone of truth': {
    summary: 'Cannot speak a deliberate lie in the zone',
    targeting: 'enemy',
    multi: true,
    build: ({ source }) => [
      reminder('Zone of Truth', "Can't speak a lie", { source, duration: MANUAL }),
    ],
  },
  'charm monster': {
    summary: 'Charmed by the caster',
    targeting: 'enemy',
    build: ({ source }) => [condition('Charmed', { source, duration: MANUAL })],
  },
  compulsion: {
    summary: 'Charmed; the caster chooses where it moves',
    targeting: 'enemy',
    multi: true,
    build: (ctx) => [
      condition('Charmed', { source: ctx.source, duration: saveOrTimed(ctx) }),
      reminder('Compulsion', 'Moved by the caster', {
        source: ctx.source,
        duration: timedDuration(ctx.spell),
      }),
    ],
  },
  confusion: {
    summary: 'Acts randomly; no Bonus Actions or Reactions',
    targeting: 'enemy',
    multi: true,
    build: (ctx) => [
      reminder('Confusion', 'Confused: rolls 1d10', {
        source: ctx.source,
        duration: saveOrTimed(ctx),
      }),
    ],
  },
  'dominate beast': {
    summary: 'Charmed and commanded by the caster',
    targeting: 'enemy',
    build: (ctx) => [
      condition('Charmed', { source: ctx.source, duration: saveOrTimed(ctx) }),
      reminder('Dominate Beast', 'Caster commands it', {
        source: ctx.source,
        duration: timedDuration(ctx.spell),
      }),
    ],
  },
  'dominate person': {
    summary: 'Charmed and commanded by the caster',
    targeting: 'enemy',
    build: (ctx) => [
      condition('Charmed', { source: ctx.source, duration: saveOrTimed(ctx) }),
      reminder('Dominate Person', 'Caster commands it', {
        source: ctx.source,
        duration: timedDuration(ctx.spell),
      }),
    ],
  },
  geas: {
    summary: 'Charmed; takes 5d10 psychic when it defies the command',
    targeting: 'enemy',
    build: ({ source }) => [
      condition('Charmed', { source, duration: MANUAL }),
      reminder('Geas', '5d10 psychic on refusal', { source, duration: MANUAL }),
    ],
  },
  'hold monster': {
    summary: 'Paralyzed until it saves',
    targeting: 'enemy',
    build: (ctx) => [condition('Paralyzed', { source: ctx.source, duration: saveOrTimed(ctx) })],
  },
  'modify memory': {
    summary: 'Charmed and Incapacitated while its memory is reshaped',
    targeting: 'enemy',
    build: ({ source, spell }) => [
      condition('Charmed', { source, duration: timedDuration(spell) }),
      condition('Incapacitated', { source, duration: timedDuration(spell) }),
    ],
  },
  'irresistible dance': {
    // 2024 adds the Charmed condition; 2014 dances without it. Both impose
    // disadvantage on the dancer's attacks and Dex saves and give its attackers
    // advantage. The escape save rides the first part and clears the bundle.
    summary: 'Dancing: disadvantage on attacks and Dex saves; attackers have advantage',
    targeting: 'enemy',
    build: (ctx) => {
      const rest = [
        disadvOn('Irresistible Dance', 'attackRolls', {
          source: ctx.source,
          duration: timedDuration(ctx.spell),
          note: 'Dancing: disadv. attacks',
        }),
        disadvOn('Irresistible Dance', 'savingThrows', {
          source: ctx.source,
          duration: timedDuration(ctx.spell),
          note: 'Disadv. on Dex saves',
          abilities: ['dex'],
        }),
        advantageAgainst('Irresistible Dance', {
          source: ctx.source,
          duration: timedDuration(ctx.spell),
          note: 'Attackers: advantage',
        }),
      ]
      if (!is2024(ctx.spell)) {
        rest[0] = disadvOn('Irresistible Dance', 'attackRolls', {
          source: ctx.source,
          duration: saveOrTimed(ctx),
          note: 'Dancing: disadv. attacks',
        })
        return rest
      }
      return [condition('Charmed', { source: ctx.source, duration: saveOrTimed(ctx) }), ...rest]
    },
  },
  'mass suggestion': {
    summary: 'Charmed into following the suggested course',
    targeting: 'enemy',
    multi: true,
    build: ({ source }) => [condition('Charmed', { source, duration: MANUAL })],
  },
  'antipathy/sympathy': {
    summary: 'Frightened of the target and compelled to flee it',
    targeting: 'enemy',
    build: ({ source }) => [condition('Frightened', { source, duration: MANUAL })],
  },
  befuddlement: {
    summary: 'Intelligence and Charisma drop to 1; cannot cast or speak',
    targeting: 'enemy',
    build: ({ source }) => [
      reminder('Befuddlement', 'Int & Cha 1; no spells', { source, duration: MANUAL }),
    ],
  },
  feeblemind: {
    summary: 'Intelligence and Charisma drop to 1; cannot cast or speak',
    targeting: 'enemy',
    build: ({ source }) => [
      reminder('Feeblemind', 'Int & Cha 1; no spells', { source, duration: MANUAL }),
    ],
  },
  'dominate monster': {
    summary: 'Charmed and commanded by the caster',
    targeting: 'enemy',
    build: (ctx) => [
      condition('Charmed', { source: ctx.source, duration: saveOrTimed(ctx) }),
      reminder('Dominate Monster', 'Caster commands it', {
        source: ctx.source,
        duration: timedDuration(ctx.spell),
      }),
    ],
  },
  'power word stun': {
    summary: 'Stunned until it saves',
    targeting: 'enemy',
    build: (ctx) => [condition('Stunned', { source: ctx.source, duration: saveOrTimed(ctx) })],
  },

  // — Evocation —
  'faerie fire': {
    summary: 'Outlined in light; attacks against it have advantage',
    targeting: 'enemy',
    multi: true,
    build: ({ source, spell }) => [
      advantageAgainst('Faerie Fire', {
        source,
        duration: timedDuration(spell),
        note: 'Attackers: advantage',
      }),
    ],
  },
  'guiding bolt': {
    summary: 'The next attack against it has advantage',
    targeting: 'enemy',
    build: ({ source }) => [
      advantageAgainst('Guiding Bolt', {
        source,
        duration: CONSUME,
        note: 'Next attack: advantage',
      }),
    ],
  },
  sunbeam: {
    summary: 'Blinded by the beam',
    targeting: 'enemy',
    multi: true,
    build: ({ source }) => [
      condition('Blinded', { source, duration: { type: 'untilSourceTurn' } }),
    ],
  },
  forcecage: {
    summary: 'Trapped in an inescapable cage of force',
    targeting: 'enemy',
    build: ({ source, spell }) => [
      reminder('Forcecage', 'Caged in force', { source, duration: timedDuration(spell) }),
    ],
  },

  // — Illusion —
  'color spray': {
    summary: 'Blinded by the flash of colour',
    targeting: 'enemy',
    multi: true,
    build: ({ source }) => [
      condition('Blinded', { source, duration: { type: 'untilSourceTurn' } }),
    ],
  },
  'phantasmal force': {
    summary: 'Believes the illusion is real',
    targeting: 'enemy',
    build: ({ source, spell }) => [
      reminder('Phantasmal Force', 'Believes the illusion', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  fear: {
    summary: 'Frightened, and drops what it is holding',
    targeting: 'enemy',
    multi: true,
    build: ({ source, spell }) => [
      condition('Frightened', { source, duration: timedDuration(spell) }),
    ],
  },
  'hypnotic pattern': {
    summary: 'Charmed and Incapacitated by the pattern',
    targeting: 'enemy',
    multi: true,
    build: ({ source, spell }) => [
      condition('Charmed', { source, duration: timedDuration(spell) }),
      condition('Incapacitated', { source, duration: timedDuration(spell) }),
    ],
  },
  'phantasmal killer': {
    // 2024 imposes disadvantage on ability checks and attack rolls — saves are
    // untouched; 2014 frightens instead.
    summary: 'Tormented by an illusion of its deepest fear',
    targeting: 'enemy',
    build: (ctx) =>
      is2024(ctx.spell)
        ? [
            disadvOn('Phantasmal Killer', 'abilityChecks', {
              source: ctx.source,
              duration: saveOrTimed(ctx),
              note: 'Disadv. on checks',
            }),
            disadvOn('Phantasmal Killer', 'attackRolls', {
              source: ctx.source,
              duration: timedDuration(ctx.spell),
              note: 'Disadv. on attacks',
            }),
          ]
        : [condition('Frightened', { source: ctx.source, duration: timedDuration(ctx.spell) })],
  },
  weird: {
    summary: 'Frightened by its own nightmare',
    targeting: 'enemy',
    multi: true,
    build: ({ source, spell }) => [
      condition('Frightened', { source, duration: timedDuration(spell) }),
    ],
  },

  // — Necromancy —
  'ray of enfeeblement': {
    // 2024 enfeebles Strength-based D20 Tests and every damage roll; 2014 only
    // halves Strength-weapon damage, which no roll category expresses.
    summary: 'Weakened: disadvantage and less damage',
    targeting: 'enemy',
    build: (ctx) =>
      is2024(ctx.spell)
        ? [
            disadvOn('Ray of Enfeeblement', 'abilityChecks', {
              source: ctx.source,
              duration: saveOrTimed(ctx),
              note: 'Disadv. Str checks',
              abilities: ['str'],
            }),
            disadvOn('Ray of Enfeeblement', 'savingThrows', {
              source: ctx.source,
              duration: timedDuration(ctx.spell),
              note: 'Disadv. Str saves',
              abilities: ['str'],
            }),
            reminder('Ray of Enfeeblement', '−1d8 dmg; Str atk disadv', {
              source: ctx.source,
              duration: timedDuration(ctx.spell),
            }),
          ]
        : [
            reminder('Ray of Enfeeblement', 'Half damage with Str', {
              source: ctx.source,
              duration: saveOrTimed(ctx),
            }),
          ],
  },
  'bestow curse': {
    summary: 'Cursed: disadvantage on the chosen ability',
    targeting: 'enemy',
    build: ({ source, spell }) => [
      disadvOn('Bestow Curse', 'all', {
        source,
        duration: timedDuration(spell),
        note: 'Disadv. chosen ability',
      }),
    ],
  },
  contagion: {
    summary: 'Poisoned, with disadvantage on the chosen saves',
    targeting: 'enemy',
    build: (ctx) => [
      condition('Poisoned', { source: ctx.source, duration: saveOrTimed(ctx) }),
      reminder('Contagion', 'Disadv: chosen saves', { source: ctx.source, duration: MANUAL }),
    ],
  },
  eyebite: {
    summary: 'Asleep, Panicked or Sickened — the caster’s choice',
    targeting: 'enemy',
    build: ({ source, spell }) => [
      condition('Frightened', { source, duration: timedDuration(spell) }),
    ],
  },

  // — Transmutation —
  latchwork: {
    summary: 'Disadvantage on its next attack roll',
    targeting: 'enemy',
    build: ({ source }) => [
      disadvantageOn('Latchwork', {
        source,
        duration: CONSUME,
        note: 'Disadv. on its next attack',
      }),
    ],
  },
  'blindness/deafness': {
    summary: 'Blinded or Deafened — the caster’s choice',
    targeting: 'enemy',
    build: (ctx) => [condition('Blinded', { source: ctx.source, duration: saveOrTimed(ctx) })],
  },
  'enlarge/reduce': {
    summary: 'Enlarged or reduced, changing its damage and Strength checks',
    targeting: 'enemy',
    build: ({ source, spell }) => [
      reminder('Enlarge/Reduce', 'Size changed: ±1d4 dmg', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  'heat metal': {
    summary: 'Must drop the object or attack at disadvantage',
    targeting: 'enemy',
    build: ({ source, spell }) => [
      reminder('Heat Metal', 'Drops it or disadvantage', {
        source,
        duration: timedDuration(spell),
      }),
    ],
  },
  levitate: {
    summary: 'Suspended in the air, able to move only by pushing off',
    targeting: 'enemy',
    build: ({ source, spell }) => [
      reminder('Levitate', 'Levitating (20 ft up)', { source, duration: timedDuration(spell) }),
    ],
  },
  slow: {
    summary: 'Half Speed, −2 AC and Dex saves, one action per turn',
    targeting: 'enemy',
    multi: true,
    // The escape save rides the AC part alone; shaking it off clears the whole
    // bundle, so the Speed and Dex-save parts carry the plain timer.
    build: (ctx) => [
      flatBonus('Slow', -2, {
        source: ctx.source,
        applies: 'ac',
        duration: saveOrTimed(ctx),
        note: '−2 AC',
      }),
      modifierEffect(
        {
          name: 'Slow',
          mode: 'flatBonus',
          direction: 'outgoing',
          applies: 'savingThrows',
          value: -2,
          abilities: ['dex'],
        },
        { source: ctx.source, duration: timedDuration(ctx.spell), note: '−2 Dex saves' },
      ),
      modifierEffect(
        { name: 'Slow', mode: 'flatBonus', direction: 'outgoing', applies: 'speed', value: 'half' },
        { source: ctx.source, duration: timedDuration(ctx.spell), note: 'Speed halved' },
      ),
      reminder('Slow', 'No Reactions; 1 action', {
        source: ctx.source,
        duration: timedDuration(ctx.spell),
      }),
    ],
  },
  polymorph: {
    summary: 'Transformed into a Beast with its own HP',
    targeting: 'enemy',
    build: ({ source, spell }) => [
      reminder('Polymorph', 'Beast form (beast HP)', { source, duration: timedDuration(spell) }),
    ],
  },
  telekinesis: {
    summary: 'Held and moved by the caster’s will',
    targeting: 'enemy',
    build: ({ source, spell }) => [
      condition('Restrained', { source, duration: timedDuration(spell) }),
    ],
  },
  'flesh to stone': {
    summary: 'Restrained as its flesh hardens; three failures petrify it',
    targeting: 'enemy',
    build: (ctx) => [
      condition('Restrained', { source: ctx.source, duration: saveOrTimed(ctx) }),
      reminder('Flesh to Stone', '3rd fail = Petrified', { source: ctx.source, duration: MANUAL }),
    ],
  },
  earthquake: {
    summary: 'Knocked prone by the tremor',
    targeting: 'enemy',
    multi: true,
    build: ({ source }) => [condition('Prone', { source, duration: MANUAL })],
  },
  'true polymorph': {
    summary: 'Transformed into another creature or object',
    targeting: 'enemy',
    build: ({ source, spell }) => [
      reminder('True Polymorph', 'Transformed', { source, duration: timedDuration(spell) }),
    ],
  },
}
