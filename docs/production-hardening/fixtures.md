# Canonical hardening fixtures

The EF-1 corpus provides shared inputs for later hardening checks. Every fixture is
synthetic and safe to include in test output. The catalog lives at
`tests/fixtures/hardening/catalog.json`.

## Canonical identities

| Fixture class    | Stable identity                 | File                    | Coverage                                                                                                       |
| ---------------- | ------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| Hostile          | `hardening.hostile.v1`          | `hostile.json`          | Unknown keys, a future version, oversized input, and prototype-pollution keys                                  |
| Malformed        | `hardening.malformed.v1`        | `malformed.json`        | Malformed children, truncated JSON, and invalid aggregate discriminators                                       |
| Legacy           | `hardening.legacy.v1`           | `legacy.json`           | A version 1 session and the legacy `consumeOnRoll` effect duration                                             |
| Recovery         | `hardening.recovery.v1`         | `recovery.json`         | Current and previous copies, divergent revisions, and quarantine                                               |
| Publication      | `hardening.publication.v2`      | `publication.json`      | Encounter and creature publication, private-field exclusion, licensing, missing content, and unsupported kinds |
| Tenant isolation | `hardening.tenant-isolation.v1` | `tenant-isolation.json` | Owner access, cross-tenant denial, and anonymous denial                                                        |
| Performance      | `hardening.performance.20.v1`   | `performance-20.json`   | 20 combatants and 240 log entries                                                                              |
| Performance      | `hardening.performance.100.v1`  | `performance-100.json`  | 100 combatants and 240 log entries                                                                             |

The performance encounters include effects, resource state, damage relations, and
initiative ties. Their log entries and game text use synthetic labels.

The oversized case is a deterministic materialization descriptor. A consumer repeats
its one-byte character to `byteLength`. This keeps the stored fixture small while
producing the same input bytes in every check.

## Identity and hashes

A fixture identity names one canonical input. The catalog records the SHA-256 hash of
its exact file bytes. Run the validator before accepting evidence:

```bash
npm run validate:fixtures
```

Changing fixture bytes requires a new identity and hash. Keep an old fixture while
accepted evidence still names its identity. Evidence tied to a replaced or removed
hash is stale and must be regenerated.

## Privacy review

The corpus uses only synthetic creature names, events, device labels, and tenant
aliases. It contains no real account identifiers, share capabilities, credentials,
secrets, contact details, or production encounter text.

The validator requires synthetic provenance and rejects credential-shaped keys, email
addresses, UUIDs, bearer values, JSON Web Tokens, and common secret prefixes. This
check supplements source review. Review fixture text before changing a catalog hash.
