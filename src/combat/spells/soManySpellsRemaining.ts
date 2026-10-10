// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { condition, reminder } from '../effects.ts'
import { ruleReminder } from './reviewedProfile.ts'
import { reviewed } from './soManySpells.ts'

export const SO_MANY_SPELLS_REMAINDER: Record<string, ReviewedSpellCasting> = {
  'somanyrobots-so-many-spells:disguise-creature': reviewed('Disguise Creature', {
    manual:
      'Manual touched-target illusion. Only unwilling targets attempt an initial Charisma save; willing targets have no save. Touch reveals the illusion; action Investigation against caster DC can disbelieve it. Track dismissal, 1-foot dimensional changes, and slot-dependent 1-hour/8-hour/24-hour/permanent duration and mirror cost. No blanket condition or modifier.',
  }),
  'somanyrobots-so-many-spells:disposable-skeleton': reviewed('Disposable Skeleton', {
    manual:
      'Manually add corpse minion: AC 12, 10 HP, speed 15 feet; +5 HP per slot above 2nd. Takes turn after caster, no actions, moves to stay within 5 feet. Within 15 feet, reaction redirects an attack that would hit caster. No initial attack/save; track destruction and 1-minute expiry.',
  }),
  'somanyrobots-so-many-spells:dragonmaw': reviewed('Dragonmaw', {
    effect: ruleReminder(
      'Dragonmaw',
      'Chosen acid/cold/fire/lightning/poison resistance; arm is simple melee weapon for 2d6 magical piercing. Once per turn in place of attack: 30-foot cone, Dexterity save, 4d8 chosen type, half on success.',
      { type: 'rounds', rounds: 100 },
      'ally',
    ),
    manual:
      'Choose one willing touched creature and damage type. No initial attack/save/damage. Resolve later attacks and breath manually. Arm cannot hold weapon/shield or manipulate objects; can grapple but cannot attack other creatures while grappling.',
  }),
  'somanyrobots-so-many-spells:eagle-s-wings': reviewed("Eagle's Wings", {
    effect: ruleReminder(
      "Eagle's Wings",
      'Fly 60 feet. After flying 30 feet straight on own turn: next melee attack +4d6 same damage type. Action gust: Huge-or-smaller creatures in 30-by-10-foot line make Strength save or fall Prone and move back 15 feet.',
      { type: 'manual' },
      'ally',
      true,
    ),
    manual:
      'Choose one willing visible creature, plus one per slot above 5th. Track flight and conditional bonus manually, not all attacks. Gust is a later action, not initial-cast damage/save. Track 1 hour.',
  }),
  'somanyrobots-so-many-spells:ebon-spear': reviewed('Ebon Spear', {
    mechanics: { attackRoll: true, damage: [{ formula: '7d10', type: 'necrotic' }] },
    manual:
      'Choose one visible creature. On hit only, manually make a separate Charisma save against 1-minute light curse. While cursed, start in bright light: 2d10 necrotic and half speed until next turn ends. End-turn Charisma saves end curse. Do not apply curse from the hit alone or add later damage to initial attack.',
  }),
  'somanyrobots-so-many-spells:eclipse': reviewed('Eclipse', {
    persistsAfterSave: true,
    mechanics: {
      damage: [{ formula: '4d8', type: 'radiant' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    manual:
      'Select initial creatures in 30-foot sphere. Manually set disadvantage for shapechangers or creatures susceptible to silver; they cannot change form in beam. Later end-turn saves/damage and area dim light are manual. Concentration persists even if all initial saves succeed; track 10 minutes.',
  }),
  'somanyrobots-so-many-spells:enveloping-blackness': reviewed('Enveloping Blackness', {
    manual:
      'Manual 20-foot magical-darkness sphere. No initial save/damage. Start-turn Wisdom save: 3d8 psychic and half speed until next turn starts on failure, half damage/no slowdown on success. Charm-immune creatures automatically succeed. Track 1-minute concentration and geometry.',
  }),
  'somanyrobots-so-many-spells:fetid-blade': reviewed('Fetid Blade', {
    effect: ruleReminder(
      'Fetid Blade',
      'Touched weapon: +1d12 poison per hit. First hit per creature each round: Constitution save or Poisoned until next turn ends.',
      { type: 'rounds', rounds: 100 },
      'ally',
    ),
    manual:
      'Mark weapon and resolve later bonus damage and once-per-round saves manually. No initial save/damage. Bonus increases 1d12 per two slots above 4th, not every slot; track 10-minute concentration.',
  }),
  'somanyrobots-so-many-spells:field-of-rot': reviewed('Field of Rot', {
    manual:
      'Manual growing ground area: initial radius 10 feet, +5 feet each caster turn; +5 initial feet per slot above 4th. No initial save. Start-turn Constitution save: 3d8 necrotic, half on success; failures decay, adding 1d6 necrotic to attacks received and -10 feet speed until next turn starts. Decay ends only by ending turn outside field; decaying failures take double damage. Track these separate printed timings manually.',
  }),
  'somanyrobots-so-many-spells:flashdaggers': reviewed('Flashdaggers', {
    mechanics: {
      damage: [{ formula: '5d4', type: 'piercing' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    manual: 'Choose one visible creature. Add 2d4 damage per slot above 1st manually.',
  }),
  'somanyrobots-so-many-spells:force-barrier': reviewed('Force Barrier', {
    effect: ruleReminder(
      'Force Barrier',
      'Resistance to force, bludgeoning, piercing, slashing; speed halved; cannot take reactions.',
      { type: 'rounds', rounds: 10 },
      'self',
    ),
    manual:
      'Apply defenses, speed, and reaction restriction manually while concentrating. Speed penalty reduced by 5 feet per slot above 2nd. No initial save/attack/damage; remove changed defenses when spell ends.',
  }),
  'somanyrobots-so-many-spells:form-of-bone': reviewed('Form of Bone', {
    effect: ruleReminder(
      'Form of Bone',
      'Piercing/slashing resistance, poison immunity, ignore nonmagical difficult terrain. Own-turn necrotic damage: may maximize one die. Action hands: chosen creatures within 15 feet make Strength save against 3d8 bludgeoning and speed 0 until caster next turn starts; half damage/no slowdown on success.',
      { type: 'rounds', rounds: 100 },
      'self',
    ),
    manual:
      'No initial save or damage. Resolve later hands, selected necrotic die, defenses, and terrain manually. Remove transformed defenses on concentration loss or 10-minute expiry.',
  }),
  'somanyrobots-so-many-spells:ghastly-stampede': reviewed('Ghastly Stampede', {
    manual:
      'Manual initial and subsequent-action stampedes in 30-by-60-foot line. Strength save: failure takes 2d8 cold +2d8 necrotic and Prone; success takes full cold only. Shared save resolver cannot apply success to only one damage type; do not halve both. Concentration allows later action each round. Both types +1d8 per two slots above 4th.',
  }),
  'somanyrobots-so-many-spells:ghost-in-the-machine': reviewed('Ghost in the Machine', {
    manual:
      'Manual Spiritless Shell summon and disembodied caster transformation using printed stat block. Shell takes turn immediately after caster; excess destruction damage carries to body. Spirit resists all damage, flies/hover; action commands shell Dash. No initial attack/save/damage. Track telepathic orders, 100-foot end-turn tether, shell reaction fumes, and return space on 1-hour expiry/concentration loss.',
  }),
  'somanyrobots-so-many-spells:ghoul-touch': reviewed('Ghoul Touch', {
    effect: ruleReminder(
      'Ghoul Touch',
      'Natural unarmed weapon: 1d6 slashing +1d6 necrotic. Hit humanoid: Constitution save against 1-minute Paralyzed; end-turn saves end paralysis and confer 24-hour immunity.',
      { type: 'rounds', rounds: 10 },
      'self',
    ),
    manual:
      'Transformation grants later attacks, not an attack at initial casting. Track saves, escape, and per-creature immunity manually. At slots 6+, paralysis can affect nonhumanoids. No initial save/damage.',
  }),
  'somanyrobots-so-many-spells:glacial-axe': reviewed('Glacial Axe', {
    effect: ruleReminder(
      'Glacial Axe',
      'Martial axe, caster proficient; 1d8 slashing +2d4 cold; thrown 20/60. Once per turn damage: -10 feet speed until next turn ends. Thrown hit may explode: 10-foot Dexterity save for same cold roll and slowdown, half/no slowdown on success, ending spell.',
      { type: 'rounds', rounds: 10 },
      'self',
    ),
    manual:
      'Creation makes no initial attack. Resolve later weapon attack, once-turn slowdown, and optional explosion manually. Use same cold damage roll for explosion, not fresh damage; +1d4 cold per slot above 2nd.',
  }),
  'somanyrobots-so-many-spells:gloamblast': reviewed('Gloamblast', {
    manual:
      'Manual initial Wisdom saves in 30-foot radius: failure 4d8 psychic +4d8 necrotic, success full necrotic only. Shared save resolver cannot apply different outcomes per damage component. Area becomes dim light until caster next turn starts; do not halve both damage types.',
  }),
  'somanyrobots-so-many-spells:grasping-dead': reviewed('Grasping Dead', {
    persistsAfterSave: true,
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
    effect: ruleReminder(
      'Grasping Dead',
      'Seized: speed 0; 2d4 bludgeoning at each turn start. Strength escape save as action and at each turn end.',
      { type: 'rounds', rounds: 10 },
      'enemy',
      true,
    ),
    manual:
      'Select initial creatures in 10-foot radius. No initial damage; speed 0 is not Restrained. Resolve entry saves, later damage, and escape manually; remove reminder on escape. Area persists on initial successes. Radius +5 feet and later damage +1d4 per slot above 1st.',
  }),
  'somanyrobots-so-many-spells:grave-passage': reviewed('Grave Passage', {
    manual:
      'Manual same-plane grave portal: action to lie down and travel, action to push through up to 6 feet earth. Visited/touched destination succeeds; seen only has 5% undead risk per traveler; heard only 25%. GM chooses resulting undead/control. No conventional save or damage; track 1-minute concentration.',
  }),
  'somanyrobots-so-many-spells:grave-wallop': reviewed('Grave Wallop', {
    attackKind: 'melee',
    mechanics: { attackRoll: true, damage: [{ formula: '1d10', type: 'bludgeoning' }] },
    effect: {
      summary: 'Knocked prone',
      targeting: 'enemy',
      build: ({ source }) => [
        { ...condition('Prone', { source }), durationNote: 'Until stood up or cleared' },
      ],
    },
    manual:
      'On hit, apply Prone and initial bludgeoning here. Resolve the printed 1d6 necrotic to target and chosen creatures within 5 feet separately, using one roll. It is not additional bludgeoning attack dice. Add 1d10 bludgeoning per slot above 1st; necrotic stays 1d6.',
  }),
  'somanyrobots-so-many-spells:gravitic-field': reviewed('Gravitic Field', {
    effect: ruleReminder(
      'Gravitic Field',
      'Moving 30-foot dome: difficult terrain; external ranged attacks stop. Reaction reflects projectile via ranged spell attack for original damage. Action crush: Strength save, 5d10 bludgeoning and Prone; half/no Prone on success.',
      { type: 'rounds', rounds: 100 },
      'self',
    ),
    manual:
      'No initial save/attack/damage. Resolve dome membership, later reflection and crush manually. Do not grant global ranged immunity to creatures outside dome or reroll original projectile damage.',
  }),
  'somanyrobots-so-many-spells:gravity-slam': reviewed('Gravity Slam', {
    mechanics: {
      damage: [{ formula: '6d8', type: 'bludgeoning' }],
      save: { ability: 'str', onSave: 'half' },
    },
    effect: {
      summary: 'Prone; Restrained until target next turn starts',
      targeting: 'enemy',
      multi: true,
      build: ({ source, target }) => [
        { ...condition('Prone', { source }), durationNote: 'Until stood up or cleared' },
        condition('Restrained', {
          source: target?.combatantId ?? source,
          duration: target ? { type: 'untilSourceTurn', when: 'startOfTurn' } : { type: 'manual' },
        }),
      ],
    },
    manual:
      'Select creatures in 15-foot-radius, 40-foot-high cylinder. Apply both conditions only on failure. Restrained expires at target next turn start; Prone remains until stood up or cleared manually. Forced grounding is manual.',
  }),
  'somanyrobots-so-many-spells:hateful-spirits': reviewed('Hateful Spirits', {
    manual:
      'Manual 30-foot difficult-terrain area; no initial save. Each creature turn start rolls d6: 1–2 Dexterity/4d6 slashing, 3–4 Wisdom/Frightened until next turn starts, 5–6 Constitution/4d8 necrotic and no healing until next turn starts. Successful saves negate; do not assign one fixed save or damage to table. Track 1-minute concentration.',
  }),
  'somanyrobots-so-many-spells:howl-of-the-moon': reviewed('Howl of the Moon', {
    effect: ruleReminder(
      'Howl of the Moon',
      '+10 feet speed; first melee hit on own turn +2d4 radiant. If night and moon visible at casting: +15 feet speed and +3d4 radiant instead.',
      { type: 'rounds', rounds: 10 },
      'ally',
      true,
    ),
    manual:
      'Select caster and up to two others within 30 feet that hear howl. Slots 5+ increase affected count by one as printed; do not assume one additional per slot. Track speed and first-hit damage manually; no initial attack/save.',
  }),
  'somanyrobots-so-many-spells:incandescent-blade': reviewed('Incandescent Blade', {
    manual:
      'Manual weapon transformation; no initial attack. Later action melee spell attacks one/two adjacent targets within 10 feet: 3d8 fire +3d8 slashing. Alternative action impales within 15 feet: Dexterity negates 6d8 fire +6d8 piercing, ends spell; below 30 HP and not fire-immune incinerates. Other creatures starting within 5 feet take 2d6 fire. Track dim light and separate attack/action/hazard branches.',
  }),
  'somanyrobots-so-many-spells:infectious-jig': reviewed('Infectious Jig', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Infectious Jig',
      'Start turn: move up to 20 feet in caster-chosen direction, avoiding obvious danger. End-turn Wisdom save ends effect. Caster reaction can spread to creature within 5 feet at affected turn end.',
      { type: 'rounds', rounds: 10 },
    ),
    manual:
      'Choose one visible creature not immune to charm. Spell does not explicitly impose Charmed. Resolve forced movement, reaction spread saves, and escape manually; remove reminder on escape. Do not apply blanket Incapacitated.',
  }),
  'somanyrobots-so-many-spells:instant-guardian': reviewed('Instant Guardian', {
    effect: ruleReminder(
      'Instant Guardian',
      'Reaction when creature within 30 feet would be hit: teleport adjacent, become attack target; if attacker within 5 feet, may make one weapon attack.',
      { type: 'rounds', rounds: 10 },
      'self',
    ),
    manual:
      'No initial attack or save. Resolve teleport space, attack redirection, and conditional retaliatory weapon attack manually. Track 1 minute; do not grant permanent AC bonus.',
  }),
  'somanyrobots-so-many-spells:irresistible-melody': reviewed('Irresistible Melody', {
    persistsAfterSave: true,
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: {
      summary: 'Charmed and Incapacitated; end-turn/damage Wisdom escape saves',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [
        condition('Charmed', { source, duration: { type: 'rounds', rounds: 10 } }),
        condition('Incapacitated', { source, duration: { type: 'rounds', rounds: 10 } }),
        reminder(
          'Irresistible Melody',
          'Must move toward melody, avoiding obvious danger; Wisdom escape save each turn end and whenever damaged.',
          { source, duration: { type: 'rounds', rounds: 10 } },
        ),
      ],
    },
    manual:
      'Select creatures hearing melody within 30-foot radius, excluding charm-immune. Manually move targets and bonus-action melody source up to 30 feet; later eligibility is manual. Remove entire bundle on escape. Melody remains despite successful initial saves until concentration ends or 1 minute.',
  }),
  'somanyrobots-so-many-spells:keen-weapon': reviewed('Keen Weapon', {
    effect: ruleReminder(
      'Keen Weapon',
      'Chosen metal weapon deals +1d6 of its damage type on each hit.',
      { type: 'rounds', rounds: 10 },
      'ally',
      true,
    ),
    manual:
      'Mark weapon and resolve bonus on later attacks, not initial damage. One additional weapon per two slots above 1st, starting at 3rd; track 1-minute concentration.',
  }),
  'somanyrobots-so-many-spells:latching-beetle': reviewed('Latching Beetle', {
    mechanics: {
      damage: [{ formula: '3d4', type: 'piercing' }],
      save: { ability: 'con', onSave: 'negates' },
    },
    effect: ruleReminder(
      'Latching Beetle',
      'At each target turn end: Constitution save or 3d4 poison and Poisoned until next turn starts.',
      { type: 'rounds', rounds: 10 },
    ),
    manual:
      'Choose one visible creature. Initial failure attaches beetle and deals only piercing. Later poison, condition, and saves are manual; successful later saves do not detach beetle. Concentration/1-minute expiry ends attachment.',
  }),
  'somanyrobots-so-many-spells:lead-to-gold': reviewed('Lead to Gold', {
    manual:
      'Manual object transformation: up to 10 gp base metal becomes ten times that value in gold, form unchanged. No creature save/modifier. Track reversion after 1 hour, +1 hour per slot above 3rd; 9th-slot permanent.',
  }),
  'somanyrobots-so-many-spells:lich-s-mantle': reviewed("Lich's Mantle", {
    manual:
      'Manual self-transformation: cold/lightning/necrotic resistance, nonmagical attack physical resistance, exhaustion/paralysis/poison condition immunity. Later unarmed attacks use spellcasting modifier, 2d8+modifier necrotic; once-turn hit can force Constitution save against 1-minute Paralyzed with end-turn saves. Once-turn necrotic may add 3d6 and half that as temporary HP. No initial attack/save; track defenses and separate once-turn benefits.',
  }),
  'somanyrobots-so-many-spells:lightfoot': reviewed('Lightfoot', {
    manual:
      'Manual travel benefit for up to four visible creatures. Fast pace without passive Perception penalty, Normal pace stealth, optional Very Fast with -10 passive Perception. No combat speed increase or blanket Perception bonus. Lasts 8 hours; +2 targets per slot above 2nd.',
  }),
  'somanyrobots-so-many-spells:lightning-spike': reviewed('Lightning Spike', {
    manual:
      'Manual spell attack with damage even on miss: hit 1d8 piercing +1d12 lightning, miss 1d12 lightning. Attack resolver cannot safely execute miss damage. Later bonus-action pulse deals 1d12 to impaled target and uses same roll for nearby Dexterity-negates arc. Athletics against caster DC removes rod as action within 5 feet. No invented end-turn escape save.',
  }),
  'somanyrobots-so-many-spells:lightning-sprint': reviewed('Lightning Sprint', {
    mechanics: {
      damage: [{ formula: '2d4', type: 'lightning' }],
      save: { ability: 'dex', onSave: 'negates' },
    },
    manual:
      'Move caster up to 30 feet manually before selecting first three creatures passed through for initial saves. Opportunity attackers that hit during this movement also save manually; do not apply to all nearby creatures. Per slot above 2nd: +10 feet movement and +1 passed-through target; damage stays 2d4.',
  }),
}
