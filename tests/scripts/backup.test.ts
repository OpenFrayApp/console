// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'

const repository = new URL('../..', import.meta.url).pathname
const scripts = {
  export: join(repository, 'scripts/backup-supabase.sh'),
  upload: join(repository, 'scripts/upload-encrypted-backup.sh'),
  download: join(repository, 'scripts/download-encrypted-backup.sh'),
  verify: join(repository, 'scripts/verify-encrypted-backup.sh'),
  retain: join(repository, 'scripts/retain-encrypted-backups.sh'),
}

/** Create an isolated executable test double. */
function executable(directory: string, name: string, body: string) {
  const path = join(directory, name)
  writeFileSync(path, `#!/usr/bin/env bash\nset -euo pipefail\n${body}`)
  chmodSync(path, 0o755)
  return path
}

/** Install a deterministic age test double that encrypts and decrypts fixture bytes. */
function fakeAge(directory: string) {
  return executable(
    directory,
    'age',
    `mode=encrypt
output=''
recipient=''
identity=''
input=''
while [[ $# -gt 0 ]]; do
  case "$1" in
    --encrypt) mode=encrypt; shift ;;
    --decrypt) mode=decrypt; shift ;;
    --recipient) recipient="$2"; shift 2 ;;
    --identity) identity="$2"; shift 2 ;;
    --output) output="$2"; shift 2 ;;
    *) input="$1"; shift ;;
  esac
done
if [[ "$mode" == encrypt ]]; then
  [[ "$recipient" == age1* ]] || exit 1
  printf 'AGE-TEST %s\\n' "$recipient" > "$output"
  cat "$input" >> "$output"
else
  read -r marker encrypted_recipient < "$input"
  read -r identity_marker identity_recipient < "$identity"
  [[ "$marker" == AGE-TEST && "$identity_marker" == AGE-TEST-IDENTITY ]]
  [[ "$encrypted_recipient" == "$identity_recipient" ]]
  tail -n +2 "$input" > "$output"
fi`,
  )
}

/** Add isolated command doubles to a stage environment. */
function withTools(directory: string, environment: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return { ...environment, PATH: `${directory}:${process.env.PATH}` }
}

/** Return a complete pg_dump-style SQL body with application data. */
function validDump() {
  const tables = ['campaigns', 'creatures', 'effects', 'encounters', 'players', 'spells']
  const blocks = tables
    .map((table) => `COPY "public"."${table}" ("id") FROM stdin;\n${table}-1\n\\.\n`)
    .join('')
  return `${'-- integrity padding\n'.repeat(80)}${blocks}COPY "auth"."users" ("id") FROM stdin;\nuser-1\n\\.\n`
}

/** Write a deterministic matching identity and recipient for the age test double. */
function ageKeyPair(directory: string) {
  const identity = join(directory, 'identity.txt')
  const recipient = 'age1openfraytestrecipient'
  writeFileSync(identity, `AGE-TEST-IDENTITY ${recipient}\n`)
  return { identity, recipient }
}

/** Create a pg_dump test double backed by a fixture file. */
function pgDump(directory: string) {
  const dump = join(directory, 'dump.sql')
  writeFileSync(dump, validDump())
  return executable(
    directory,
    'pg_dump',
    `if [[ "\${1:-}" == "--version" ]]; then echo 'pg_dump test'; else cat "${dump}"; fi`,
  )
}

/** Run a backup shell stage with an isolated environment overlay. */
function run(script: string, environment: NodeJS.ProcessEnv, args: string[] = []) {
  return spawnSync('bash', [script, ...args], {
    cwd: repository,
    encoding: 'utf8',
    env: { ...process.env, ...environment },
  })
}

describe('encrypted database backup', () => {
  it('fails before export when encryption is missing or invalid', () => {
    const directory = mkdtempSync(join(tmpdir(), 'openfray-backup-'))
    fakeAge(directory)
    const marker = join(directory, 'pg-dump-ran')
    const fakeDump = executable(directory, 'pg_dump', `touch "${marker}"`)

    const missing = run(
      scripts.export,
      withTools(directory, {
        BACKUP_AGE_RECIPIENT: '',
        SUPABASE_DB_URL: 'postgres://unused',
        PG_DUMP: fakeDump,
      }),
      ['--dry-run'],
    )
    expect(missing.status).toBe(1)
    expect(missing.stderr).toContain('missing $BACKUP_AGE_RECIPIENT')
    expect(() => readFileSync(marker)).toThrow()

    const invalid = run(
      scripts.export,
      withTools(directory, {
        BACKUP_AGE_RECIPIENT: 'not-an-age-recipient',
        SUPABASE_DB_URL: 'postgres://unused',
        PG_DUMP: fakeDump,
      }),
      ['--dry-run'],
    )
    expect(invalid.status).toBe(1)
    expect(invalid.stderr).toContain('$BACKUP_AGE_RECIPIENT is invalid')
    expect(() => readFileSync(marker)).toThrow()
  })

  it('rejects decryption and object-storage credentials before export', () => {
    const directory = mkdtempSync(join(tmpdir(), 'openfray-backup-'))
    fakeAge(directory)
    const marker = join(directory, 'pg-dump-ran')
    const fakeDump = executable(directory, 'pg_dump', `touch "${marker}"`)
    const { identity, recipient } = ageKeyPair(directory)
    const base = {
      BACKUP_AGE_RECIPIENT: recipient,
      SUPABASE_DB_URL: 'postgres://unused',
      PG_DUMP: fakeDump,
    }

    const identityResult = run(
      scripts.export,
      withTools(directory, {
        ...base,
        BACKUP_AGE_IDENTITY: readFileSync(identity, 'utf8'),
      }),
      ['--dry-run'],
    )
    expect(identityResult.status).toBe(1)
    expect(identityResult.stderr).toContain('$BACKUP_AGE_IDENTITY must not be available')

    const storageResult = run(
      scripts.export,
      withTools(directory, {
        ...base,
        BACKUP_AGE_IDENTITY: '',
        AWS_ACCESS_KEY_ID: 'storage-token',
      }),
      ['--dry-run'],
    )
    expect(storageResult.status).toBe(1)
    expect(storageResult.stderr).toContain('object-storage credentials must not be available')
    expect(() => readFileSync(marker)).toThrow()
  })

  it('encrypts a verified dry run without object access', () => {
    const directory = mkdtempSync(join(tmpdir(), 'openfray-backup-'))
    fakeAge(directory)
    const { recipient } = ageKeyPair(directory)
    const result = run(
      scripts.export,
      withTools(directory, {
        BACKUP_AGE_RECIPIENT: recipient,
        BACKUP_AGE_IDENTITY: '',
        SUPABASE_DB_URL: 'postgres://test',
        PG_DUMP: pgDump(directory),
        AWS_ACCESS_KEY_ID: '',
        AWS_SECRET_ACCESS_KEY: '',
      }),
      ['--dry-run'],
    )
    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toContain('encryption configuration verified before export')
    expect(result.stdout).toContain('encrypted backup verified and discarded, nothing uploaded')
  })

  it('uploads immutable ciphertext, then applies retention only as a later stage', () => {
    const directory = mkdtempSync(join(tmpdir(), 'openfray-backup-'))
    fakeAge(directory)
    const { recipient } = ageKeyPair(directory)
    const ciphertext = join(directory, 'backup.age')
    const exportOutputs = join(directory, 'export.outputs')
    const uploadOutputs = join(directory, 'upload.outputs')
    const awsLog = join(directory, 'aws.log')
    const oldDeleted = join(directory, 'old-deleted')

    const exported = run(
      scripts.export,
      withTools(directory, {
        BACKUP_AGE_RECIPIENT: recipient,
        BACKUP_AGE_IDENTITY: '',
        SUPABASE_DB_URL: 'postgres://test',
        PG_DUMP: pgDump(directory),
        AWS_ACCESS_KEY_ID: '',
        AWS_SECRET_ACCESS_KEY: '',
        GITHUB_OUTPUT: exportOutputs,
      }),
      ['--output', ciphertext],
    )
    expect(exported.status, exported.stderr).toBe(0)
    const sha256 = readFileSync(exportOutputs, 'utf8').match(/ciphertext_sha256=([a-f0-9]{64})/)![1]

    executable(
      directory,
      'aws',
      `echo "$*" >> "${awsLog}"
if [[ "\${1:-} \${2:-}" == "s3api head-object" ]]; then
  printf '%s\n' "$EXPECTED_BYTES"
fi
if [[ "\${1:-} \${2:-}" == "s3 ls" ]]; then
  printf '2026-09-01 00:00:00 100 %s\\n' "$VERIFIED_NAME"
  [[ -e "${oldDeleted}" ]] || printf '2000-01-01 00:00:00 100 openfray-2000-01-01T00-00-00Z-old-1.sql.gz.age\\n'
fi
if [[ "\${1:-} \${2:-}" == "s3 rm" && "$*" == *openfray-2000-* ]]; then
  touch "${oldDeleted}"
fi`,
    )
    const uploaded = run(scripts.upload, {
      PATH: `${directory}:${process.env.PATH}`,
      BACKUP_CIPHERTEXT_PATH: ciphertext,
      BACKUP_CIPHERTEXT_SHA256: sha256,
      BACKUP_AGE_IDENTITY: '',
      SUPABASE_DB_URL: '',
      R2_BUCKET: 'private-backups',
      R2_ENDPOINT: 'https://objects.invalid',
      AWS_ACCESS_KEY_ID: 'read-write',
      AWS_SECRET_ACCESS_KEY: 'read-write-secret',
      EXPECTED_BYTES: String(readFileSync(ciphertext).byteLength),
      GITHUB_OUTPUT: uploadOutputs,
      GITHUB_RUN_ID: '1234',
      GITHUB_RUN_ATTEMPT: '2',
    })
    expect(uploaded.status, uploaded.stderr).toBe(0)
    const objectKey = readFileSync(uploadOutputs, 'utf8').match(/object_key=(.+)/)![1]
    expect(objectKey).toMatch(
      /^daily\/openfray-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z-1234-2-\d+\.sql\.gz\.age$/,
    )

    const retained = run(scripts.retain, {
      PATH: `${directory}:${process.env.PATH}`,
      VERIFIED_NAME: objectKey.replace('daily/', ''),
      BACKUP_OBJECT_KEY: objectKey,
      BACKUP_AGE_RECIPIENT: recipient,
      BACKUP_AGE_IDENTITY: '',
      SUPABASE_DB_URL: '',
      R2_BUCKET: 'private-backups',
      R2_ENDPOINT: 'https://objects.invalid',
      AWS_ACCESS_KEY_ID: 'read-write',
      AWS_SECRET_ACCESS_KEY: 'read-write-secret',
      EXPECTED_BYTES: '0',
    })
    expect(retained.status, retained.stderr).toBe(0)
    expect(retained.stdout).toContain('retention and deletion permissions verified')
    const log = readFileSync(awsLog, 'utf8')
    expect(log).toMatch(/s3 cp .*\.age s3:\/\/private-backups\/daily\/.*\.age/)
    expect(log).not.toMatch(/s3:\/\/private-backups\/daily\/.*\.sql\.gz(?:\s|$)/)
    expect(log).toContain('s3 rm s3://private-backups/permission-probe/retention-')
    expect(log).toContain(
      's3 rm s3://private-backups/daily/openfray-2000-01-01T00-00-00Z-old-1.sql.gz.age',
    )
  })

  it('downloads with read-only credentials before isolated decryption', () => {
    const directory = mkdtempSync(join(tmpdir(), 'openfray-recovery-'))
    const age = fakeAge(directory)
    const { identity, recipient } = ageKeyPair(directory)
    const compressed = join(directory, 'backup.sql.gz')
    const ciphertext = join(directory, 'stored.age')
    const downloaded = join(directory, 'downloaded.age')
    const awsLog = join(directory, 'aws.log')
    writeFileSync(compressed, gzipSync(validDump()))
    execFileSync(age, ['--encrypt', '--recipient', recipient, '--output', ciphertext, compressed])
    executable(
      directory,
      'aws',
      `echo "$*" >> "${awsLog}"
if [[ "\${1:-} \${2:-}" == "s3api head-object" ]]; then
  printf '%s %s\\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(wc -c < "${ciphertext}")"
elif [[ "\${1:-} \${2:-}" == "s3 cp" ]]; then
  cp "${ciphertext}" "\${4}"
elif [[ "\${1:-} \${2:-}" == "s3api delete-object" || "\${1:-} \${2:-}" == "s3api put-object" ]]; then
  exit 1
fi`,
    )
    const sha256 = createHash('sha256').update(readFileSync(ciphertext)).digest('hex')
    const downloadResult = run(scripts.download, {
      PATH: `${directory}:${process.env.PATH}`,
      BACKUP_OBJECT_KEY: 'daily/openfray-2026-09-01T03-41-00Z-1234-1-99.sql.gz.age',
      BACKUP_CIPHERTEXT_SHA256: sha256,
      BACKUP_CIPHERTEXT_PATH: downloaded,
      BACKUP_AGE_IDENTITY: '',
      R2_BUCKET: 'private-backups',
      R2_ENDPOINT: 'https://objects.invalid',
      AWS_ACCESS_KEY_ID: 'read-only',
      AWS_SECRET_ACCESS_KEY: 'read-only-secret',
    })
    expect(downloadResult.status, downloadResult.stderr).toBe(0)
    expect(downloadResult.stdout).toContain('recovery credential is read-only')
    expect(downloadResult.stdout).toContain('ciphertext is fresh and intact')

    const verifyResult = run(
      scripts.verify,
      withTools(directory, {
        BACKUP_CIPHERTEXT_PATH: downloaded,
        BACKUP_AGE_IDENTITY: readFileSync(identity, 'utf8'),
        AWS_ACCESS_KEY_ID: '',
        AWS_SECRET_ACCESS_KEY: '',
      }),
    )
    expect(verifyResult.status, verifyResult.stderr).toBe(0)
    expect(verifyResult.stdout).toContain('ciphertext is decryptable and recoverable')
  })
})

describe('backup workflow boundary', () => {
  const workflow = readFileSync(join(repository, '.github/workflows/backup.yml'), 'utf8')

  /** Return one named workflow step through the start of the next step or job. */
  function step(name: string) {
    const start = workflow.indexOf(`- name: ${name}`)
    const rest = workflow.slice(start)
    const end = rest.slice(1).search(/\n\s{6}- name:|\n {2}[a-z]+:/)
    return end < 0 ? rest : rest.slice(0, end + 1)
  }

  it('pins every referenced action to an immutable revision', () => {
    const references = [...workflow.matchAll(/^\s*- uses:\s*([^\s#]+)/gm)].map(([, value]) => value)
    expect(references.length).toBeGreaterThan(0)
    for (const reference of references) expect(reference).toMatch(/@[a-f0-9]{40}$/)
  })

  it('validates the complete encryption key pair before backup work starts', () => {
    expect(step('Validate encryption key pair')).toContain('BACKUP_AGE_RECIPIENT')
    expect(step('Validate encryption key pair')).toContain('BACKUP_AGE_IDENTITY')
    expect(step('Validate encryption key pair')).not.toMatch(/SUPABASE_DB_URL|AWS_ACCESS_KEY_ID/)
    expect(workflow).toMatch(/backup:\n\s+needs: encryption-preflight/)
  })

  it('separates export, storage, and decryption credentials', () => {
    expect(step('Export, verify, and encrypt')).toContain('SUPABASE_DB_URL')
    expect(step('Export, verify, and encrypt')).not.toContain('AWS_ACCESS_KEY_ID')
    expect(step('Upload ciphertext')).toContain('R2_BACKUP_ACCESS_KEY_ID')
    expect(step('Upload ciphertext')).not.toMatch(/SUPABASE_DB_URL|BACKUP_AGE_IDENTITY/)
    expect(step('Download and inspect ciphertext')).toContain('R2_RECOVERY_ACCESS_KEY_ID')
    expect(step('Download and inspect ciphertext')).not.toContain('BACKUP_AGE_IDENTITY')
    expect(step('Decrypt and verify recovery')).toContain('BACKUP_AGE_IDENTITY')
    expect(step('Decrypt and verify recovery')).not.toContain('AWS_ACCESS_KEY_ID')
  })

  it('runs retention only after the uploaded object passes recovery', () => {
    expect(workflow).toContain('needs: [backup, recoverability]')
    expect(step('Prove deletion and apply retention')).toContain('retain-encrypted-backups.sh')
    expect(step('Prove deletion and apply retention')).not.toContain('BACKUP_AGE_IDENTITY')
  })
})
