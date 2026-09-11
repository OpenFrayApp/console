// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

export interface TimingSummary {
  samplesMs: number[]
  medianMs: number
  p90Ms: number
  maxMs: number
}

export interface ThresholdResults {
  coldTarget: boolean
  coldLimit: boolean
  warmLimit: boolean
}

/** Return the content type for a production-build asset. */
export function contentType(path: string): string

/** Return a percentile from a non-empty sample using the nearest-rank method. */
export function percentile(samples: number[], quantile: number): number

/** Summarize raw timing samples without hiding the worst run. */
export function summarize(samples: number[]): TimingSummary

/** Whether all constrained-search acceptance thresholds passed. */
export function meetsThresholds(passes: ThresholdResults): boolean
