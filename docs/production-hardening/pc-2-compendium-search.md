# PC-2 compendium search evidence

Issue [#41](https://github.com/OpenFrayApp/console/issues/41) requires first compendium search to finish within 4.8 seconds on the constrained profile. No run may exceed six seconds. A later search must finish within 200 milliseconds.

## Method

`scripts/benchmark-compendium-search.mjs` serves the production build with deterministic gzip encoding and no browser cache. Each cold sample uses a fresh Chromium context with service workers blocked. Timing starts before filling the creature search and ends after the expected result count renders for another animation frame.

The `pc2-constrained-v1` profile uses these settings:

| Setting      |      Value |
| ------------ | ---------: |
| CPU slowdown |         4× |
| Latency      |     150 ms |
| Download     | 1.6 Mbit/s |
| Upload       | 750 Kbit/s |
| Viewport     | 1280 × 800 |
| Cold samples |         10 |
| Warm samples |         30 |

The fixed searches use Aboleth for cold samples and alternate Aboleth, Goblin, and Zombie for warm samples. Expected counts come from the shipped Basic Rules 2024 creature payload. A missing or empty payload cannot produce a passing result.

## Payload composition

The payload inventory contains all 12 files declared by `LIBRARIES`: 3,011 entries, 6,284,984 raw bytes, and 1,226,273 gzip bytes. The generated artifact hashes match in both reports.

The baseline includes all 12 payloads in the first search. The accepted result includes the four complete spell payloads and the enabled Basic Rules 2024 creature payload. Every creature library remains available when enabled.

| First-search payload   |  Baseline | Accepted result | Change |
| ---------------------- | --------: | --------------: | -----: |
| Files requested        |        12 |               5 |     −7 |
| Gzip bytes transferred | 1,226,273 |         268,995 | −78.1% |

## Results

Both runs used Node 24.15.0, Playwright 1.62.1, Chromium 151.0.7922.34, macOS 25.6.0, and lockfile SHA-256 `c28b53eca8a8a8f0e615feb42f1f1744e1c097895d582602377e85c193d47786`.

| Timing       |   Baseline | Accepted result |          Budget |
| ------------ | ---------: | --------------: | --------------: |
| Cold median  | 6,327.8 ms |      1,804.9 ms | 4,800 ms target |
| Cold p90     | 6,340.8 ms |      1,809.2 ms | 4,800 ms target |
| Cold maximum | 6,348.9 ms |      1,809.3 ms |  6,000 ms limit |
| Warm median  |    16.8 ms |         15.8 ms |    200 ms limit |
| Warm p90     |    17.7 ms |         17.3 ms |    200 ms limit |
| Warm maximum |    42.6 ms |         31.3 ms |    200 ms limit |

The baseline report has SHA-256 `797e09c26fd40f6c004f3970b9b97d6998e345e4ab3f97143c64574573b401dc`. The accepted report has SHA-256 `31aaa85613bb300adfcebc0a8d505f00769835d27ab69bed27458a3f055389dd`. Raw reports remain under the ignored `local/production-hardening/PC-2/` evidence directory.
