// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/** Compile and run the entrypoint inside an isolated Worker-like JavaScript realm. */
function normalizeInWorker(value: unknown): { status: string } {
  const source = readFileSync(new URL('../../src/publication/index.ts', import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} as Record<string, unknown> }
  const context = vm.createContext({
    module,
    exports: module.exports,
    input: JSON.stringify(value),
    TextEncoder,
    window: undefined,
    document: undefined,
    process: undefined,
    require: undefined,
  })
  new vm.Script(compiled).runInContext(context)
  return new vm.Script('module.exports.normalizePublication(JSON.parse(input))').runInContext(
    context,
  ) as { status: string }
}

describe('publication contract in a Worker-like isolate', () => {
  it('loads and normalizes without browser, Node, or filesystem globals', () => {
    expect(
      normalizeInWorker({
        kind: 'creature',
        data: { v: 1, name: 'Goblin', ref: 'srd-5.2:goblin' },
      }).status,
    ).toBe('ok')
  })
})
