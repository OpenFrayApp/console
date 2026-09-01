// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const defaultSpecification = 'docs/production-hardening/specification.md'
const defaultRegistry = 'docs/production-hardening/requirements.json'
const metadataFields = [
  'owner',
  'dependencies',
  'acceptanceCheck',
  'evidenceClass',
  'rollbackCondition',
]
const blockingFields = ['ordinaryRelease', 'hardenedRelease', 'dependentWork']

/** Return every normative requirement identifier declared by the specification. */
function specificationIdentifiers(specification) {
  return [...specification.matchAll(/^\s*-\s+\*\*([A-Z]{2}-\d+):\*\*/gm)].map(
    ([, identifier]) => identifier,
  )
}

/** Add an error when a value is not a non-empty string. */
function requireString(errors, identifier, field, value) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${identifier}: ${field} must be a non-empty string`)
  }
}

/** Return every duplicate identifier in encounter order. */
function duplicateIdentifiers(identifiers) {
  const seen = new Set()
  const duplicates = new Set()
  for (const identifier of identifiers) {
    if (seen.has(identifier)) duplicates.add(identifier)
    seen.add(identifier)
  }
  return [...duplicates]
}

/** Validate one registry entry and append every delivery-metadata error. */
function validateEntry(entry, knownIdentifiers, errors, index) {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    errors.push(`entry ${index + 1} must be an object`)
    return
  }

  const identifier =
    typeof entry.id === 'string' && entry.id.trim() !== '' ? entry.id : `entry ${index + 1}`
  requireString(errors, identifier, 'id', entry.id)
  for (const field of metadataFields) {
    if (field !== 'dependencies') requireString(errors, identifier, field, entry[field])
  }

  if (!Array.isArray(entry.dependencies)) {
    errors.push(`${identifier}: dependencies must be an array`)
  } else {
    const dependencies = entry.dependencies
    for (const dependency of dependencies) {
      if (typeof dependency !== 'string' || !knownIdentifiers.has(dependency)) {
        errors.push(`${identifier}: unknown dependency ${String(dependency)}`)
      }
      if (dependency === entry.id) errors.push(`${identifier}: cannot depend on itself`)
    }
    for (const duplicate of duplicateIdentifiers(dependencies)) {
      errors.push(`${identifier}: duplicate dependency ${duplicate}`)
    }
  }

  if (
    entry.releaseBlocking === null ||
    typeof entry.releaseBlocking !== 'object' ||
    Array.isArray(entry.releaseBlocking)
  ) {
    errors.push(`${identifier}: releaseBlocking must be an object`)
  } else {
    for (const field of blockingFields) {
      if (typeof entry.releaseBlocking[field] !== 'boolean') {
        errors.push(`${identifier}: releaseBlocking.${field} must be a boolean`)
      }
    }
  }
}

/** Validate the specification and registry as one closed set of stable requirements. */
export function validateRequirements(specification, registry) {
  const errors = []
  const specificationIds = specificationIdentifiers(specification)

  if (specificationIds.length === 0) {
    errors.push('specification contains no requirement identifiers')
  }
  for (const duplicate of duplicateIdentifiers(specificationIds)) {
    errors.push(`duplicate specification requirement identifier ${duplicate}`)
  }
  if (!Array.isArray(registry)) {
    return [...errors, 'registry must be an array']
  }

  const knownIdentifiers = new Set(specificationIds)
  const registryIds = registry
    .map((entry) => (entry && typeof entry === 'object' ? entry.id : undefined))
    .filter((identifier) => typeof identifier === 'string')

  for (const duplicate of duplicateIdentifiers(registryIds)) {
    errors.push(`duplicate requirement identifier ${duplicate}`)
  }
  for (const identifier of knownIdentifiers) {
    if (!registryIds.includes(identifier))
      errors.push(`missing requirement identifier ${identifier}`)
  }
  for (const identifier of registryIds) {
    if (!knownIdentifiers.has(identifier))
      errors.push(`unknown requirement identifier ${identifier}`)
  }

  registry.forEach((entry, index) => validateEntry(entry, knownIdentifiers, errors, index))
  return errors
}

/** Read, validate, and report the registry selected by the command line. */
function main() {
  const specificationPath = process.argv[2] ?? defaultSpecification
  const registryPath = process.argv[3] ?? defaultRegistry
  let specification
  let registry

  try {
    specification = readFileSync(specificationPath, 'utf8')
    registry = JSON.parse(readFileSync(registryPath, 'utf8'))
  } catch (error) {
    console.error(`requirement registry validation failed: ${error.message}`)
    process.exitCode = 1
    return
  }

  const errors = validateRequirements(specification, registry)
  if (errors.length > 0) {
    for (const error of errors) console.error(error)
    process.exitCode = 1
    return
  }

  console.log(`Validated ${registry.length} production-hardening requirements.`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
