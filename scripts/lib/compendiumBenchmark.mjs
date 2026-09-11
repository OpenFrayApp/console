// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

/** Return the content type for a production-build asset. */
export function contentType(path) {
  if (path.endsWith('.html')) return 'text/html; charset=utf-8'
  if (path.endsWith('.js')) return 'text/javascript; charset=utf-8'
  if (path.endsWith('.css')) return 'text/css; charset=utf-8'
  if (path.endsWith('.json')) return 'application/json; charset=utf-8'
  if (path.endsWith('.svg')) return 'image/svg+xml'
  if (path.endsWith('.png')) return 'image/png'
  if (path.endsWith('.webmanifest')) return 'application/manifest+json'
  return 'application/octet-stream'
}

/** Return a percentile from a non-empty sample using the nearest-rank method. */
export function percentile(samples, quantile) {
  const sorted = [...samples].sort((left, right) => left - right)
  return sorted[Math.ceil(sorted.length * quantile) - 1]
}

/** Summarize raw timing samples without hiding the worst run. */
export function summarize(samples) {
  return {
    samplesMs: samples.map((sample) => Number(sample.toFixed(1))),
    medianMs: Number(percentile(samples, 0.5).toFixed(1)),
    p90Ms: Number(percentile(samples, 0.9).toFixed(1)),
    maxMs: Number(Math.max(...samples).toFixed(1)),
  }
}

/** Whether all constrained-search acceptance thresholds passed. */
export function meetsThresholds(passes) {
  return passes.coldTarget && passes.coldLimit && passes.warmLimit
}
