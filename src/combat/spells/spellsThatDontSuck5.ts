// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { sourceProfile, ruleReminder } from './reviewedProfile.ts'
import { condition, reminder } from '../effects.ts'

export const SPELLS_THAT_DONT_SUCK_5: Record<string, ReviewedSpellCasting> = {
  'somanyrobots-spells-that-dont-suck:phantasm': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Phantasm',
    {
      mechanics: { save: { ability: 'wis', onSave: 'negates' } },
      effect: ruleReminder(
        'Phantasm',
        'Chosen Blinded/Restrained/Frightened or later turn-start 2d10 psychic. End-turn Wisdom escape; no default condition.',
        { type: 'manual' },
        'enemy',
        false,
      ),
      manual:
        'Select visible target for Wisdom save. Choose Blinded, Restrained, Terrified, or Assailed manually on failure; no default condition. Assailed 2d10 psychic only at later turn starts. End-turn Wisdom success ends spell; clear selected effect and concentration.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:phantasmal-horror': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Phantasmal Horror',
    {
      effect: ruleReminder(
        'Phantasmal Horror',
        'Later target turn-start Wisdom failure 4d10 psychic/Frightened; success ends spell. No creation damage/save.',
        { type: 'manual' },
        'enemy',
        false,
      ),
      manual:
        'No initial save/damage or Frightened. Later target turn start Wisdom: failure 4d10 psychic and Frightened, success ends spell. Higher slots +1d10; later rolls/conditions manual.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:phantasmal-nightmares': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Phantasmal Nightmares',
    {
      mechanics: { save: { ability: 'wis', onSave: 'negates' } },
      effect: {
        summary:
          'Frightened; later turn-start 6d10 psychic plus d10 condition table. End-turn Wisdom escape, individual table timers manual.',
        targeting: 'enemy',
        multi: true,
        build: ({ source }) => [
          condition('Frightened', { source, duration: { type: 'rounds', rounds: 10 } }),
          reminder(
            'Phantasmal Nightmares',
            'Frightened; later turn-start 6d10 psychic plus d10 condition table. End-turn Wisdom escape, individual table timers manual.',
            { source, duration: { type: 'rounds', rounds: 10 } },
          ),
        ],
      },
      manual:
        'Select chosen creatures within 30 feet of visible point. Failure Frightened. Later turn starts 6d10 psychic plus randomized d10 effect with separate timers, not initial damage. End-turn Wisdom escape manual; unconscious table entry ends on damage/action wake.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:poison-fang': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Poison Fang',
    {
      mechanics: {
        save: { ability: 'con', onSave: 'negates' },
        damage: [{ formula: '1d12', type: 'poison' }],
        scaling: [
          { by: 'character', level: 5, damage: [{ formula: '2d12', type: 'poison' }] },
          { by: 'character', level: 11, damage: [{ formula: '3d12', type: 'poison' }] },
          { by: 'character', level: 17, damage: [{ formula: '4d12', type: 'poison' }] },
        ],
      },
      effect: {
        summary: 'Poisoned until start of affected creature next turn.',
        targeting: 'enemy',
        multi: false,
        build: ({ source, target }) => [
          condition('Poisoned', {
            source: target?.combatantId ?? source,
            duration: target
              ? { type: 'untilSourceTurn', when: 'startOfTurn' }
              : { type: 'manual' },
          }),
          reminder('Poison Fang', 'Poisoned until start of affected creature next turn.', {
            source: target?.combatantId ?? source,
            duration: target
              ? { type: 'untilSourceTurn', when: 'startOfTurn' }
              : { type: 'manual' },
          }),
        ],
      },
      manual:
        'Choose visible creature; failure Poisoned only until affected creature next turn start. Damage scales at caster levels 5/11/17; target-owned timer is independent of caster.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:power-word-nap': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Power Word Nap',
    {
      effect: {
        summary:
          'Unconscious for one-fifth short-rest length; damage/action wake ends. Full duration grants short rest, no reuse until long rest.',
        targeting: 'ally',
        multi: true,
        build: ({ source }) => [
          condition('Unconscious', { source, duration: { type: 'manual' } }),
          reminder(
            'Power Word Nap',
            'Unconscious for one-fifth short-rest length; damage/action wake ends. Full duration grants short rest, no reuse until long rest.',
            { source, duration: { type: 'manual' } },
          ),
        ],
      },
      manual:
        'Choose up to three willing prone visible creatures; initially Unconscious. Timer is one-fifth short-rest length, not fixed rounds. Damage/action wake ends for that target; full duration grants rest and until-long-rest reuse restriction manually. Higher slots add targets.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:prismatic-bolt': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Prismatic Bolt',
    {
      manual:
        'Manual ranged spell attack then d8 damage/type/rider table. Rolled d8 determines type and extra initial/later damage; choose determining d8 on crit/upcast. Existing resolver cannot choose type from rolled die safely; no generic damage placeholder. Higher slots add initial d8s.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:psychic-skewer': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Psychic Skewer',
    {
      mechanics: {
        save: { ability: 'int', onSave: 'half' },
        damage: [{ formula: '3d8', type: 'psychic' }],
        scaling: [
          { by: 'slot', level: 3, damage: [{ formula: '4d8', type: 'psychic' }] },
          { by: 'slot', level: 4, damage: [{ formula: '5d8', type: 'psychic' }] },
          { by: 'slot', level: 5, damage: [{ formula: '6d8', type: 'psychic' }] },
          { by: 'slot', level: 6, damage: [{ formula: '7d8', type: 'psychic' }] },
          { by: 'slot', level: 7, damage: [{ formula: '8d8', type: 'psychic' }] },
          { by: 'slot', level: 8, damage: [{ formula: '9d8', type: 'psychic' }] },
          { by: 'slot', level: 9, damage: [{ formula: '10d8', type: 'psychic' }] },
        ],
      },
      effect: ruleReminder(
        'Psychic Skewer',
        'Linked knowledge of location for caster; later bonus action -1d4 next save until caster next turn end. Full concentration extends knowledge 1 hour.',
        { type: 'manual' },
        'enemy',
        false,
      ),
      manual:
        'Choose visible target; initial Intelligence failure links mind. Later bonus action imposes -1d4 to next save before caster next turn end, not initial blanket penalty. Location knowledge defeats hidden/invisible only for caster; full-duration concentration extends knowledge 1 hour. +1d8 damage per higher slot.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:psychokinesis': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Psychokinesis',
    {
      manual:
        'Choose creature or object manually. Creature Huge or smaller, Strength failure move 30 feet and optionally Restrained until caster next turn end; willing fail allowed. Unattended object moves without save, carried object holder Strength save. Action continue/change target, hover and release manual.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:rain-of-fire': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Rain of Fire',
    {
      persistsAfterSave: true,
      mechanics: {
        save: { ability: 'dex', onSave: 'half' },
        damage: [{ formula: '8d6', type: 'fire' }],
      },
      manual:
        'Select creatures in five chosen 5-foot cylinders, once per creature even if overlapping. Initial 8d6 fire/half; later bonus action repeats manually. Track overhead storm height and ignition; successful saves do not end storm.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:reanimation': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Reanimation',
    {
      manual:
        'Manually apply Skeleton/Zombie template to eligible humanoid corpse, controlling up to proficiency-count/combined CR 3. Bonus action commands within 60 feet; after 24 hours hostile. Track renewal and 24-hour creation interval; higher slots extend CR/types. No initial attack/save.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:reanimation-greater': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Reanimation, Greater',
    {
      manual:
        'Manually apply Skeleton/Zombie/Ghoul templates to eligible CR 6 corpses, up to proficiency-count/combined CR 10 including lesser servants. Bonus action commands, renewal and control expiry manual. Slots 7 one week, 8+ permanent; no initial attack/save or invented shared HP.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:rejuvenation': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Rejuvenation',
    {
      effect: ruleReminder(
        'Rejuvenation',
        'Target turn start heal 10 HP; maximum HP restores wounds/limbs. Large enough single fire/acid damage ends spell.',
        { type: 'manual' },
        'ally',
        false,
      ),
      manual:
        'Touch creature; no initial heal. Target own turn starts heal 10 HP; reaching maximum restores permanent wounds/limbs. One fire/acid instance at least twice caster level ends spell, tested manually using entered level; no level derivation.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:riptide': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Riptide',
    {
      mechanics: {
        save: { ability: 'str', onSave: 'half' },
        damage: [{ formula: '4d8', type: 'bludgeoning' }],
        scaling: [
          { by: 'slot', level: 4, damage: [{ formula: '5d8', type: 'bludgeoning' }] },
          { by: 'slot', level: 5, damage: [{ formula: '6d8', type: 'bludgeoning' }] },
          { by: 'slot', level: 6, damage: [{ formula: '7d8', type: 'bludgeoning' }] },
          { by: 'slot', level: 7, damage: [{ formula: '8d8', type: 'bludgeoning' }] },
          { by: 'slot', level: 8, damage: [{ formula: '9d8', type: 'bludgeoning' }] },
          { by: 'slot', level: 9, damage: [{ formula: '10d8', type: 'bludgeoning' }] },
        ],
      },
      manual:
        'Select creatures in 20-foot square. Failures move 15 feet chosen direction; Huge or smaller also Prone, applied manually. +1d8 damage and +5 feet movement per higher slot; no Prone for Gargantuan.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:rot': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Rot',
    {
      mechanics: {
        save: { ability: 'con', onSave: 'half' },
        damage: [{ formula: '9d8', type: 'necrotic' }],
        scaling: [
          { by: 'slot', level: 5, damage: [{ formula: '10d8', type: 'necrotic' }] },
          { by: 'slot', level: 6, damage: [{ formula: '11d8', type: 'necrotic' }] },
          { by: 'slot', level: 7, damage: [{ formula: '12d8', type: 'necrotic' }] },
          { by: 'slot', level: 8, damage: [{ formula: '13d8', type: 'necrotic' }] },
          { by: 'slot', level: 9, damage: [{ formula: '14d8', type: 'necrotic' }] },
        ],
      },
      effect: ruleReminder(
        'Rot',
        'Attack/check disadvantage until caster next turn end.',
        { type: 'untilSourceTurn', when: 'endOfTurn' },
        'enemy',
        false,
      ),
      manual:
        'Choose creature; constructs/undead automatically succeed, plants disadvantage. Failure attack/check disadvantage until caster next turn end. Apply initial branch and special save outcomes manually; +1d8 damage per higher slot.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:sacred-circle': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Sacred Circle',
    {
      effect: ruleReminder(
        'Sacred Circle',
        'Specified types disadvantaged only against three protected creatures inside; action removes qualifying charm/fear/possession. Travel/summoning permission chosen.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Manual 60-foot cylinder: listed creature types disadvantage only against three chosen protected creatures inside. Action removes qualifying charm/fear/possession, select teleport/interplanar/summoning permission. No initial save/damage or blanket incoming attack disadvantage.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:sacred-strikes': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Sacred Strikes',
    {
      effect: ruleReminder(
        'Sacred Strikes',
        'Weapon hits +1d6 radiant; no spell-attack bonus.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial attack/damage. Caster weapon hits add 1d6 radiant while concentration lasts; spell attacks excluded. Apply rider manually to actual weapon attacks.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:safekeeping': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Safekeeping',
    {
      manual:
        'Touch up to eight willing creatures/objects; choose invisibility or same-size object form. Creature Incapacitated, no aging/sustenance; divination concealment. Damage or GM-approved ending condition ends for target. Manage chosen form manually, no default Invisible on object-form target.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:scintillant-blast': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Scintillant Blast',
    {
      manual:
        'Manual per-target d8 blast table then Dexterity save: half initial damage/no riders on success. Multiple result rolls twice rerolling 8s; acid delayed damage separate. Different target damage/types/conditions cannot be one shared resolver.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:seal-away': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Seal Away',
    {
      mechanics: { save: { ability: 'wis', onSave: 'negates' } },
      manual:
        'Choose visible creature. Failure imprisoned in chosen form with GM-approved possible release condition; success grants 1-year immunity. Track removal from encounter and timeless/divination concealment manually; no automatic Incapacitated/Petrified condition invented.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:secret-missive': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Secret Missive',
    {
      manual:
        'Manual message/passphrase or chosen-reader visibility; appears 10 minutes on activation, truesight bypass. Duration depends on ink value, dispelling erases without revealing. No initial save/damage or creature condition.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:shape-winds': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Shape Winds',
    {
      effect: ruleReminder(
        'Shape Winds',
        'Chosen Gale/Turbulence/Thermal Column; later gust/flying saves and direction-dependent movement/attacks manual.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Choose Gale, Turbulence or Thermal Column and switch/pause/resume as action. Direction-dependent attacks/movement, later gust Strength push, flying Strength Prone and fall/jump modifiers manual. No initial save or all-ranged permanent disadvantage.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:shatter-mind': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Shatter Mind',
    {
      manual:
        'Manual 4d6 psychic on every outcome plus Intelligence save against score reduction/control limits. Existing damage-save resolver cannot safely distinguish unconditional damage from failed-save consequences. Track Intelligence/Charisma 1 and escalating days between saves, appropriate cures.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:shooting-stars': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Shooting Stars',
    {
      effect: ruleReminder(
        'Shooting Stars',
        'Six orbiting stars; later bonus action spends one for 5-foot Dexterity 3d6 radiant/half burst.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Create six orbiting stars with dim light. No initial damage/save. Later bonus action spends star: 5-foot radius Dexterity 3d6 radiant/half. Track star count and concentration; higher slots add stars, not damage.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:siphon-life': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Siphon Life',
    {
      manual:
        'Manual Constitution save or willing failure: lose 4d8 HP irreducibly and heal other eligible creature same amount. This is untyped HP loss, not necrotic damage. Excludes constructs/undead; obey printed caster/recipient ranges. Higher slots +1d8.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:sky-omen': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Sky Omen',
    {
      effect: ruleReminder(
        'Sky Omen',
        'First viewing Wisdom save for chosen Terror/Awe/Courage morale effect, later day-end escape; viewing-dependent benefits and higher-slot concentration changes manual.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Manual sky omen and selected Terror/Awe/Courage or GM morale effect. First viewing Wisdom save, optional willing failure, later day-end escape. Courage advantage only against fear/charm while seen; higher slots alter radius/duration and 9th removes concentration.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:sonic-rift': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Sonic Rift',
    {
      mechanics: {
        save: { ability: 'con', onSave: 'half' },
        damage: [{ formula: '4d8', type: 'thunder' }],
        scaling: [
          { by: 'slot', level: 4, damage: [{ formula: '5d8', type: 'thunder' }] },
          { by: 'slot', level: 5, damage: [{ formula: '6d8', type: 'thunder' }] },
          { by: 'slot', level: 6, damage: [{ formula: '7d8', type: 'thunder' }] },
          { by: 'slot', level: 7, damage: [{ formula: '8d8', type: 'thunder' }] },
          { by: 'slot', level: 8, damage: [{ formula: '9d8', type: 'thunder' }] },
          { by: 'slot', level: 9, damage: [{ formula: '10d8', type: 'thunder' }] },
        ],
      },
      manual:
        'Teleport caster and eligible willing companion first, then select shockwave targets within 10 feet of chosen origin/destination, excluding both travelers. Resolve movement manually; +1d8 thunder per higher slot.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:soul-transfer': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Soul Transfer',
    {
      effect: ruleReminder(
        'Soul Transfer',
        'Caster body Unconscious; soul in component. Later action possession/return, hourly escape and range-dependent deaths manual.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Initially caster body Unconscious while soul enters component; no initial possession save. Later action possession uses Charisma save and protections, creature-specific stats, repeat-hour saves and range-dependent deaths. Return/destruction and higher-slot intervals manual; no automatic target control.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:sparking-shot': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Sparking Shot',
    {
      effect: ruleReminder(
        'Sparking Shot',
        'Next weapon/ammunition attack triggers Dexterity lightning burst, hit primary auto fails; two nearby secondary targets. Then clear imbue.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Imbue ammunition/weapon, no initial attack/save/damage. Later attack triggers target plus two chosen nearby Dexterity saves for 3d12 lightning/half; hit primary auto fails. Resolve weapon attack and secondary saves separately, then clear imbue. Higher slots +1d12.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:speak-with-nature': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Speak with Nature',
    {
      effect: ruleReminder(
        'Speak with Nature',
        'Beast communication, no compelled truth; higher slots add plant communication/animation and GM-approved tasks.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial save/damage. Communicate with beasts about known perceptions; no compulsion to answer or truth. Higher slots add plant communication/animation and GM-approved terrain/release tasks manually.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:spectral-champion': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Spectral Champion',
    {
      effect: ruleReminder(
        'Spectral Champion',
        'Chosen damage type, weapon hit +1d4/no healing; optional initial/later champion melee attack then Wisdom against speed 0, resolved manually.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Choose cold/necrotic/radiant before optional initial melee spell attack. Hit 2d8 chosen type then Wisdom save against speed 0 until target next turn end. Existing resolver cannot combine choice/attack/save safely. Track weapon-only +1d4 and no healing until caster next turn start; higher slots scale champion attack.',
    },
  ),
}
