// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import type { SetupTask } from './useTutorialSetup.ts'

const FOCUSABLE = 'button, input, select, textarea, summary, a[href], [tabindex]'
const CANCEL = '[aria-label="Close"], [data-tutorial-cancel]'

/** Exclude hidden duplicates and off-screen panes while retaining scrolled form controls. */
function visible(element: HTMLElement): boolean {
  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    const style = getComputedStyle(node)
    if (style.display === 'none' || style.visibility === 'hidden' || node.hidden) return false
  }
  const box = element.getBoundingClientRect()
  return box.width > 0 && box.height > 0 && box.right > 0 && box.left < innerWidth
}

/** Find the normal task surface, preferring its open form over a cancellation trigger. */
function taskTargets(task: SetupTask, ogreId?: string): HTMLElement[] {
  /** Collect the visible instances of a normal task control. */
  const find = (selector: string) =>
    [...document.querySelectorAll<HTMLElement>(selector)].filter(visible)
  if (task === 'ready' || task === 'complete') return []
  if (task === 'stop') return find('[aria-label="Stop"]')
  if (task === 'clear') return find('[aria-label="Remove everyone and clear the log"]')
  if (task === 'recap') return find('[role="dialog"][aria-label="Combat recap"]')
  if (task === 'end-prompt') return find('[role="dialog"][aria-label="End combat?"]')
  if (task === 'death-save')
    return [...find('[data-tutorial="death-save"]'), ...find('[aria-label="Next turn"]')]
  if (task === 'turn') return find('[aria-label="Next turn"]')
  if (task === 'spell') {
    const modal = find('[role="dialog"]').filter((node) =>
      ['Mage casts Fireball', 'Mage · Fireball'].includes(node.getAttribute('aria-label') ?? ''),
    )
    return modal.length ? modal : find('[data-tutorial-spell$=":fireball"]')
  }
  if (task === 'attack') {
    const modal = find('[role="dialog"]').filter((node) =>
      node.getAttribute('aria-label')?.endsWith(' · Javelin'),
    )
    return modal.length ? modal : find('[data-tutorial-action="Javelin"]')
  }
  if (task === 'prone') {
    const modal = find('[role="dialog"]').filter((node) =>
      node.getAttribute('aria-label')?.startsWith('Apply effect to '),
    )
    if (modal.length)
      return modal.flatMap((node) => [
        ...node.querySelectorAll<HTMLElement>(
          '[data-tutorial-condition="Prone"], [data-tutorial="effect-apply"]',
        ),
      ])
    return find('[data-tutorial="apply-effect"]')
  }
  if (task === 'damage') return find(`[data-tutorial-hp="${ogreId}"]`)
  if (task === 'initiative') return find('[data-tutorial="initiative"]')
  if (task === 'roster-create') {
    const modal = find('[role="dialog"][aria-label="New player character"]')
    return modal.length ? modal : find('[data-tutorial="roster-create"]')
  }
  if (task === 'roster-add') return find('[data-tutorial="roster-add"]')
  if (task === 'begin') return find('[aria-label="Begin"]')
  const scope = task === 'pc' ? 'pc' : task === 'quick' ? 'quick' : 'creature'
  const controls = [...document.querySelectorAll<HTMLElement>(`[data-tutorial="${scope}"]`)]
  for (const control of controls) {
    const form = control.querySelector<HTMLElement>('form')
    const search = control.querySelector<HTMLElement>('input[type="search"]')
    if (form && visible(form)) return [form]
    if (search && visible(search)) return [search.parentElement!]
  }
  const triggers = controls
    .flatMap((control) => [...control.querySelectorAll<HTMLElement>(':scope > button')])
    .filter(visible)
  if (triggers.length) return triggers
  const item = find(`[data-tutorial-add="${scope}"]`)
  return item.length ? item : find('[aria-label="Add to the encounter"]')
}

/** Restrict real controls to the current task and Exit, and track their changing browser geometry. */
export function TutorialSpotlight({
  task,
  guideRef,
  onExit,
  ogreId,
}: {
  task: SetupTask
  ogreId?: string
  onExit: () => void
  guideRef: RefObject<HTMLElement | null>
}) {
  const [bounds, setBounds] = useState<{
    left: number
    top: number
    width: number
    height: number
  } | null>(null)
  const [missing, setMissing] = useState(false)
  const taskRef = useRef(task)
  taskRef.current = task

  useLayoutEffect(() => {
    const inerted = new Set<HTMLElement>()
    let frame = 0
    let revealed: HTMLElement | null = null
    /** Re-enable only branches that contain an allowed task or guide surface. */
    const restore = () => {
      for (const node of inerted) node.inert = false
      inerted.clear()
    }
    /** Recompute visible targets after dialogs, sheets, scrolling, and shell changes. */
    const refresh = () => {
      restore()
      const targets = taskTargets(taskRef.current, ogreId)
      const guide = guideRef.current
      // A departing dialog may restore focus before the new guide's ref is attached.
      if (guide) guide.inert = false
      const allowed = [...targets, ...(guide ? [guide] : [])]
      const pending = !['ready', 'complete'].includes(taskRef.current) && targets.length === 0
      setMissing(pending)
      if (guide)
        document.body.style.setProperty(
          '--tutorial-h',
          `${guide.getBoundingClientRect().height + 16}px`,
        )
      /** Make unrelated branches inert without disabling an allowed descendant. */
      const restrict = (parent: HTMLElement) => {
        for (const child of parent.children) {
          if (
            !(child instanceof HTMLElement) ||
            child.matches('[data-tutorial-shade], [data-tutorial-guide]')
          )
            continue
          if (allowed.includes(child)) continue
          if (
            child.hasAttribute('data-console-root') ||
            allowed.some((node) => child.contains(node))
          )
            restrict(child)
          else if (!child.inert) {
            child.inert = true
            inerted.add(child)
          }
        }
      }
      restrict(document.body)
      for (const target of targets) {
        for (const cancel of target.querySelectorAll<HTMLElement>(CANCEL)) {
          cancel.inert = true
          inerted.add(cancel)
        }
      }
      const first = targets[0]
      let clipped = false
      for (
        let parent =
          taskRef.current === 'spell' && !first?.matches('[role="dialog"]')
            ? first?.parentElement
            : null;
        parent;
        parent = parent.parentElement
      ) {
        if (
          parent.scrollHeight <= parent.clientHeight ||
          !/auto|scroll/.test(getComputedStyle(parent).overflowY)
        )
          continue
        const box = first.getBoundingClientRect()
        const panel = parent.getBoundingClientRect()
        clipped = box.top < panel.top || box.bottom > panel.bottom
        break
      }
      if (first && (first !== revealed || clipped)) {
        revealed = first
        first.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
      }
      if (targets.length) {
        const boxes = targets.map((node) => node.getBoundingClientRect())
        const left = Math.max(0, Math.min(...boxes.map((box) => box.left)) - 4)
        const top = Math.max(0, Math.min(...boxes.map((box) => box.top)) - 4)
        const right = Math.min(innerWidth, Math.max(...boxes.map((box) => box.right)) + 4)
        const bottom = Math.min(innerHeight, Math.max(...boxes.map((box) => box.bottom)) + 4)
        setBounds((old) =>
          old &&
          old.left === left &&
          old.top === top &&
          old.width === right - left &&
          old.height === bottom - top
            ? old
            : { left, top, width: right - left, height: bottom - top },
        )
      } else setBounds(null)
      if (!allowed.some((node) => node.contains(document.activeElement))) {
        const cast =
          taskRef.current === 'spell'
            ? first?.querySelector<HTMLElement>('[data-tutorial="spell-cast"]')
            : null
        const focus =
          cast ??
          targets
            .flatMap((node) =>
              node.matches(FOCUSABLE) ? [node] : [...node.querySelectorAll<HTMLElement>(FOCUSABLE)],
            )
            .find((node) => visible(node) && !node.closest(CANCEL) && !node.matches(':disabled'))
        ;(focus ?? guide?.querySelector<HTMLElement>('button'))?.focus()
      }
    }
    /** Block cancellation and unrelated pointer routes before ordinary app listeners run. */
    const blockPointer = (event: Event) => {
      const target = event.target as HTMLElement
      if (guideRef.current?.contains(target)) return
      if (
        !target.closest(CANCEL) &&
        taskTargets(taskRef.current, ogreId).some((node) => node.contains(target))
      )
        return
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    /** Allow scrolling a task's containing panel without enabling its other controls. */
    const allowTaskScroll = (event: Event) => {
      const target = event.target as HTMLElement
      if (guideRef.current?.contains(target)) return
      const targets = taskTargets(taskRef.current, ogreId)
      const panel = target.closest('[role="dialog"]')
      if (targets.some((node) => node.contains(target) || panel?.contains(node))) return
      for (let node: HTMLElement | null = target; node; node = node.parentElement) {
        if (
          node.scrollHeight > node.clientHeight &&
          /auto|scroll/.test(getComputedStyle(node).overflowY) &&
          targets.some((task) => node!.contains(task))
        )
          return
      }
      blockPointer(event)
    }
    /** Keep keyboard focus among task controls and Exit, blocking dismissal shortcuts. */
    const blockKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        onExit()
        return
      }
      if (event.key !== 'Tab') {
        const target = event.target as HTMLElement
        if (
          !guideRef.current?.contains(target) &&
          (target.closest(CANCEL) ||
            !taskTargets(taskRef.current, ogreId).some((node) => node.contains(target)))
        ) {
          event.preventDefault()
          event.stopImmediatePropagation()
        }
        return
      }
      const roots = [
        ...taskTargets(taskRef.current, ogreId),
        ...(guideRef.current ? [guideRef.current] : []),
      ]
      const controls = roots
        .flatMap((node) =>
          node.matches(FOCUSABLE) ? [node] : [...node.querySelectorAll<HTMLElement>(FOCUSABLE)],
        )
        .filter(
          (node) =>
            visible(node) &&
            !node.closest(CANCEL) &&
            !node.matches(':disabled') &&
            node.tabIndex >= 0,
        )
      if (!controls.length) return
      const index = controls.indexOf(document.activeElement as HTMLElement)
      const next = (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length
      event.preventDefault()
      event.stopImmediatePropagation()
      controls[next].focus()
    }
    /** Reveal the task again when a changed shell moves it within its scrolling panel. */
    const resize = () => {
      revealed = null
      refresh()
    }
    /** Return escaped programmatic focus to the current task. */
    const containFocus = () => refresh()
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(refresh)
    })
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'hidden', 'open'],
    })
    refresh()
    window.addEventListener('resize', resize)
    document.addEventListener('scroll', refresh, true)
    document.addEventListener('focusin', containFocus)
    for (const event of ['pointerdown', 'click', 'dblclick'])
      document.addEventListener(event, blockPointer, true)
    for (const event of ['wheel', 'touchmove'])
      document.addEventListener(event, allowTaskScroll, { capture: true, passive: false })
    window.addEventListener('keydown', blockKey, true)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      restore()
      document.body.style.removeProperty('--tutorial-h')
      window.removeEventListener('resize', resize)
      document.removeEventListener('scroll', refresh, true)
      document.removeEventListener('focusin', containFocus)
      for (const event of ['pointerdown', 'click', 'dblclick'])
        document.removeEventListener(event, blockPointer, true)
      for (const event of ['wheel', 'touchmove'])
        document.removeEventListener(event, allowTaskScroll, true)
      window.removeEventListener('keydown', blockKey, true)
    }
  }, [task, guideRef, onExit, ogreId])

  return (
    <>
      <div
        data-tutorial-shade
        aria-hidden="true"
        className="pointer-events-none fixed z-[60] rounded-lg"
        style={
          bounds
            ? {
                ...bounds,
                boxShadow: '0 0 0 9999px rgb(2 6 23 / 0.6)',
                outline: '2px solid #818cf8',
              }
            : { inset: 0, background: 'rgb(2 6 23 / 0.6)' }
        }
      />
      {missing && (
        <p
          role="status"
          data-tutorial-shade
          className="pointer-events-none fixed inset-x-2 top-2 z-[70] rounded bg-white p-2 text-sm text-slate-900 dark:bg-slate-900 dark:text-slate-100"
        >
          The task control is not visible yet. Wait for loading, or resize the screen. Exit tutorial
          is still available.
        </p>
      )}
    </>
  )
}
