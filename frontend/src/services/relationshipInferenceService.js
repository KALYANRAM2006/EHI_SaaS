/**
 * Relationship Inference Service
 *
 * Automatically detects foreign key relationships between data tables.
 * Inspired by Josh Mandel's EHI export tool table relationship detection.
 *
 * Features:
 * - Detects foreign keys by column name patterns
 * - Analyzes data cardinality to verify relationships
 * - Identifies parent-child relationships
 * - Generates visual relationship graph data
 */

/**
 * Common ID field patterns in healthcare data
 */
const ID_PATTERNS = [
  /_id$/i,           // medication_id, patient_id
  /_key$/i,          // encounter_key
  /_number$/i,       // order_number
  /^id$/i,           // id
  /Id$/,             // patientId, encounterId
  /ID$/,             // patientID, orderID
]

/**
 * Known healthcare data relationships
 */
const KNOWN_RELATIONSHIPS = {
  // Medications reference conditions
  'medications.condition': 'conditions.name',
  'medications.conditionId': 'conditions.id',

  // Orders reference medications
  'orders.medicationId': 'medications.id',
  'orders.medication': 'medications.name',

  // Encounters reference providers
  'encounters.providerId': 'careTeam.id',
  'encounters.provider': 'careTeam.name',

  // Results reference orders
  'results.orderId': 'orders.id',
  'results.orderNumber': 'orders.orderNumber',

  // Procedures reference encounters
  'procedures.encounterId': 'encounters.id',
  'procedures.encounterDate': 'encounters.date',
}

/**
 * Check if a field name suggests it's an ID field
 */
function isIdField(fieldName) {
  return ID_PATTERNS.some(pattern => pattern.test(fieldName))
}

/**
 * Extract the referenced table name from an ID field
 * Example: "medication_id" -> "medications"
 */
function extractReferencedTable(idFieldName) {
  // Remove common suffixes
  let baseName = idFieldName
    .replace(/_id$/i, '')
    .replace(/_key$/i, '')
    .replace(/_number$/i, '')
    .replace(/Id$/, '')
    .replace(/ID$/, '')

  // Convert to plural (simple heuristic)
  if (!baseName.endsWith('s')) {
    baseName += 's'
  }

  return baseName
}

/**
 * Analyze cardinality between two fields
 * Returns a score indicating likelihood of foreign key relationship
 */
function analyzeCardinality(sourceData, sourceField, targetData, targetField) {
  if (!sourceData || !targetData || sourceData.length === 0 || targetData.length === 0) {
    return 0
  }

  // Extract values from source field
  const sourceValues = sourceData
    .map(item => item[sourceField])
    .filter(val => val != null && val !== '')

  if (sourceValues.length === 0) return 0

  // Extract values from target field
  const targetValues = new Set(
    targetData
      .map(item => item[targetField])
      .filter(val => val != null && val !== '')
  )

  if (targetValues.size === 0) return 0

  // Count how many source values exist in target
  let matches = 0
  sourceValues.forEach(val => {
    if (targetValues.has(val)) {
      matches++
    }
  })

  // Calculate match percentage
  const matchPercentage = (matches / sourceValues.length) * 100

  // High match percentage suggests foreign key relationship
  return matchPercentage
}

/**
 * Detect relationships between two tables
 */
function detectRelationshipBetweenTables(sourceTable, sourceData, targetTable, targetData) {
  const relationships = []

  if (!sourceData || !targetData || sourceData.length === 0 || targetData.length === 0) {
    return relationships
  }

  // Get sample item to inspect fields
  const sourceSample = sourceData[0]
  const targetSample = targetData[0]

  if (!sourceSample || !targetSample) return relationships

  // Check each field in source table
  Object.keys(sourceSample).forEach(sourceField => {
    // Check if it's an ID field
    if (!isIdField(sourceField)) return

    // Try to infer target table from field name
    const inferredTable = extractReferencedTable(sourceField)

    // If inferred table matches target table
    if (inferredTable.toLowerCase() === targetTable.toLowerCase()) {
      // Check each field in target table
      Object.keys(targetSample).forEach(targetField => {
        if (isIdField(targetField) || targetField === 'id' || targetField === 'name') {
          // Analyze cardinality
          const score = analyzeCardinality(sourceData, sourceField, targetData, targetField)

          // If high match percentage, it's likely a foreign key
          if (score > 50) {
            relationships.push({
              sourceTable,
              sourceField,
              targetTable,
              targetField,
              type: 'foreign_key',
              confidence: Math.round(score),
              cardinality: score > 90 ? 'many-to-one' : 'many-to-many',
            })
          }
        }
      })
    }
  })

  // Check known relationships
  Object.entries(KNOWN_RELATIONSHIPS).forEach(([sourceKey, targetKey]) => {
    const [sTable, sField] = sourceKey.split('.')
    const [tTable, tField] = targetKey.split('.')

    if (sTable === sourceTable && tTable === targetTable) {
      if (sourceSample[sField] && targetSample[tField]) {
        const score = analyzeCardinality(sourceData, sField, targetData, tField)
        if (score > 30) {
          relationships.push({
            sourceTable,
            sourceField: sField,
            targetTable,
            targetField: tField,
            type: 'known_relationship',
            confidence: Math.round(score),
            cardinality: 'many-to-one',
          })
        }
      }
    }
  })

  return relationships
}

/**
 * Infer all relationships in patient data
 *
 * @param {Object} patientData - Patient data object with arrays for each category
 * @returns {Array} Array of relationship objects
 */
export function inferRelationships(patientData) {
  const relationships = []
  const tables = {}

  // Extract all tables (arrays) from patient data
  Object.entries(patientData).forEach(([key, value]) => {
    if (Array.isArray(value) && value.length > 0) {
      tables[key] = value
    }
  })

  const tableNames = Object.keys(tables)

  console.log(`[RelationshipInference] Analyzing ${tableNames.length} tables:`, tableNames)

  // Check each pair of tables
  for (let i = 0; i < tableNames.length; i++) {
    for (let j = 0; j < tableNames.length; j++) {
      if (i === j) continue // Skip same table

      const sourceTable = tableNames[i]
      const targetTable = tableNames[j]
      const sourceData = tables[sourceTable]
      const targetData = tables[targetTable]

      const detected = detectRelationshipBetweenTables(
        sourceTable,
        sourceData,
        targetTable,
        targetData
      )

      relationships.push(...detected)
    }
  }

  console.log(`[RelationshipInference] Found ${relationships.length} relationships`)

  return relationships
}

/**
 * Generate graph data structure for visualization
 *
 * @param {Array} relationships - Array of relationship objects
 * @param {Object} patientData - Patient data for node sizing
 * @returns {Object} Graph with nodes and edges
 */
export function generateRelationshipGraph(relationships, patientData) {
  const nodes = new Map()
  const edges = []

  // Create nodes from patient data
  Object.entries(patientData).forEach(([tableName, data]) => {
    if (Array.isArray(data) && data.length > 0) {
      nodes.set(tableName, {
        id: tableName,
        label: tableName.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()),
        count: data.length,
        type: 'table',
      })
    }
  })

  // Create edges from relationships
  relationships.forEach((rel, index) => {
    edges.push({
      id: `edge-${index}`,
      source: rel.sourceTable,
      target: rel.targetTable,
      label: `${rel.sourceField} → ${rel.targetField}`,
      confidence: rel.confidence,
      type: rel.type,
      cardinality: rel.cardinality,
    })
  })

  return {
    nodes: Array.from(nodes.values()),
    edges,
  }
}

/**
 * Get relationship summary statistics
 */
export function getRelationshipStats(relationships) {
  const stats = {
    total: relationships.length,
    byType: {},
    byConfidence: {
      high: 0,   // >80%
      medium: 0, // 50-80%
      low: 0,    // <50%
    },
    byCardinality: {},
  }

  relationships.forEach(rel => {
    // Count by type
    stats.byType[rel.type] = (stats.byType[rel.type] || 0) + 1

    // Count by confidence
    if (rel.confidence > 80) {
      stats.byConfidence.high++
    } else if (rel.confidence >= 50) {
      stats.byConfidence.medium++
    } else {
      stats.byConfidence.low++
    }

    // Count by cardinality
    stats.byCardinality[rel.cardinality] = (stats.byCardinality[rel.cardinality] || 0) + 1
  })

  return stats
}

/**
 * Find related records across tables
 *
 * Example: Given a medication, find related conditions, encounters, results
 */
export function findRelatedRecords(recordTable, recordId, patientData, relationships) {
  const related = {}

  // Find relationships where this table is the source
  const outgoingRels = relationships.filter(rel => rel.sourceTable === recordTable)

  outgoingRels.forEach(rel => {
    const targetData = patientData[rel.targetTable]
    if (!targetData) return

    // Find matching records
    const matches = targetData.filter(item => {
      // Get the source value from the original record
      const sourceRecord = patientData[recordTable].find(r => r.id === recordId)
      if (!sourceRecord) return false

      const sourceValue = sourceRecord[rel.sourceField]
      const targetValue = item[rel.targetField]

      return sourceValue === targetValue
    })

    if (matches.length > 0) {
      related[rel.targetTable] = matches
    }
  })

  // Find relationships where this table is the target
  const incomingRels = relationships.filter(rel => rel.targetTable === recordTable)

  incomingRels.forEach(rel => {
    const sourceData = patientData[rel.sourceTable]
    if (!sourceData) return

    // Find matching records
    const matches = sourceData.filter(item => {
      const targetRecord = patientData[recordTable].find(r => r.id === recordId)
      if (!targetRecord) return false

      const sourceValue = item[rel.sourceField]
      const targetValue = targetRecord[rel.targetField]

      return sourceValue === targetValue
    })

    if (matches.length > 0) {
      related[rel.sourceTable] = matches
    }
  })

  return related
}

/**
 * Generate human-readable description of a relationship
 */
export function describeRelationship(relationship) {
  const { sourceTable, sourceField, targetTable, targetField, confidence, cardinality } = relationship

  const sourceLabel = sourceTable.replace(/([A-Z])/g, ' $1').toLowerCase()
  const targetLabel = targetTable.replace(/([A-Z])/g, ' $1').toLowerCase()

  let description = `Each ${sourceLabel} record references ${targetLabel} via ${sourceField}`

  if (confidence > 90) {
    description += ' (strong relationship)'
  } else if (confidence > 70) {
    description += ' (likely relationship)'
  } else {
    description += ' (possible relationship)'
  }

  return description
}

/**
 * Export relationships as human-readable text
 */
export function exportRelationshipsAsText(relationships) {
  let text = '# Data Relationships\n\n'

  if (relationships.length === 0) {
    text += 'No relationships detected.\n'
    return text
  }

  // Group by source table
  const bySource = {}
  relationships.forEach(rel => {
    if (!bySource[rel.sourceTable]) {
      bySource[rel.sourceTable] = []
    }
    bySource[rel.sourceTable].push(rel)
  })

  // Format output
  Object.entries(bySource).forEach(([sourceTable, rels]) => {
    const label = sourceTable.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())
    text += `## ${label}\n\n`

    rels.forEach(rel => {
      text += `- **${rel.sourceField}** → ${rel.targetTable}.${rel.targetField}\n`
      text += `  - Confidence: ${rel.confidence}%\n`
      text += `  - Type: ${rel.cardinality}\n\n`
    })
  })

  return text
}
