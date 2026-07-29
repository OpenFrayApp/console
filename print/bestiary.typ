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
#let hrule(weight: r-mid, color: accent, above: sp-3, below: sp-3) = block(
  above: above, below: below,
  line(length: 100%, stroke: weight + color),
)


// ------------------------------------------------------------------ tables ---
// One table style for the whole book: a header row over an accent rule, hairline row
// rules, one inset. Abilities, prose tables, rosters and indexes all go through this,
// so they cannot drift apart.
//
// The header is not filled. The site has no filled header on any table — that was a
// print invention, and at this size a solid accent bar is the loudest thing on the
// page.
#let head-cell(s, al: left) = table.cell(
  align(al, text(size: t-micro, weight: wt-strong, fill: ink-faint, tracking: tr-label)[#upper(s)]),
)

#let data-table(columns: auto, aligns: (), head: (), rows: ()) = {
  set par(leading: lead-small)
  table(
    columns: columns,
    inset: (x: in-cell-x, y: in-cell-y),
    stroke: (x, y) => if y == 0 and head.len() > 0 { (bottom: r-mid + accent) } else {
      (bottom: r-hair + rule-col)
    },
    ..if head.len() > 0 {
      (table.header(..head.enumerate().map(p => head-cell(p.last(), al: aligns.at(p.first(), default: left)))),)
    } else { () },
    ..rows
  )
}

#let label-head(s) = text(
  size: t-micro, weight: wt-strong, fill: accent, tracking: tr-label,
)[#upper(s)]

// A labelled stat field: an accent label and a muted value, as the site sets them.
#let statline(label, value) = [#text(fill: accent, weight: wt-strong)[#label] #value]

// The four headline fields flow as one wrapping row rather than four stacked lines,
// which is the site's layout and costs three lines of column depth per creature.
#let statfields(..fields) = block(above: sp-5, below: sp-5)[
  #fields.pos().map(f => statline(f.at(0), f.at(1))).join(h(sp-7))
]

// Score, Mod and Save each get a column. Folding the score into the ability cell left
// the header reading "— mod save — mod save" with two empty cells over nothing.
#let ability-table(c) = {
  let ab = c.abilities
  let saves = c.at("saves", default: (:))
  let cells = ()
  for pair in (("str", "int"), ("dex", "wis"), ("con", "cha")) {
    for k in pair {
      let score = ab.at(k)
      let m = ability-mod(score)
      let sv = saves.at(k, default: m)
      cells.push(text(fill: ink, weight: wt-strong)[#upper(k)])
      cells.push(align(center)[#score])
      cells.push(align(center)[#mod-str(m)])
      cells.push(align(center)[#mod-str(sv)])
    }
  }
  // Never split: six rows read as one grid, and half of them at the foot of a column
  // with the rest overleaf is unreadable as a stat line.
  block(above: sp-5, below: sp-5, breakable: false)[
    #set text(size: t-small)
    #data-table(
      columns: (auto, 1fr, 1fr, 1fr, auto, 1fr, 1fr, 1fr),
      aligns: (left, center, center, center, left, center, center, center),
      head: ("", "score", "mod", "save", "", "score", "mod", "save"),
      rows: cells,
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
    place(top, scope: "parent", float: true, clearance: sp-9, block(width: 100%)[
      #img
      #if a.at("credit", default: none) != none {
        text(size: t-micro, fill: ink-faint)[#a.credit]
      }
    ])
  } else {
    block(breakable: false, below: sp-5)[
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
  block(above: sp-5, below: sp-5)[
    #set text(size: t-small)
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

#let action-block(a) = block(below: sp-4)[
  #entry(a.name + recharge-suffix(a), fmt-action-text(a.text))
]

// The site's band: a rule, then the label, then the entries. Its own spacing above and
// below the rule is sp-5 either side, matching `.sb-section`'s mt-3 / pt-3.
//
// `sticky` keeps it with what follows: a bare ACTIONS at the foot of a column, with its
// first action in the next one, is the failure this guards.
// A stat block's band label — TRAITS, ACTIONS. No rule: one divider per band meant a
// page of ruling rather than of structure, and space separates them perfectly well.
//
// `sticky` keeps it with what follows: a bare ACTIONS at the foot of a column, with its
// first action in the next one, is the failure this guards.
#let section-head(s) = block(above: sp-6, below: sp-3, sticky: true)[#label-head(s)]

// A sub-head in running prose. It takes the same air as a section, so a reader gets one
// rhythm for "new topic" instead of two competing ones.
#let subhead(s) = block(above: sp-9, below: sp-2, sticky: true)[#label-head(s)]

#let spellcasting-block(sc) = {
  let ability-full = (
    str: "Strength", dex: "Dexterity", con: "Constitution",
    int: "Intelligence", wis: "Wisdom", cha: "Charisma",
  ).at(sc.ability)
  block(below: sp-3)[
    #entry("Spellcasting", [requires no Material components and uses #ability-full as the
      spellcasting ability (spell save DC #sc.saveDc):])
    #for g in sc.groups {
      let label = if g.usage.type == "atWill" { "At Will:" } else {
        str(g.usage.at("per", default: 1)) + "/Day Each:"
      }
      block(above: sp-2, below: sp-1)[
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
  // A stat block runs tighter than the prose around it — 1.5 against 1.65 on the site
  // — which is much of what makes it read as one object rather than more page.
  set text(size: t-body, fill: ink-soft)
  set par(leading: lead-block)
  block(width: 100%, breakable: true, below: sp-9)[
    // Only the name and its type line are unbreakable. Holding the whole opening
    // together — art, lore, rule, stat header, abilities — made an unsplittable run a
    // third of a column deep, which cannot fit at the foot of one and ends it early.
    #block(breakable: false, width: 100%, below: sp-0)[
      #creature-art(c)
      // Invisible anchor for cref(); metadata is queryable and takes no space.
      #metadata(c.name)#label("c-" + creature-slug(c.name))
      #block(above: sp-0, below: sp-3)[
        #set par(leading: lead-title)
        #text(size: t-title, weight: wt-title, fill: ink, tracking: tr-title)[#c.name]
      ]
      #block(above: sp-0, below: sp-0)[
        #text(size: t-small, style: "italic", fill: ink-faint)[#type-line(c)]
      ]
    ]
    #if c.at("description", default: none) != none {
      block(above: sp-6, below: sp-6)[#c.description]
    }
    // No band rules. The table already draws its own header and row strokes, so a rule
    // under the abilities made two lines where one was doing the work.
    #statfields(
      ("AC", str(c.ac)),
      ("Initiative", mod-str(c.initiative) + " (" + str(10 + c.initiative) + ")"),
      ("HP", str(c.maxHp) + " (" + c.hpFormula.replace("+", " + ").replace("-", " " + minus + " ") + ")"),
      ("Speed", speed-line(c)),
    )
    #ability-table(c)
    #defence-lines(c)

    #let traits = c.at("traits", default: ())
    #if traits.len() > 0 {
      section-head("Traits")
      for t in traits { block(below: sp-4)[#entry(t.name, fmt-action-text(t.text))] }
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
      block(below: sp-3)[
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
  width: 100%, breakable: true, below: sp-9,
  inset: (left: in-bar, top: sp-5, bottom: sp-5),
  stroke: (left: r-heavy + accent),
)[
  #set text(size: t-small, fill: ink-soft)
  #body
]

// ----------------------------------------------------------- encounter ---
#let encounter(name: "", levels: "", xp: "", terrain: [], roster: (), idea: []) = {
  block(width: 100%, breakable: true, below: sp-9)[
    #block(breakable: false, width: 100%)[
      // The seed's name is its own `## heading`, so `encounter()` is normally called
      // with none. Rendering an empty title block left a title's worth of space under
      // the heading with nothing in it.
      #if name != "" {
        block(above: sp-0, below: sp-3)[
          #text(size: t-title, weight: wt-title, fill: ink, tracking: tr-title)[#name]
        ]
      }
      #block(above: sp-0, below: sp-3)[
        #text(size: t-small, weight: wt-strong, fill: accent)[Levels #levels · #xp XP]
      ]
      #hrule(above: sp-0, below: sp-3)
      #set text(size: t-small)
      #entry("Terrain", terrain)
    ]
    #set text(size: t-small)
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
  place(top, scope: "parent", float: true, clearance: sp-9, block(width: 100%)[
    #block(above: sp-0, below: sp-1)[
      #text(size: t-micro, weight: wt-strong, fill: accent, tracking: tr-label)[
        #upper(if eyebrow != auto { eyebrow }
               else if number == none { "Appendix" }
               else { "Chapter " + str(number) })
      ]
    ]
    #block(above: sp-0, below: sp-3)[
      #text(size: t-chapter, weight: wt-title, fill: ink, tracking: tr-title)[#title]
    ]
    #hrule(weight: r-heavy, above: sp-0, below: sp-0)
  ])
  if intro != [] {
    block(below: sp-8)[#set text(size: t-body, fill: ink-soft); #intro]
  }
}

#let section(title, body) = {
  block(width: 100%, breakable: true, above: sp-9, below: sp-9)[
    #block(breakable: false)[
      #text(size: t-title, weight: wt-title, fill: ink, tracking: tr-title)[#title]
      #hrule()
    ]
    #body
  ]
}

// A table that spans both columns.
#let wide(body) = place(top, scope: "parent", float: true, clearance: sp-9, block(width: 100%)[#body])

// The heading of a wide section. Its own role because generate-print.mjs emits it, and
// a size written into a JavaScript string is a size the type scale cannot reach.
#let wide-head(s) = {
  text(size: t-title, weight: wt-title, fill: ink, tracking: tr-title)[#s]
  hrule()
}

// ------------------------------------------------------------------ cover ---
#let cover(title: "", subtitle: "", lede: [], meta: []) = page(
  columns: 1, margin: cover-margin, header: none, footer: none,
)[
  #block(above: sp-0, below: cover-gap)[
    #text(size: t-small, weight: wt-strong, fill: accent, tracking: tr-label)[OPENFRAY · COMPENDIUM]
  ]
  #block(above: sp-0, below: sp-6)[
    // Poster type needs the display leading; on the body's 0.65em a two-line cover
    // title opens a gap the width of a paragraph between its own lines.
    #set par(leading: lead-display)
    #text(size: d-cover, weight: wt-title, fill: ink, tracking: tr-title)[#title]
  ]
  #block(above: sp-0, below: sp-9)[#text(size: d-cover-sub, fill: ink-soft)[#subtitle]]
  #block(above: sp-0, below: sp-9)[#line(length: cover-rule, stroke: r-heavy + accent)]
  #block(above: sp-0, below: sp-0, width: 84%)[#text(size: t-large, fill: ink-soft)[#lede]]
  // The one spacer that isn't rhythm: it pushes the imprint to the foot of the page.
  #v(1fr)
  #hrule(weight: r-hair, color: rule-col, above: sp-0, below: sp-6)
  #text(size: t-body, fill: ink-soft)[#meta]
]

// -------------------------------------------------------------- end page ---
// A single-column page of its own, like the cover. As a float on a two-column page it
// crammed everything into the top third and left the rest blank.
#let endpage(body) = page(
  columns: 1, margin: cover-margin, header: none, footer: none,
)[#body]

// -------------------------------------------------------- document setup ---
#let book(title: "", subtitle: "", doc) = {
  set document(title: title, description: subtitle)
  set page(
    paper: "a4",
    margin: page-margin,
    columns: 2,
    footer: context {
      set text(size: t-micro, fill: ink-faint)
      grid(
        columns: (1fr, auto, 1fr),
        align(left)[#title],
        align(center)[#counter(page).display()],
        align(right)[openfray.app],
      )
    },
  )
  // Body prose is `--muted` on the site, not `--text`. Setting it in `ink` is most of
  // why the first proof read heavier than the edition it copies; `ink` is for headings
  // and for a bold lead-in inside a paragraph.
  set text(font: body-font, size: t-body, fill: ink-soft, lang: "en", region: "us")
  set par(justify: false, leading: lead-body, spacing: sp-7)
  show link: it => text(fill: accent, it)
  show strong: it => text(fill: ink, weight: wt-strong, it)

  doc
}
