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

// ---------------------------------------------------------------- tokens ---
// Matches openfray.app light theme.
#let accent       = rgb("#4f46e5")
#let accent-deep  = rgb("#4338ca")
#let accent-tint  = rgb("#eef2ff")
#let ink          = rgb("#0f172a")
#let ink-soft     = rgb("#475569")
#let ink-faint    = rgb("#94a3b8")
#let rule-col     = rgb("#e2e8f0")
#let rule-strong  = rgb("#cbd5e1")

// Inter is the closest free match to the app's system-ui stack.
// Typst falls through this list until it finds an installed face.
#let body-font = ("Inter", "Helvetica Neue", "Helvetica", "Arial", "Liberation Sans")

#let base-size   = 9.2pt
#let stat-size   = 8.8pt
#let table-size  = 8pt
#let note-size   = 8.4pt

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
#let hrule(weight: 1.4pt, color: accent) = {
  v(1.6mm)
  line(length: 100%, stroke: weight + color)
  v(1.5mm)
}


// ------------------------------------------------------------------ tables ---
// One table style for the whole book: a filled header bar, hairline row rules, one
// inset. Abilities, prose tables, rosters and indexes all go through this, so they
// cannot drift apart — which is what made the hand-styled version feel unsystematic.
#let head-cell(s, al: left) = table.cell(
  fill: accent,
  align(al, text(size: 6.9pt, weight: 700, fill: white, tracking: 0.5pt)[#upper(s)]),
)

#let data-table(columns: auto, aligns: (), head: (), rows: ()) = {
  table(
    columns: columns,
    inset: (x: 5pt, y: 3.8pt),
    stroke: (x, y) => if y == 0 { none } else { (bottom: 0.4pt + rule-col) },
    ..if head.len() > 0 {
      (table.header(..head.enumerate().map(p => head-cell(p.last(), al: aligns.at(p.first(), default: left)))),)
    } else { () },
    ..rows
  )
}

#let label-head(s) = text(
  size: 7.4pt, weight: 700, fill: accent-deep, tracking: 0.6pt,
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
  block(above: 2.2mm, below: 2.6mm)[
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
    place(top, scope: "parent", float: true, clearance: 6mm, block(width: 100%)[
      #img
      #if a.at("credit", default: none) != none {
        text(size: 6.6pt, fill: ink-faint)[#a.credit]
      }
    ])
  } else {
    block(breakable: false, below: 2mm)[
      #img
      #if a.at("credit", default: none) != none {
        text(size: 6.6pt, fill: ink-faint)[#a.credit]
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
  block(above: 2.2mm, below: 2.6mm)[
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

#let action-block(a) = block(below: 1.6mm)[
  #entry(a.name + recharge-suffix(a), fmt-action-text(a.text))
]

#let section-head(s) = block(above: 4.2mm, below: 2.4mm)[
  #line(length: 100%, stroke: 0.5pt + rule-col)
  #v(1.6mm)
  #label-head(s)
]

#let spellcasting-block(sc) = {
  let ability-full = (
    str: "Strength", dex: "Dexterity", con: "Constitution",
    int: "Intelligence", wis: "Wisdom", cha: "Charisma",
  ).at(sc.ability)
  block(below: 1.6mm)[
    #entry("Spellcasting", [requires no Material components and uses #ability-full as the
      spellcasting ability (spell save DC #sc.saveDc):])
    #for g in sc.groups {
      let label = if g.usage.type == "atWill" { "At Will:" } else {
        str(g.usage.at("per", default: 1)) + "/Day Each:"
      }
      block(above: 1mm, below: 0.6mm)[
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
  block(width: 100%, breakable: true, below: 6mm)[
    // The opening never splits: art, name, type, lore, rule, stat header, abilities.
    #block(breakable: false, width: 100%)[
      #creature-art(c)
      // Invisible anchor for cref(); metadata is queryable and takes no space.
      #metadata(c.name)#label("c-" + creature-slug(c.name))
      #text(size: 12.5pt, weight: 800, fill: accent-deep)[#c.name]
      #v(-2.2mm)
      #text(size: 8.4pt, style: "italic", fill: ink-faint)[#type-line(c)]
      #if c.at("description", default: none) != none {
        v(0.6mm)
        block(below: 1.2mm)[#text(size: stat-size, fill: ink-soft)[#c.description]]
      }
      #hrule()
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
      for t in traits { block(below: 1.6mm)[#entry(t.name, fmt-action-text(t.text))] }
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
      block(below: 1.6mm)[
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
  width: 100%, breakable: true, below: 6mm,
  inset: (left: 3mm, top: 1.6mm, bottom: 1.6mm),
  stroke: (left: 1.5pt + accent),
)[
  #set text(size: note-size, fill: ink-soft)
  #body
]

// ----------------------------------------------------------- encounter ---
#let encounter(name: "", levels: "", xp: "", terrain: [], roster: (), idea: []) = {
  block(width: 100%, breakable: true, below: 6mm)[
    #block(breakable: false, width: 100%)[
      #text(size: 12.5pt, weight: 800, fill: accent-deep)[#name]
      #v(-2.2mm)
      #text(size: 8.4pt, weight: 600, fill: accent)[Levels #levels · #xp XP]
      #hrule()
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
  place(top, scope: "parent", float: true, clearance: 7mm, block(width: 100%)[
    #text(size: 8pt, weight: 700, fill: accent, tracking: 1.4pt)[
      #upper(if eyebrow != auto { eyebrow }
             else if number == none { "Appendix" }
             else { "Chapter " + str(number) })
    ]
    #v(-2mm)
    #text(size: 21pt, weight: 800, fill: ink)[#title]
    #v(1.5mm)
    #line(length: 100%, stroke: 2.5pt + accent)
  ])
  if intro != [] {
    block(below: 5mm)[#set text(size: base-size, fill: ink-soft); #intro]
  }
}

#let section(title, body) = {
  block(width: 100%, breakable: true, below: 6mm)[
    #block(breakable: false)[
      #text(size: 12.5pt, weight: 800, fill: accent-deep)[#title]
      #hrule()
    ]
    #body
  ]
}

// A table that spans both columns.
#let wide(body) = place(top, scope: "parent", float: true, clearance: 6mm, block(width: 100%)[#body])

// ------------------------------------------------------------------ cover ---
#let cover(title: "", subtitle: "", lede: [], meta: []) = page(
  columns: 1, margin: (x: 20mm, y: 24mm), header: none, footer: none,
)[
  #v(18mm)
  #text(size: 8.5pt, weight: 700, fill: accent, tracking: 1.6pt)[OPENFRAY · COMPENDIUM]
  #v(14mm)
  #text(size: 46pt, weight: 800, fill: ink)[#title]
  #v(3mm)
  #text(size: 14pt, fill: ink-soft)[#subtitle]
  #v(8mm)
  #line(length: 36mm, stroke: 3pt + accent)
  #v(8mm)
  #block(width: 84%)[#text(size: 10.5pt, fill: ink-soft)[#lede]]
  #v(1fr)
  #line(length: 100%, stroke: 0.5pt + rule-col)
  #v(3mm)
  #text(size: 9pt, fill: ink-soft)[#meta]
]

// -------------------------------------------------------------- end page ---
#let endpage(body) = {
  pagebreak(weak: true)
  place(top, scope: "parent", float: true, clearance: 6mm, block(width: 100%)[#body])
}

// -------------------------------------------------------- document setup ---
#let book(title: "", subtitle: "", doc) = {
  set document(title: title, description: subtitle)
  set page(
    paper: "a4",
    margin: (x: 14mm, top: 14mm, bottom: 16mm),
    columns: 2,
    footer: context {
      set text(size: 7.5pt, fill: ink-faint)
      grid(
        columns: (1fr, auto, 1fr),
        align(left)[#title],
        align(center)[#counter(page).display()],
        align(right)[openfray.app],
      )
    },
  )
  set text(font: body-font, size: base-size, fill: ink, lang: "en", region: "us")
  set par(justify: false, leading: 0.58em, spacing: 0.9em)
  show link: it => text(fill: accent-deep, it)
  show strong: it => text(fill: ink, weight: 700, it)

  doc
}
