// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

// The callout drawing for annotate-screenshot, which marks up a PNG captured by hand
// (screens that need a signed-in account or a browser extension). The scripted shots
// come from the Python harness in scripts/screenshots/, which draws the same style.

// Runs in the page so callouts line up with real elements. `items` carry rects
// already measured by Playwright, plus the label to attach.
export function drawAnnotations(items) {
  const RED = '#E5484A'
  document.getElementById('of-annotations')?.remove()

  const layer = document.createElement('div')
  layer.id = 'of-annotations'
  layer.style.cssText =
    'position:fixed;inset:0;z-index:2147483647;pointer-events:none;' +
    'font:600 15px/1.2 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif'
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;overflow:visible')
  layer.append(svg)
  document.body.append(layer)

  const MARGIN = 10
  const vw = window.innerWidth
  const vh = window.innerHeight
  const placed = []
  /** Whether two rects collide, counting anything within 8px as touching. */
  const hits = (a, b) =>
    a.x < b.x + b.w + 8 && a.x + a.w + 8 > b.x && a.y < b.y + b.h + 8 && a.y + a.h + 8 > b.y

  // Every box is drawn before any label is positioned, so a label can't be parked
  // on top of a box that hasn't been drawn yet.
  const boxes = items.map((item) => {
    // Boxes sit `pad` outside the element. Adjacent regions (the console's three
    // columns) need a negative pad so their borders don't collide.
    const pad = item.pad ?? 6
    const r = {
      left: item.rect.x - window.scrollX - pad,
      top: item.rect.y - window.scrollY - pad,
      width: item.rect.width + pad * 2,
      height: item.rect.height + pad * 2,
    }
    r.right = r.left + r.width
    r.bottom = r.top + r.height

    if (item.box !== false) {
      const box = document.createElement('div')
      box.dataset.ofMark = '1'
      box.style.cssText =
        `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;` +
        `border:${item.weight ?? 3}px solid ${RED};border-radius:${item.radius ?? 10}px`
      layer.append(box)
      placed.push({ x: r.left, y: r.top, w: r.width, h: r.height })
    }
    return r
  })

  for (const [i, item] of items.entries()) {
    const r = boxes[i]

    if (item.n == null && !item.text) continue

    // A bare number sits inside the region, keyed to a legend in the prose. `badge`
    // picks which corner, and dx/dy nudge it into whatever part of that region is
    // empty — a number dropped on a fixed corner lands on top of the UI.
    if (item.place === 'corner') {
      const badge = document.createElement('div')
      badge.dataset.ofMark = '1'
      badge.textContent = String(item.n)
      const corner = item.badge ?? 'tl'
      const inset = 9
      const rawX = corner.includes('r') ? r.right - 30 - inset : r.left + inset
      const rawY = corner.startsWith('b') ? r.bottom - 30 - inset : r.top + inset
      // Clamped, or a region flush with the viewport edge gets its badge cropped.
      const bx = Math.min(Math.max(rawX + (item.badgeDx ?? 0), 4), vw - 34)
      const by = Math.min(Math.max(rawY + (item.badgeDy ?? 0), 4), vh - 34)
      badge.style.cssText =
        `position:fixed;left:${bx}px;top:${by}px;width:30px;height:30px;` +
        `display:flex;align-items:center;justify-content:center;border-radius:999px;` +
        `background:${RED};color:#fff;font-size:16px;font-weight:800`
      layer.append(badge)
      continue
    }

    const pill = document.createElement('div')
    pill.dataset.ofMark = '1'
    pill.style.cssText =
      'position:fixed;display:inline-flex;align-items:center;gap:8px;white-space:nowrap;' +
      `background:${RED};color:#fff;padding:7px 13px;border-radius:999px;` +
      'box-shadow:0 2px 10px rgba(0,0,0,.45);letter-spacing:.01em'
    if (item.n != null) {
      const badge = document.createElement('span')
      badge.textContent = String(item.n)
      badge.style.cssText =
        'display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;' +
        `border-radius:999px;background:#fff;color:${RED};font-size:13px;font-weight:800`
      pill.append(badge)
    }
    if (item.text) pill.append(document.createTextNode(item.text))
    layer.append(pill)

    const pw = pill.offsetWidth
    const ph = pill.offsetHeight

    // Place outside the box, flipping to the opposite side when it would fall
    // off-screen, then step further out until it stops colliding with earlier marks.
    let place = item.place ?? 'right'
    const room = {
      right: vw - r.right,
      left: r.left,
      top: r.top,
      bottom: vh - r.bottom,
    }
    const need = place === 'left' || place === 'right' ? pw + MARGIN : ph + MARGIN
    if (room[place] < need + 24) {
      const flip = { right: 'left', left: 'right', top: 'bottom', bottom: 'top' }[place]
      if (room[flip] >= need + 24) place = flip
    }

    const step = place === 'left' || place === 'right' ? pw + 16 : ph + 14
    let gap = item.gap ?? 40
    let x
    let y
    for (let i = 0; i < 8; i++) {
      if (place === 'right' || place === 'left') {
        x = place === 'right' ? r.right + gap : r.left - gap - pw
        y = r.top + r.height / 2 - ph / 2
      } else {
        x = r.left + r.width / 2 - pw / 2
        y = place === 'top' ? r.top - gap - ph : r.bottom + gap
      }
      x = Math.min(Math.max(x, MARGIN), vw - pw - MARGIN)
      y = Math.min(Math.max(y, MARGIN), vh - ph - MARGIN)
      if (!placed.some((p) => hits({ x, y, w: pw, h: ph }, p))) break
      gap += step
    }
    pill.style.left = `${x}px`
    pill.style.top = `${y}px`
    placed.push({ x, y, w: pw, h: ph })

    // Arrow from the pill's near edge to the nearest point on the box.
    const from = {
      right: { x, y: y + ph / 2 },
      left: { x: x + pw, y: y + ph / 2 },
      top: { x: x + pw / 2, y: y + ph },
      bottom: { x: x + pw / 2, y },
    }[place]
    const to = {
      right: { x: r.right, y: Math.min(Math.max(from.y, r.top + 8), r.bottom - 8) },
      left: { x: r.left, y: Math.min(Math.max(from.y, r.top + 8), r.bottom - 8) },
      top: { x: Math.min(Math.max(from.x, r.left + 8), r.right - 8), y: r.top },
      bottom: { x: Math.min(Math.max(from.x, r.left + 8), r.right - 8), y: r.bottom },
    }[place]

    const dx = to.x - from.x
    const dy = to.y - from.y
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len
    const uy = dy / len
    const tip = { x: to.x - ux * 3, y: to.y - uy * 3 }
    const base = { x: tip.x - ux * 13, y: tip.y - uy * 13 }

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', from.x)
    line.setAttribute('y1', from.y)
    line.setAttribute('x2', base.x)
    line.setAttribute('y2', base.y)
    line.setAttribute('stroke', RED)
    line.setAttribute('stroke-width', '3.5')
    line.setAttribute('stroke-linecap', 'round')
    svg.append(line)

    const head = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    head.setAttribute(
      'points',
      [
        `${tip.x},${tip.y}`,
        `${base.x - uy * 6},${base.y + ux * 6}`,
        `${base.x + uy * 6},${base.y - ux * 6}`,
      ].join(' '),
    )
    head.setAttribute('fill', RED)
    svg.append(head)
  }
}
