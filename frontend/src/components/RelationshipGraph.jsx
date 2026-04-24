/**
 * RelationshipGraph - Visual representation of data relationships
 *
 * Shows how different data tables relate to each other through foreign keys.
 * Uses simple SVG visualization (no external graph library needed).
 */

import { useState, useMemo, useEffect } from 'react'
import { GitBranch, Database, Zap, Info, Download, RefreshCw } from 'lucide-react'
import {
  inferRelationships,
  generateRelationshipGraph,
  getRelationshipStats,
  describeRelationship,
  exportRelationshipsAsText,
} from '../services/relationshipInferenceService'

export default function RelationshipGraph({ patientData }) {
  const [relationships, setRelationships] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedRelationship, setSelectedRelationship] = useState(null)

  // Infer relationships when patient data changes
  useEffect(() => {
    if (patientData && !relationships) {
      handleAnalyze()
    }
  }, [patientData])

  const handleAnalyze = () => {
    setAnalyzing(true)
    // Small delay to allow UI to update
    setTimeout(() => {
      try {
        const detected = inferRelationships(patientData)
        setRelationships(detected)
        console.log('[RelationshipGraph] Detected relationships:', detected)
      } catch (error) {
        console.error('[RelationshipGraph] Error analyzing relationships:', error)
      } finally {
        setAnalyzing(false)
      }
    }, 100)
  }

  const handleReanalyze = () => {
    setRelationships(null)
    setSelectedRelationship(null)
    handleAnalyze()
  }

  const handleDownload = () => {
    if (!relationships) return

    const text = exportRelationshipsAsText(relationships)
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'data_relationships.md'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Generate graph data
  const graph = useMemo(() => {
    if (!relationships) return null
    return generateRelationshipGraph(relationships, patientData)
  }, [relationships, patientData])

  // Calculate statistics
  const stats = useMemo(() => {
    if (!relationships) return null
    return getRelationshipStats(relationships)
  }, [relationships])

  if (!patientData) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 text-gray-500">
          <Info className="w-5 h-5" />
          <span>No patient data available</span>
        </div>
      </div>
    )
  }

  if (analyzing) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center gap-3 py-8">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-gray-700">Analyzing data relationships...</span>
        </div>
      </div>
    )
  }

  if (!relationships || relationships.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-bold text-gray-900">Data Relationships</h3>
          </div>
          <button
            onClick={handleAnalyze}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all"
          >
            <Zap className="w-4 h-4" />
            Analyze Relationships
          </button>
        </div>
        <div className="text-center py-8 text-gray-500">
          <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No relationships detected yet.</p>
          <p className="text-sm mt-1">Click "Analyze Relationships" to discover how your data tables connect.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Data Relationships</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={handleReanalyze}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reanalyze
            </button>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
              <div className="text-sm text-blue-700">Total Relationships</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="text-2xl font-bold text-green-900">{stats.byConfidence.high}</div>
              <div className="text-sm text-green-700">High Confidence (&gt;80%)</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <div className="text-2xl font-bold text-amber-900">{stats.byConfidence.medium}</div>
              <div className="text-sm text-amber-700">Medium Confidence (50-80%)</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="text-2xl font-bold text-purple-900">{graph?.nodes.length || 0}</div>
              <div className="text-sm text-purple-700">Data Tables</div>
            </div>
          </div>
        )}
      </div>

      {/* Relationship List */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h4 className="font-semibold text-gray-900">Detected Relationships</h4>
          <p className="text-sm text-gray-500 mt-1">Foreign key relationships found in your health data</p>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {relationships.map((rel, index) => {
              const isSelected = selectedRelationship === index
              const confidenceColor =
                rel.confidence > 80
                  ? 'bg-green-100 text-green-800 border-green-300'
                  : rel.confidence >= 50
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-gray-100 text-gray-800 border-gray-300'

              return (
                <div
                  key={index}
                  className={`border rounded-lg p-4 transition-all cursor-pointer ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedRelationship(isSelected ? null : index)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <GitBranch className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-gray-900">
                          {rel.sourceTable.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="font-semibold text-gray-900">
                          {rel.targetTable.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 font-mono">
                        {rel.sourceField} → {rel.targetField}
                      </div>
                      {isSelected && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-700">{describeRelationship(rel)}</p>
                          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                            <span>Type: {rel.cardinality.replace('-', ' to ')}</span>
                            <span>•</span>
                            <span>Method: {rel.type.replace('_', ' ')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${confidenceColor}`}>
                      {rel.confidence}%
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Visual Graph (Simple Network Diagram) */}
      {graph && graph.nodes.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h4 className="font-semibold text-gray-900">Relationship Diagram</h4>
            <p className="text-sm text-gray-500 mt-1">Visual representation of data connections</p>
          </div>
          <div className="p-6">
            <div className="bg-gray-50 rounded-lg p-8 border border-gray-200">
              <svg width="100%" height="400" className="overflow-visible">
                {/* Simple circular layout */}
                {graph.nodes.map((node, index) => {
                  const angle = (index / graph.nodes.length) * 2 * Math.PI - Math.PI / 2
                  const radius = 150
                  const cx = 300 + radius * Math.cos(angle)
                  const cy = 200 + radius * Math.sin(angle)

                  return (
                    <g key={node.id}>
                      {/* Node circle */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r="40"
                        fill="#3b82f6"
                        stroke="#1e40af"
                        strokeWidth="2"
                        className="cursor-pointer hover:fill-blue-700 transition-colors"
                      />
                      {/* Node label */}
                      <text
                        x={cx}
                        y={cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize="11"
                        fontWeight="600"
                        className="pointer-events-none"
                      >
                        {node.label.length > 12 ? node.label.substring(0, 10) + '...' : node.label}
                      </text>
                      {/* Node count badge */}
                      <text
                        x={cx}
                        y={cy + 12}
                        textAnchor="middle"
                        fill="white"
                        fontSize="9"
                        opacity="0.8"
                        className="pointer-events-none"
                      >
                        ({node.count})
                      </text>
                    </g>
                  )
                })}

                {/* Draw edges */}
                {graph.edges.map((edge, edgeIndex) => {
                  const sourceNode = graph.nodes.find(n => n.id === edge.source)
                  const targetNode = graph.nodes.find(n => n.id === edge.target)

                  if (!sourceNode || !targetNode) return null

                  const sourceIndex = graph.nodes.indexOf(sourceNode)
                  const targetIndex = graph.nodes.indexOf(targetNode)

                  const sourceAngle = (sourceIndex / graph.nodes.length) * 2 * Math.PI - Math.PI / 2
                  const targetAngle = (targetIndex / graph.nodes.length) * 2 * Math.PI - Math.PI / 2

                  const radius = 150
                  const sx = 300 + radius * Math.cos(sourceAngle)
                  const sy = 200 + radius * Math.sin(sourceAngle)
                  const tx = 300 + radius * Math.cos(targetAngle)
                  const ty = 200 + radius * Math.sin(targetAngle)

                  const strokeColor = edge.confidence > 80 ? '#10b981' : edge.confidence >= 50 ? '#f59e0b' : '#9ca3af'

                  return (
                    <g key={edge.id}>
                      {/* Edge line */}
                      <line
                        x1={sx}
                        y1={sy}
                        x2={tx}
                        y2={ty}
                        stroke={strokeColor}
                        strokeWidth="2"
                        strokeDasharray={edge.confidence < 50 ? '5,5' : '0'}
                        opacity="0.6"
                        markerEnd="url(#arrowhead)"
                      />
                    </g>
                  )
                })}

                {/* Arrow marker definition */}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="10"
                    refX="8"
                    refY="3"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="#6b7280" />
                  </marker>
                </defs>
              </svg>

              {/* Legend */}
              <div className="mt-6 flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-green-500" />
                  <span className="text-gray-600">High Confidence (&gt;80%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-amber-500" />
                  <span className="text-gray-600">Medium (50-80%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-gray-400" style={{ strokeDasharray: '5,5' }} />
                  <span className="text-gray-600">Low (&lt;50%)</span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900">
                  <strong>How to read this diagram:</strong> Each circle represents a data table (medications, encounters, etc.).
                  Arrows show relationships between tables based on matching field values. The color indicates how confident
                  we are about the relationship (green = very confident, amber = moderately confident).
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
