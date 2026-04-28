import { useState, useMemo, useEffect } from 'react'
import {
  CreditCard,
  FileText,
  DollarSign,
  Pill,
  Download,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Info,
  Shield,
  BarChart3,
  ArrowRight,
  Package,
  RefreshCw,
  ExternalLink,
  Clock,
} from 'lucide-react'
import {
  getCoverageSummary,
  detectPriorAuthItems,
  generatePriorAuthBundle,
  downloadPriorAuthPackage,
  analyzeCosts,
  findMedicationSavings,
} from '../services/payerService'
import {
  isCMSApiConfigured,
  getCMSApiStatus,
  getPatientPriorAuths,
  getMockPriorAuths,
  PA_STATUS,
} from '../services/cmsApiService'
import { formatCurrency, formatCoverageDates } from '../utils/insuranceParser'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'

/**
 * PayerToolsView - Insurance & Coverage Tools for EHIgnite Challenge
 *
 * Features:
 * - Insurance coverage summary (USCDI Health Insurance Data Class)
 * - Prior authorization assistant
 * - Cost analysis dashboard
 * - Medication savings opportunities
 * - Benefits verification export
 *
 * All processing is client-side - no PHI sent to servers
 */
export default function PayerToolsView({ selectedPatient, stats }) {
  const [expandedPA, setExpandedPA] = useState({})
  const [cmsAuths, setCmsAuths] = useState([])
  const [loadingCMS, setLoadingCMS] = useState(false)
  const [cmsApiStatus, setCmsApiStatus] = useState(null)

  // Check CMS API status on mount
  useEffect(() => {
    const status = getCMSApiStatus()
    setCmsApiStatus(status)

    // Load prior auths (real or mock)
    if (selectedPatient) {
      loadCMSPriorAuths()
    }
  }, [selectedPatient])

  const loadCMSPriorAuths = async () => {
    setLoadingCMS(true)
    try {
      if (isCMSApiConfigured()) {
        // Try to fetch real data from CMS API
        const auths = await getPatientPriorAuths(selectedPatient.patId || selectedPatient.id)
        setCmsAuths(auths)
      } else {
        // Use mock data for demo
        const mockAuths = getMockPriorAuths()
        setCmsAuths(mockAuths)
      }
    } catch (error) {
      console.error('[PayerTools] Error loading CMS prior auths:', error)
      // Fallback to mock data on error
      setCmsAuths(getMockPriorAuths())
    } finally {
      setLoadingCMS(false)
    }
  }

  // Get coverage summary
  const coverageSummary = useMemo(() => {
    if (!selectedPatient) return null
    return getCoverageSummary(selectedPatient)
  }, [selectedPatient])

  // Detect prior auth items
  const paItems = useMemo(() => {
    if (!selectedPatient) return []
    return detectPriorAuthItems(selectedPatient)
  }, [selectedPatient])

  // Analyze costs
  const costAnalysis = useMemo(() => {
    if (!selectedPatient) return null
    return analyzeCosts(selectedPatient)
  }, [selectedPatient])

  // Find medication savings
  const savings = useMemo(() => {
    if (!selectedPatient) return []
    return findMedicationSavings(selectedPatient)
  }, [selectedPatient])

  if (!selectedPatient) {
    return (
      <div className="text-center py-20">
        <Shield className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">No patient data available</p>
      </div>
    )
  }

  const coverage = coverageSummary?.shouldUseMock ? coverageSummary.mockCoverage : coverageSummary?.coverage

  // Chart colors
  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b']

  // Handle prior auth package download
  const handleDownloadPA = (item) => {
    const bundle = generatePriorAuthBundle(selectedPatient, item)
    const fileName = `prior-auth-${item.type}-${item.name.replace(/\s+/g, '-')}.json`
    downloadPriorAuthPackage(bundle, fileName)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-7 h-7 text-blue-600" />
          Payer & Coverage Tools
        </h2>
        <p className="text-gray-600 mt-1">Insurance coverage, prior authorization, and cost analysis</p>
      </div>

      {/* Insurance Coverage Card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-5 h-5" />
              <h3 className="text-sm font-medium opacity-90">Primary Insurance Coverage</h3>
            </div>
            <p className="text-2xl font-bold">{coverage?.payer_name || 'No Insurance Found'}</p>
            {coverageSummary?.shouldUseMock && (
              <p className="text-xs opacity-75 mt-1">📝 Mock data - No insurance info in EHI export</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs opacity-90">Member ID</div>
            <div className="font-mono font-semibold">{coverage?.member_id || 'N/A'}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-blue-500/30">
          <div>
            <div className="text-xs opacity-75">Plan Type</div>
            <div className="font-semibold">{coverage?.insurance_type || 'Unknown'}</div>
          </div>
          <div>
            <div className="text-xs opacity-75">Group Number</div>
            <div className="font-semibold font-mono text-sm">{coverage?.group_number || 'N/A'}</div>
          </div>
          <div>
            <div className="text-xs opacity-75">Plan Name</div>
            <div className="font-semibold">{coverage?.plan_name || 'N/A'}</div>
          </div>
          <div>
            <div className="text-xs opacity-75">Coverage Period</div>
            <div className="font-semibold text-sm">{formatCoverageDates(coverage)}</div>
          </div>
        </div>

        {coverage?.financial && (
          <div className="mt-6 pt-4 border-t border-blue-500/30">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs opacity-75">Deductible</div>
                <div className="font-semibold">{formatCurrency(coverage.financial.deductible_individual)}</div>
                {coverageSummary?.deductible && (
                  <div className="mt-1 bg-white/20 rounded-full h-1.5">
                    <div
                      className="bg-white rounded-full h-1.5"
                      style={{ width: `${coverageSummary.deductible.percentage}%` }}
                    />
                  </div>
                )}
                {coverageSummary?.deductible && (
                  <div className="text-xs mt-1">{coverageSummary.deductible.percentage}% met</div>
                )}
              </div>
              <div>
                <div className="text-xs opacity-75">Out-of-Pocket Max</div>
                <div className="font-semibold">{formatCurrency(coverage.financial.oop_max_individual)}</div>
                {coverageSummary?.oop && (
                  <div className="mt-1 bg-white/20 rounded-full h-1.5">
                    <div
                      className="bg-white rounded-full h-1.5"
                      style={{ width: `${coverageSummary.oop.percentage}%` }}
                    />
                  </div>
                )}
                {coverageSummary?.oop && (
                  <div className="text-xs mt-1">{coverageSummary.oop.percentage}% met</div>
                )}
              </div>
              <div>
                <div className="text-xs opacity-75">Primary Care Copay</div>
                <div className="font-semibold">{formatCurrency(coverage.financial.copay_primary)}</div>
              </div>
              <div>
                <div className="text-xs opacity-75">Specialist Copay</div>
                <div className="font-semibold">{formatCurrency(coverage.financial.copay_specialist)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CMS Prior Authorization Status */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">CMS Prior Authorization Status</h3>
            </div>
            <div className="flex items-center gap-2">
              {cmsApiStatus?.configured ? (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  API Connected
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-sm rounded-full">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Demo Mode
                </span>
              )}
              <button
                onClick={loadCMSPriorAuths}
                disabled={loadingCMS}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 text-gray-600 ${loadingCMS ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loadingCMS ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 mx-auto text-purple-600 animate-spin mb-3" />
              <p className="text-gray-600">Loading prior authorizations...</p>
            </div>
          ) : cmsAuths.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="font-medium">No prior authorizations on record</p>
              <p className="text-sm mt-1">You don't have any active or pending prior authorizations</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cmsAuths.map((auth) => {
                const statusColor =
                  auth.status === PA_STATUS.APPROVED ? 'green' :
                  auth.status === PA_STATUS.DENIED ? 'red' :
                  auth.status === PA_STATUS.PENDING ? 'blue' :
                  auth.status === PA_STATUS.NEEDS_INFO ? 'amber' :
                  'gray'

                return (
                  <div key={auth.id} className={`border-2 border-${statusColor}-200 rounded-lg p-4 bg-${statusColor}-50/30`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{auth.service}</h4>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full bg-${statusColor}-100 text-${statusColor}-700`}>
                            {auth.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">Request ID: {auth.id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Requested</p>
                        <p className="text-sm font-medium">{new Date(auth.requestDate).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500">Diagnosis</p>
                        <p className="font-medium text-gray-900">{auth.diagnosis || auth.reason}</p>
                      </div>
                      {auth.reviewDate && (
                        <div>
                          <p className="text-gray-500">Reviewed</p>
                          <p className="font-medium text-gray-900">{new Date(auth.reviewDate).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>

                    {auth.notes && (
                      <div className="mt-3 p-2 bg-white rounded border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Notes from Reviewer</p>
                        <p className="text-sm text-gray-700">{auth.notes}</p>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Reviewed by {auth.reviewedBy || 'Pending'}</span>
                      </div>
                      {auth.serviceCode && (
                        <div className="flex items-center gap-1">
                          <span>Code: {auth.serviceCode}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {!cmsApiStatus?.configured && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">Demo Mode Active</p>
                  <p className="text-blue-700">
                    Showing sample data. To connect to real CMS API, configure credentials in .env file.
                  </p>
                  <a
                    href="https://www.cms.gov/apis"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Get CMS API Credentials
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prior Authorization Assistant */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Prior Authorization Assistant</h3>
          </div>

          {paItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="font-medium">No items requiring prior authorization detected</p>
              <p className="text-sm mt-1">Your current medications and orders appear to be covered</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                {paItems.length} item{paItems.length !== 1 ? 's' : ''} may require prior authorization
              </p>

              {paItems.map((item, idx) => (
                <div key={idx} className="border border-orange-200 rounded-lg p-4 bg-orange-50/50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {item.type === 'medication' ? (
                          <Pill className="w-4 h-4 text-orange-600" />
                        ) : (
                          <Package className="w-4 h-4 text-orange-600" />
                        )}
                        <h4 className="font-semibold text-gray-900">{item.name}</h4>
                      </div>
                      {item.genericName && (
                        <p className="text-sm text-gray-600 ml-6">Generic: {item.genericName}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-orange-700">
                        {formatCurrency(item.avgCost)}
                        {item.frequency === 'monthly' && '/mo'}
                      </div>
                    </div>
                  </div>

                  <div className="ml-6 space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      <span>Reason: {item.reason}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      <span>Payer: {item.payer}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleDownloadPA(item)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Generate PA Package
                    </button>
                    <button
                      onClick={() => setExpandedPA(prev => ({ ...prev, [idx]: !prev[idx] }))}
                      className="px-3 py-1.5 bg-white border border-orange-300 text-orange-700 text-sm rounded-lg hover:bg-orange-50 transition-colors"
                    >
                      {expandedPA[idx] ? 'Hide' : 'Show'} Details
                    </button>
                  </div>

                  {expandedPA[idx] && (
                    <div className="mt-3 pt-3 border-t border-orange-200 text-sm text-gray-700">
                      <p className="font-medium mb-2">PA Package will include:</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-600">
                        <li>Patient demographics & insurance info</li>
                        <li>Medication/procedure details</li>
                        <li>Related diagnoses ({(stats?.conditions || []).length} found)</li>
                        <li>Recent lab results ({(stats?.results || []).slice(0, 5).length} included)</li>
                        <li>Provider information</li>
                      </ul>
                      <p className="mt-2 text-xs text-gray-500">
                        📄 Format: FHIR R4 Bundle (JSON) - ready for payer APIs
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Medication Savings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Medication Savings Opportunities</h3>
          </div>

          {savings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="font-medium">No generic alternatives found</p>
              <p className="text-sm mt-1">Your medications appear to be cost-optimized</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                Potential savings: <span className="font-semibold text-green-700">
                  {formatCurrency(savings.reduce((sum, s) => sum + s.monthlySavings, 0))}/month
                </span>
              </p>

              {savings.map((saving, idx) => (
                <div key={idx} className="border border-green-200 rounded-lg p-4 bg-green-50/50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Pill className="w-4 h-4 text-green-600" />
                        <h4 className="font-semibold text-gray-900">{saving.current}</h4>
                      </div>
                      <div className="flex items-center gap-1 mt-1 ml-6">
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-gray-600">Switch to: <span className="font-medium">{saving.recommendation}</span></span>
                      </div>
                    </div>
                  </div>

                  <div className="ml-6 mt-3 p-3 bg-white rounded border border-green-200">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-gray-500">Current Cost</div>
                        <div className="font-semibold text-gray-900">{formatCurrency(saving.currentCost)}/mo</div>
                      </div>
                      <div>
                        <div className="text-gray-500">New Cost</div>
                        <div className="font-semibold text-green-700">{formatCurrency(saving.newCost)}/mo</div>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="text-xs text-gray-500">Monthly Savings</div>
                      <div className="text-lg font-bold text-green-700">{formatCurrency(saving.monthlySavings)}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Annual: {formatCurrency(saving.annualSavings)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 ml-6">
                    <button className="w-full px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
                      Request Generic Switch
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cost Analysis */}
      {costAnalysis && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Healthcare Cost Analysis</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cost Breakdown Chart */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-4">Cost Breakdown by Category</h4>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={costAnalysis.byCategory}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.category}: ${entry.percentage.toFixed(0)}%`}
                  >
                    {costAnalysis.byCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Cost Summary */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-4">Estimated Costs Summary</h4>
              <div className="space-y-3">
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Total Estimated Costs</div>
                  <div className="text-2xl font-bold text-purple-700">{formatCurrency(costAnalysis.total)}</div>
                  <div className="text-xs text-gray-500 mt-1">Based on current data</div>
                </div>

                <div className="space-y-2">
                  {Object.entries(costAnalysis.breakdown).map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-700 capitalize">{category}</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(amount)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div className="text-xs text-blue-800">
                      <p className="font-medium">Note:</p>
                      <p className="mt-1">These are estimated costs based on national averages. Actual costs may vary based on your insurance coverage and provider contracts.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-gray-500 mt-0.5" />
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-1">Privacy & Accuracy Notice</p>
            <p>
              All insurance and cost information is processed entirely in your browser. No PHI is sent to external servers.
              Cost estimates and prior authorization recommendations are for informational purposes only. Always verify
              coverage details with your insurance provider before proceeding with treatment.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
