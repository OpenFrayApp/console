// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { expect, it } from 'vitest'

it.each(['denied', 'quota'])(
  'preserves the real SDK default memory fallback and guarded cleanup under %s browser storage',
  (mode) => {
    // A fresh SDK instance avoids its process-wide memoized browser-writability probe.
    const script = `
    import assert from 'node:assert/strict';
    const { JSDOM } = await import(${JSON.stringify(pathToFileURL(resolve('node_modules/jsdom/lib/api.js')).href)});
    const dom = new JSDOM('', { url: 'https://fixture.example.test' });
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    const values = new Map();
    const native = { getItem: name => values.get(name) ?? null, setItem: () => { throw new DOMException('blocked', '${mode === 'quota' ? 'QuotaExceededError' : 'SecurityError'}'); }, removeItem: name => values.delete(name) };
    Object.defineProperty(globalThis, 'localStorage', { get: () => ${mode === 'denied' ? "(() => { throw new DOMException('blocked', 'SecurityError') })()" : 'native'} });
    globalThis.fetch = async input => {
      if (String(input).includes('/user')) return Response.json({ id: 'fixture-owner', aud: 'authenticated', user_metadata: {}, app_metadata: {}, created_at: '2026-01-01' });
      if (String(input).includes('/logout')) return Response.json({});
      throw new Error('Unexpected mock request');
    };
    const { createConsoleClient, observeConsoleSession, signOutConsoleSession } = await import(${JSON.stringify(pathToFileURL(resolve('src/auth/sessionTermination.ts')).href)});
    assert.equal(createConsoleClient(undefined, undefined), null);
    const client = createConsoleClient('https://memory-fixture.supabase.test', 'fixture-public-key');
    client.auth.stopAutoRefresh();
    assert.equal((await client.auth.getSession()).data.session, null);
    const access_token = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: 'fixture-owner', exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url'), 'fixture'].join('.');
    assert.equal((await client.auth.setSession({ access_token, refresh_token: 'fixture-refresh' })).error, null);
    const session = (await client.auth.getSession()).data.session;
    assert.equal((await observeConsoleSession(client)).status, 'present');
    assert.equal(values.size, 0);
    await signOutConsoleSession(client, session, () => true);
    assert.equal((await observeConsoleSession(client)).status, 'absent');
    assert.equal((await client.auth.getSession()).data.session, null);
    client.auth.stopAutoRefresh();
    dom.window.close();
    console.log('PASS SDK-selected memory fallback and guarded termination');
    process.exit(0);
  `
    const result = spawnSync(
      process.execPath,
      ['--experimental-strip-types', '--input-type=module', '-e', script],
      { encoding: 'utf8', timeout: 10000 },
    )
    expect(result.stderr).not.toContain('AssertionError')
    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toContain('PASS SDK-selected memory fallback')
  },
)
