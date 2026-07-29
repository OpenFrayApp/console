// ============================================================================
// bestiary.typ — a reusable OpenFray bestiary template
//
// One template, many books. A book supplies: creature data (JSON), its prose,
// and its art folder. Layout lives here and nowhere else.
//
// Usage:
//   #import "bestiary.typ": *
//   #show: book.with(title: "…", subtitle: "…", lede: [ … ])
// ============================================================================

// The tokens live in theme.typ and are re-exported, so a chapter importing this file
// gets both. TYPOGRAPHY.md is the specification behind them.
#import "theme.typ": *

// ---------------------------------------------------------------- helpers ---
#let minus = "\u{2212}"   // real minus sign, not a hyphen
#let emdash = "—"          // declared here: Typst needs it before first use

#let mod-str(n) = if n >= 0 { "+" + str(n) } else { minus + str(calc.abs(n)) }

#let ability-mod(score) = calc.floor((score - 10) / 2)

#let cr-str(cr) = {
  if cr == 0.125 { "1/8" }
  else if cr == 0.25 { "1/4" }
  else if cr == 0.5 { "1/2" }
  else { str(calc.round(cr)) }
}

#let pb-for-cr(cr) = {
  if cr < 5 { 2 } else if cr < 9 { 3 } else if cr < 13 { 4 }
  else if cr < 17 { 5 } else if cr < 21 { 6 } else if cr < 25 { 7 } else { 8 }
}

#let title-case(s) = {
  s.split(" ").map(w => if w.len() > 0 { upper(w.first()) + w.slice(1) } else { w }).join(" ")
}

// "Small Plant, Unaligned"
#let type-line(c) = {
  title-case(c.size) + " " + title-case(c.type) + ", " + title-case(c.alignment)
}

// "30 ft., Climb 20 ft., Fly 60 ft. (hover)"
#let speed-line(c) = {
  let sp = c.speed
  let parts = (str(sp.at("walk", default: 0)) + " ft.",)
  for k in ("fly", "swim", "climb", "burrow") {
    let v = sp.at(k, default: 0)
    if v > 0 {
      let label = title-case(k)
      let hover = if k == "fly" and sp.at("hover", default: false) { " (hover)" } else { "" }
      parts.push(label + " " + str(v) + " ft." + hover)
    }
  }
  parts.join(", ")
}

#let senses-line(c) = {
  let s = c.at("senses", default: (:))
  let parts = ()
  if s.at("truesight", default: 0) > 0 { parts.push("Truesight " + str(s.truesight) + " ft.") }
  if s.at("darkvision", default: 0) > 0 { parts.push("Darkvision " + str(s.darkvision) + " ft.") }
  if s.at("blindsight", default: 0) > 0 {
    let only = s.at("truesight", default: 0) == 0 and s.at("darkvision", default: 0) == 0
    parts.push("Blindsight " + str(s.blindsight) + " ft." + if only { " (blind beyond)" } else { "" })
  }
  if s.at("tremorsense", default: 0) > 0 {
    let v = s.tremorsense
    let d = if v >= 5280 { "1 mile" } else { str(v) + " ft." }
    parts.push("Tremorsense " + d)
  }
  let pp = "Passive Perception " + str(s.at("passivePerception", default: 10))
  if parts.len() > 0 { parts.join(", ") + "; " + pp } else { pp }
}

#let skill-names = (
  acrobatics: "Acrobatics", animalHandling: "Animal Handling", arcana: "Arcana",
  athletics: "Athletics", deception: "Deception", history: "History",
  insight: "Insight", intimidation: "Intimidation", investigation: "Investigation",
  medicine: "Medicine", nature: "Nature", perception: "Perception",
  performance: "Performance", persuasion: "Persuasion", religion: "Religion",
  sleightOfHand: "Sleight of Hand", stealth: "Stealth", survival: "Survival",
)

// ------------------------------------------------------------ small parts ---
// A rule is a block, so the space around it is the caller's to set and collapses
// against its neighbours. Baked-in `v()` made the gap the sum of this rule's opinion
// and the enclosing block's, which is not adjustable from either end.
#let hrule(weight: r-mid, color: accent, above: s3, below: s3) = block(
  above: above, below: below,
  line(length: 100%, stroke: weight + color),
)


// ------------------------------------------------------------------ tables ---
// One table style for the whole book: a filled header bar, hairline row rules, one
// inset. Abilities, prose tables, rosters and indexes all go through this, so they
// cannot drift apart — which is what made the hand-styled version feel unsystematic.
#let head-cell(s, al: left) = table.cell(
  fill: accent,
  align(al, text(size: t-label, weight: 700, fill: white, tracking: tr-tight)[#upper(s)]),
)

#let data-table(columns: auto, aligns: (), head: (), rows: ()) = {
  table(
    columns: columns,
    inset: (x: in-cell-x, y: in-cell-y),
    stroke: (x, y) => if y == 0 { none } else { (bottom: r-hair + rule-col) },
    ..if head.len() > 0 {
      (table.header(..head.enumerate().map(p => head-cell(p.last(), al: aligns.at(p.first(), default: left)))),)
    } else { () },
    ..rows
  )
}

#let label-head(s) = text(
  size: t-label, weight: 700, fill: accent-deep, tracking: tr-tight,
)[#upper(s)]

// A labelled stat line: **AC** 13
#let statline(label, value) = [#strong(label) #value]

#let ability-table(c) = {
  let ab = c.abilities
  let saves = c.at("saves", default: (:))
  let cells = (
    [], align(center)[#label-head("mod")], align(center)[#label-head("save")],
    [], align(center)[#label-head("mod")], align(center)[#label-head("save")],
  )
  for pair in (("str", "int"), ("dex", "wis"), ("con", "cha")) {
    for k in pair {
      let score = ab.at(k)
      let m = ability-mod(score)
      let sv = saves.at(k, default: m)
      cells.push([#strong(upper(k)) #score])
      cells.push(align(center)[#mod-str(m)])
      cells.push(align(center)[#mod-str(sv)])
    }
  }
  block(above: s4, below: s4)[
    #set text(size: table-size)
    #data-table(
      columns: (auto, 1fr, 1fr, auto, 1fr, 1fr),
      aligns: (left, center, center, left, center, center),
      head: ("", "mod", "save", "", "mod", "save"),
      rows: cells.slice(6),
    )
  ]
}

// Defence / senses / languages / CR block
#let defence-lines(c) = {
  let out = ()
  let vuln = c.at("vulnerabilities", default: ())
  let resi = c.at("resistances", default: ())
  let immu = c.at("immunities", default: ())
  let cond = c.at("conditionImmunities", default: ())
  let skills = c.at("skills", default: (:))

  if skills.len() > 0 {
    let s = skills.pairs().map(p => skill-names.at(p.first(), default: p.first()) + " " + mod-str(p.last()))
    out.push(statline("Skills", s.join(", ")))
  }
  if vuln.len() > 0 { out.push(statline("Vulnerabilities", vuln.join(", "))) }
  if resi.len() > 0 { out.push(statline("Resistances", resi.join(", "))) }
  if immu.len() > 0 or cond.len() > 0 {
    let both = if immu.len() > 0 and cond.len() > 0 {
      immu.join(", ") + "; " + cond.join(", ")
    } else if immu.len() > 0 { immu.join(", ") } else { cond.join(", ") }
    out.push(statline("Immunities", both))
  }
  out.push(statline("Senses", senses-line(c)))
  let langs = c.at("languages", default: ())
  out.push(statline("Languages", if langs.len() > 0 { langs.join(", ") } else { emdash }))
  out.push(statline("CR", cr-str(c.cr) + " (XP " + str(c.xp) + "; PB +" + str(pb-for-cr(c.cr)) + ")"))
  out.join(linebreak())
}


// ------------------------------------------------------------------- art ---
// Optional. A creature renders fine with no art at all.
//   art: { src, alt, credit?, full? }
#let creature-art(c) = {
  let a = c.at("art", default: none)
  if a == none { return }
  let img = image(a.src, width: 100%)
  if a.at("full", default: false) {
    place(top, scope: "parent", float: true, clearance: s8, block(width: 100%)[
      #img
      #if a.at("credit", default: none) != none {
        text(size: t-micro, fill: ink-faint)[#a.credit]
      }
    ])
  } else {
    block(breakable: false, below: s4)[
      #img
      #if a.at("credit", default: none) != none {
        text(size: t-micro, fill: ink-faint)[#a.credit]
      }
    ]
  }
}

// ------------------------------------------------------- action rendering ---
#let recharge-suffix(a) = {
  let r = a.at("recharge", default: none)
  if r == none { return "" }
  if r.type == "dice" {
    if r.value == 6 { " (Recharge 6)" } else { " (Recharge " + str(r.value) + "\u{2013}6)" }
  } else if r.type == "perDay" {
    " (" + str(r.value) + "/Day)"
  } else { "" }
}

// Italicise the 2024 keyword labels inside action text.
#let action-labels = (
  "Melee Attack Roll:", "Ranged Attack Roll:",
  "Strength Saving Throw:", "Dexterity Saving Throw:", "Constitution Saving Throw:",
  "Intelligence Saving Throw:", "Wisdom Saving Throw:", "Charisma Saving Throw:",
  "Hit:", "Failure:", "Success:", "Trigger:", "Response:",
)

// A trait or action's `text` is markdown, so it can carry a table — the Perennial's
// Graft table is the only one today. Without this it renders as raw pipes.
#let md-table(lines) = {
  let rows = lines.map(l => l.trim().trim("|").split("|").map(c => c.trim()))
  if rows.len() < 2 { return }
  let head = rows.first()
  let aligns = rows.at(1).map(a => {
    if a.starts-with(":") and a.ends-with(":") { center }
    else if a.ends-with(":") { right }
    else { left }
  })
  block(above: s4, below: s4)[
    #set text(size: table-size)
    #data-table(
      columns: head.len(),
      aligns: aligns,
      head: head,
      rows: rows.slice(2).flatten().map(c => [#c]),
    )
  ]
}

#let fmt-labels(s) = {
  let parts = ((body: s, lit: false),)
  for lab in action-labels {
    let next = ()
    for p in parts {
      if p.lit or not p.body.contains(lab) { next.push(p) } else {
        let chunks = p.body.split(lab)
        for (i, ch) in chunks.enumerate() {
          if i > 0 { next.push((body: lab, lit: true)) }
          next.push((body: ch, lit: false))
        }
      }
    }
    parts = next
  }
  parts.map(p => if p.lit { emph(p.body) } else { p.body }).join()
}

// Split the text into prose runs and tables, formatting each in its own way.
#let fmt-action-text(s) = {
  if not s.contains("|") { return fmt-labels(s) }
  let out = ()
  let prose = ()
  let rows = ()
  for line in s.split("\n") {
    if line.trim().starts-with("|") {
      if prose.len() > 0 { out.push(fmt-labels(prose.join("\n").trim())); prose = () }
      rows.push(line)
    } else {
      if rows.len() > 0 { out.push(md-table(rows)); rows = () }
      prose.push(line)
    }
  }
  if prose.len() > 0 { out.push(fmt-labels(prose.join("\n").trim())) }
  if rows.len() > 0 { out.push(md-table(rows)) }
  out.join()
}

#let entry(name, body) = [#strong(emph(name + ".")) #body]

#let action-block(a) = block(below: s3)[
  #entry(a.name + recharge-suffix(a), fmt-action-text(a.text))
]

#let section-head(s) = block(above: s7, below: s4)[
  #hrule(weight: r-hair, color: rule-col, above: s0, below: s3)
  #label-head(s)
]

#let spellcasting-block(sc) = {
  let ability-full = (
    str: "Strength", dex: "Dexterity", con: "Constitution",
    int: "Intelligence", wis: "Wisdom", cha: "Charisma",
  ).at(sc.ability)
  block(below: s3)[
    #entry("Spellcasting", [requires no Material components and uses #ability-full as the
      spellcasting ability (spell save DC #sc.saveDc):])
    #for g in sc.groups {
      let label = if g.usage.type == "atWill" { "At Will:" } else {
        str(g.usage.at("per", default: 1)) + "/Day Each:"
      }
      block(above: s2, below: s1)[
        #strong(label) #g.spells.map(s => emph(s.name)).join(", ")
      ]
    }
  ]
}

// ------------------------------------------------------------- stat block ---
// The web links creature mentions to their anchor; print says which page instead.
// The slug matches the web's `#c-<slug>` so one source can drive both.
#let creature-slug(name) = lower(name).replace(" ", "-").replace("'", "").replace("’", "")

/** "Rollrind (p. 12)" — falls back to the bare text if the creature isn't in the book. */
#let cref(target, body) = context {
  let hits = query(label(target))
  if hits.len() == 0 { body } else { [#body (p.~#hits.first().location().page())] }
}

#let statblock(c) = {
  set text(size: stat-size)
  block(width: 100%, breakable: true, below: s8)[
    // The opening never splits: art, name, type, lore, rule, stat header, abilities.
    #block(breakable: false, width: 100%)[
      #creature-art(c)
      // Invisible anchor for cref(); metadata is queryable and takes no space.
      #metadata(c.name)#label("c-" + creature-slug(c.name))
      #block(above: s0, below: s1)[
        #text(size: t-title, weight: 800, fill: accent-deep)[#c.name]
      ]
      #block(above: s0, below: s4)[
        #text(size: t-note, style: "italic", fill: ink-faint)[#type-line(c)]
      ]
      #if c.at("description", default: none) != none {
        block(above: s4, below: s4)[#text(size: stat-size, fill: ink-soft)[#c.description]]
      }
      #hrule(above: s4, below: s3)
      #statline("AC", str(c.ac)) #linebreak()
      #statline("Initiative", mod-str(c.initiative) + " (" + str(10 + c.initiative) + ")") #linebreak()
      #statline("HP", str(c.maxHp) + " (" + c.hpFormula.replace("+", " + ").replace("-", " " + minus + " ") + ")") #linebreak()
      #statline("Speed", speed-line(c))
      #ability-table(c)
      #defence-lines(c)
    ]

    #let traits = c.at("traits", default: ())
    #if traits.len() > 0 {
      section-head("Traits")
      for t in traits { block(below: s3)[#entry(t.name, fmt-action-text(t.text))] }
    }

    #let actions = c.at("actions", default: ())
    #if actions.len() > 0 or c.at("spellcasting", default: none) != none {
      section-head("Actions")
      for a in actions { action-block(a) }
      let sc = c.at("spellcasting", default: none)
      if sc != none { spellcasting-block(sc) }
    }

    #let bonus = c.at("bonusActions", default: ())
    #if bonus.len() > 0 {
      section-head("Bonus Actions")
      for a in bonus { action-block(a) }
    }

    #let reactions = c.at("reactions", default: ())
    #if reactions.len() > 0 {
      section-head("Reactions")
      for a in reactions { action-block(a) }
    }

    #let la = c.at("legendaryActions", default: none)
    #if la != none {
      section-head("Legendary Actions")
      block(below: s3)[
        #strong("Legendary Action Uses: " + str(la.perRound) + ".")
        Immediately after another creature's turn, #lower(c.name) can expend a use to take one
        of the following actions. It regains all expended uses at the start of each of its turns.
      ]
      for a in la.actions { action-block(a) }
    }
  ]
}

// ------------------------------------------------- Game Master commentary ---
// Sits outside the stat block, visually separate.
#let gm-note(body) = block(
  width: 100%, breakable: true, below: s8,
  inset: (left: s5, top: s3, bottom: s3),
  stroke: (left: r-mid + accent),
)[
  #set text(size: note-size, fill: ink-soft)
  #body
]

// ----------------------------------------------------------- encounter ---
#let encounter(name: "", levels: "", xp: "", terrain: [], roster: (), idea: []) = {
  block(width: 100%, breakable: true, below: s8)[
    #block(breakable: false, width: 100%)[
      #block(above: s0, below: s1)[
        #text(size: t-title, weight: 800, fill: accent-deep)[#name]
      ]
      #block(above: s0, below: s4)[
        #text(size: t-note, weight: 600, fill: accent)[Levels #levels · #xp XP]
      ]
      #hrule(above: s4, below: s3)
      #set text(size: stat-size)
      #entry("Terrain", terrain)
    ]
    #set text(size: table-size)
    #data-table(
      columns: (1fr, auto, auto, 1.6fr),
      aligns: (left, center, center, left),
      head: ("creature", "no", "cr", "placement"),
      rows: roster.map(r => (
        [#r.at(0)], align(center)[#r.at(1)], align(center)[#r.at(2)], [#r.at(3)],
      )).flatten(),
    )
  ]
  gm-note[#entry("The idea", idea)]
}

// ------------------------------------------------------------- structure ---
// `intro` is positional and last, so a call can pass it as a trailing content
// block: #chapter(number: 1, title: "…")[ … ]. As a named parameter it rejected
// every call site in the book.
#let chapter(number: none, eyebrow: auto, title: "", intro) = {
  pagebreak(weak: true)
  place(top, scope: "parent", float: true, clearance: s9, block(width: 100%)[
    #block(above: s0, below: s1)[
      #text(size: t-table, weight: 700, fill: accent, tracking: tr-wide)[
        #upper(if eyebrow != auto { eyebrow }
               else if number == none { "Appendix" }
               else { "Chapter " + str(number) })
      ]
    ]
    #block(above: s0, below: s3)[
      #text(size: t-chapter, weight: 800, fill: ink)[#title]
    ]
    #hrule(weight: r-heavy, above: s0, below: s0)
  ])
  if intro != [] {
    block(below: s7)[#set text(size: base-size, fill: ink-soft); #intro]
  }
}

#let section(title, body) = {
  block(width: 100%, breakable: true, below: s8)[
    #block(breakable: false)[
      #text(size: t-title, weight: 800, fill: accent-deep)[#title]
      #hrule()
    ]
    #body
  ]
}

// A table that spans both columns.
#let wide(body) = place(top, scope: "parent", float: true, clearance: s8, block(width: 100%)[#body])

// The heading of a wide section. Its own role because generate-print.mjs emits it, and
// a size written into a JavaScript string is a size the type scale cannot reach.
#let wide-head(s) = {
  text(size: t-title, weight: 800, fill: accent-deep)[#s]
  hrule()
}

// ------------------------------------------------------------------ cover ---
#let cover(title: "", subtitle: "", lede: [], meta: []) = page(
  columns: 1, margin: cover-margin, header: none, footer: none,
)[
  #block(above: s0, below: cover-gap)[
    #text(size: t-note, weight: 700, fill: accent, tracking: tr-wide)[OPENFRAY · COMPENDIUM]
  ]
  #block(above: s0, below: s5)[#text(size: t-cover, weight: 800, fill: ink)[#title]]
  #block(above: s0, below: s9)[#text(size: t-sub, fill: ink-soft)[#subtitle]]
  #block(above: s0, below: s9)[#line(length: cover-rule, stroke: r-heavy + accent)]
  #block(above: s0, below: s0, width: 84%)[#text(size: t-lead, fill: ink-soft)[#lede]]
  // The one spacer that isn't rhythm: it pushes the imprint to the foot of the page.
  #v(1fr)
  #hrule(weight: r-hair, color: rule-col, above: s0, below: s5)
  #text(size: t-body, fill: ink-soft)[#meta]
]

// -------------------------------------------------------------- end page ---
#let endpage(body) = {
  pagebreak(weak: true)
  place(top, scope: "parent", float: true, clearance: s8, block(width: 100%)[#body])
}

// -------------------------------------------------------- document setup ---
#let book(title: "", subtitle: "", doc) = {
  set document(title: title, description: subtitle)
  set page(
    paper: "a4",
    margin: page-margin,
    columns: 2,
    footer: context {
      set text(size: t-label, fill: ink-faint)
      grid(
        columns: (1fr, auto, 1fr),
        align(left)[#title],
        align(center)[#counter(page).display()],
        align(right)[openfray.app],
      )
    },
  )
  set text(font: body-font, size: base-size, fill: ink, lang: "en", region: "us")
  // Leading and paragraph spacing are part of the rhythm, not separate knobs.
  set par(justify: false, leading: 0.64em, spacing: s5)
  show link: it => text(fill: accent-deep, it)
  show strong: it => text(fill: ink, weight: 700, it)

  doc
}
