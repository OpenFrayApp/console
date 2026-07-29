// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

// Generates the print edition's chapter files from the web edition's sources, so the two
// cannot drift. The MDX in site/src/content/ is the prose; the creature JSON is the
// mechanics; this writes print/chapters/*.typ from both.
//
// What it deliberately does NOT decide is the *arrangement*. Which pages exist, in what
// order, and print-only matter (cover, contents, indexes, the console spread, licensing
// placement) live in print/waking-garden.typ, hand-authored. The two editions share a
// text, not a running order.
//
//   node scripts/generate-print.mjs           # write the chapters
//   node scripts/generate-print.mjs --check   # fail if they are out of date
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const SRC = 'site/src/content/waking-garden'
const OUT = 'print/chapters'

// The web edition calls it a library; print calls it a book. Whole words only, and the
// expected count is asserted below — a substitution keyed to prose is what made the old
// manuscript import unmaintainable, so this fails loudly rather than rewriting silently.
// Counts verified against the sources on 2026-07-28. Chapter titles are not included:
// the spine hand-authors those, so "How to use this library" becomes "How to use this
// book" there rather than here.
const TERMS = [
  { from: /\blibrary\b/g, to: 'book', expect: 4 },
  { from: /\blibraries\b/g, to: 'books', expect: 0 },
]

/** Typst markup shares *bold* and _italic_ with Markdown but claims # and @. */
const escapeTypst = (s) => s.replace(/([#@$\\])/g, '\\$1')

const emphasise = (s) => s.replace(/\*\*([^*]+)\*\*/g, '*$1*')

// A URL is useless on paper. A link to a creature becomes a page reference — the same
// `#c-<slug>` anchor the web uses, resolved by cref() in bestiary.typ. Anything else
// collapses to its text.
//
// Links are lifted out before escaping and put back after, so escapeTypst can't mangle
// the `#cref(…)` this generates.
const inline = (s) => {
  const links = []
  const held = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => {
    links.push({ text, href })
    return `\uE000${links.length - 1}\uE001`
  })
  return emphasise(escapeTypst(held)).replace(/\uE000(\d+)\uE001/g, (_, i) => {
    const { text, href } = links[Number(i)]
    const body = emphasise(escapeTypst(text))
    const anchor = href.match(/#(c-[a-z0-9-]+)$/)
    return anchor ? `#cref("${anchor[1]}", [${body}])` : body
  })
}

/** A Markdown pipe table becomes a Typst table, keeping its alignment row. */
function convertTable(lines) {
  const rows = lines.map((l) =>
    l
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((c) => c.trim()),
  )
  const [head, align, ...body] = rows
  const cols = head.length
  const aligns = align.map((a) =>
    a.startsWith(':') && a.endsWith(':') ? 'center' : a.endsWith(':') ? 'right' : 'left',
  )
  const cell = (c, i) => `align(${aligns[i]})[${inline(c)}]`
  return [
    `#table(`,
    `  columns: ${cols},`,
    `  inset: (x: 3pt, y: 2.4pt),`,
    `  stroke: (x, y) => (bottom: 0.5pt + rule-col),`,
    `  table.header(${head.map((h, i) => `align(${aligns[i]})[#label-head("${h.replace(/"/g, '')}")]`).join(', ')}),`,
    ...body.map(
      (r) =>
        `  ${r
          .map(cell)
          .map((c) => `[#${c}]`)
          .join(', ')},`,
    ),
    `)`,
  ].join('\n')
}

/** Pull `attr="value"` pairs off a JSX-ish opening tag. */
const attrs = (tag) => {
  const out = {}
  for (const m of tag.matchAll(/(\w+)="([^"]*)"/g)) out[m[1]] = m[2]
  return out
}

/** `<Seed level="…">` with `<Fragment slot="…">` children becomes `#encounter(…)`. */
function convertSeed(block) {
  const { level = '' } = attrs(block.match(/<Seed[^>]*>/)[0])
  const slots = {}
  for (const m of block.matchAll(/<Fragment\s+slot="(\w+)"\s*>([\s\S]*?)<\/Fragment>/g)) {
    slots[m[1]] = m[2].trim()
  }
  // The roster is a table in the MDX; print wants it as encounter() rows.
  let roster = '()'
  if (slots.roster) {
    const rows = slots.roster
      .split('\n')
      .filter((l) => l.trim().startsWith('|'))
      .slice(2)
      .map((l) =>
        l
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((c) => c.trim()),
      )
    roster = `(\n${rows.map((r) => `    (${r.map((c) => JSON.stringify(inline(c))).join(', ')}),`).join('\n')}\n  )`
  }
  const [levels = '', xp = ''] = level.split('·').map((s) => s.trim())
  return [
    `#encounter(`,
    `  name: ${JSON.stringify(block.__name ?? '')},`,
    `  levels: ${JSON.stringify(levels.replace(/^Levels?\s*/i, ''))}, xp: ${JSON.stringify(xp.replace(/\s*XP$/i, ''))},`,
    `  terrain: [${blockToTypst(slots.terrain ?? '')}],`,
    `  roster: ${roster},`,
    `  idea: [${blockToTypst(slots.concept ?? '')}],`,
    `)`,
  ].join('\n')
}

/** Markdown body (no components) to Typst markup. */
function blockToTypst(md) {
  const out = []
  const lines = md.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    if (line.trim().startsWith('|')) {
      const t = []
      while (i < lines.length && lines[i].trim().startsWith('|')) t.push(lines[i++])
      out.push(convertTable(t))
      continue
    }
    if (/^[-*]\s/.test(line.trim())) {
      const items = []
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        items.push('- ' + inline(lines[i].trim().replace(/^[-*]\s+/, '')))
        i++
      }
      out.push(items.join('\n'))
      continue
    }
    const para = []
    while (i < lines.length && lines[i].trim() && !lines[i].trim().startsWith('|')) {
      para.push(lines[i].trim())
      i++
    }
    out.push(inline(para.join(' ')))
  }
  return out.join('\n\n')
}

function convertChapter(src) {
  // Anchored to the leading delimiters: a plain split('---') also cuts on the `---`
  // inside every Markdown table separator row, silently truncating the chapter there.
  const parsed = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!parsed) throw new Error('no frontmatter block')
  const [, frontmatter, body] = parsed
  const fm = Object.fromEntries(
    [...frontmatter.matchAll(/^(\w+):\s*'?(.*?)'?\s*$/gm)].map((m) => [m[1], m[2]]),
  )

  // Split the body on the components we map; everything between them is prose. Self-
  // closing and paired tags need separate alternatives: a lazy `.*?/>` on <Group> would
  // stop at the first <Creature … /> nested inside it.
  const parts = []
  const re = /<(Creature|Licensing)\b[^>]*\/>|<(Creature|Seed|Group)\b[^>]*>[\s\S]*?<\/\2>/g
  let last = 0
  let m
  while ((m = re.exec(body))) {
    parts.push({ type: 'md', text: body.slice(last, m.index) })
    parts.push({ type: m[1] ?? m[2], text: m[0] })
    last = m.index + m[0].length
  }
  parts.push({ type: 'md', text: body.slice(last) })

  const out = []
  for (const p of parts) {
    if (p.type === 'md') {
      // Raw HTML wrappers are web layout (`<div class="index-split">` splits the index
      // into two columns). Drop the tags, keep what they wrap — and drop them before
      // anything else, because Typst reads `<…>` as a label and fails on the stray `<`.
      const md = p.text.replace(/^import .*$/gm, '').replace(/^\s*<\/?[a-z][^>]*>\s*$/gm, '')
      // A `## Heading` opens a section that runs to the next heading.
      const chunks = md.split(/^(#{2,4})\s+(.+)$/gm)
      let k = 0
      // chunks alternate: [text, hashes, title, text, hashes, title, …]
      if (chunks[0].trim()) out.push(blockToTypst(chunks[0]))
      k = 1
      while (k < chunks.length) {
        const level = chunks[k].length
        const title = chunks[k + 1].trim()
        const inner = blockToTypst(chunks[k + 2] ?? '')
        if (level === 2) out.push(`#section(${JSON.stringify(title)})[\n${inner}\n]`)
        else out.push(`#section-head(${JSON.stringify(title)})\n${inner}`)
        k += 3
      }
    } else if (p.type === 'Creature') {
      out.push(`#show-creature(${JSON.stringify(attrs(p.text).name)})`)
      // The paired form carries extra rules content — regional effects — under the
      // block. Two creatures use it.
      const paired = p.text.match(/^<Creature[^>]*>([\s\S]*)<\/Creature>$/)
      if (paired) {
        const chunks = paired[1].split(/^(#{2,4})\s+(.+)$/gm)
        if (chunks[0].trim()) out.push(blockToTypst(chunks[0]))
        for (let k = 1; k < chunks.length; k += 3) {
          out.push(`#section-head(${JSON.stringify(chunks[k + 1].trim())})`)
          out.push(blockToTypst(chunks[k + 2] ?? ''))
        }
      }
    } else if (p.type === 'Group') {
      // The web wraps title, prose and creatures in one bordered section. In print the
      // prose introduces the run and the stat blocks follow it at top level — a rule
      // around six stat blocks reads as a box, not as a grouping.
      const inner = p.text.replace(/^<Group[^>]*>|<\/Group>$/g, '')
      const names = [...inner.matchAll(/<Creature\b[^>]*\/>/g)].map((c) => attrs(c[0]).name)
      const prose = inner.replace(/<Creature\b[^>]*\/>/g, '')
      out.push(`#section(${JSON.stringify(attrs(p.text).title ?? '')})[\n${blockToTypst(prose)}\n]`)
      for (const n of names) out.push(`#show-creature(${JSON.stringify(n)})`)
    } else if (p.type === 'Seed') {
      out.push(convertSeed(p.text))
    }
    // <Licensing> is skipped: print carries its own on the end page.
  }
  return { fm, typst: out.filter((s) => s.trim()).join('\n\n') }
}

function applyTerms(text) {
  const problems = []
  for (const { from, to, expect } of TERMS) {
    const hits = [...text.matchAll(from)]
    if (hits.length !== expect) {
      problems.push(
        `"${from.source}" matched ${hits.length} times, expected ${expect}:\n` +
          hits
            .map(
              (h) =>
                `      …${text.slice(Math.max(0, h.index - 45), h.index + 25).replace(/\s+/g, ' ')}…`,
            )
            .join('\n'),
      )
    }
    text = text.replace(from, to)
  }
  return { text, problems }
}

const check = process.argv.includes('--check')
mkdirSync(OUT, { recursive: true })

const files = readdirSync(SRC)
  .filter((f) => f.endsWith('.mdx'))
  .sort()
const written = []
let allProse = ''
for (const f of files) {
  const { fm, typst } = convertChapter(readFileSync(join(SRC, f), 'utf8'))
  allProse += typst
  const header =
    `// Generated by scripts/generate-print.mjs from ${SRC}/${f} — do not edit.\n` +
    `// Chapter order and print-only pages live in print/waking-garden.typ.\n` +
    `#import "../lib.typ": *\n\n`
  written.push({
    name: f.replace(/\.mdx$/, '.typ'),
    order: Number(fm.order),
    fm,
    body: header + typst + '\n',
  })
}

const { problems } = applyTerms(allProse)
if (problems.length) {
  console.error('Term map is out of date — a source edit changed how often a term appears:')
  for (const p of problems) console.error('  ' + p)
  console.error('Review the change, then update TERMS in scripts/generate-print.mjs.')
  process.exit(1)
}

let stale = []
for (const w of written) {
  const dest = join(OUT, w.name)
  const body = applyTerms(w.body).text
  let current = null
  try {
    current = readFileSync(dest, 'utf8')
  } catch {}
  if (current !== body) {
    if (check) stale.push(w.name)
    else writeFileSync(dest, body)
  }
}

if (check) {
  if (stale.length) {
    console.error(`Print chapters are out of date: ${stale.join(', ')}`)
    console.error('Run `npm run print:generate` and commit the result.')
    process.exit(1)
  }
  console.log(`Print check: ${written.length} chapters current.`)
} else {
  console.log(`Generated ${written.length} print chapters -> ${OUT}/`)
}
