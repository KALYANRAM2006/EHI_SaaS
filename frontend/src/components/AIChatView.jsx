import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send,
  Bot,
  User,
  Sparkles,
  Pill,
  TestTube,
  AlertCircle,
  Stethoscope,
  Syringe,
  FileText,
  Activity,
  ChevronRight,
  Cloud,
} from 'lucide-react'
import { processQuery, getSuggestedQuestions, getFollowUpQuestions } from '../services/chatEngine'
import { sendCloudChatQuery, getAIConfig } from '../services/aiService'
import { useData } from '../context/DataContext'

/**
 * AIChatView — Figma-matched AI Query Assistant chat interface.
 *
 * Features:
 *   - Suggested question cards (3×2 grid)
 *   - Chat message list (AI left / User right)
 *   - Structured data cards in AI responses
 *   - Typing indicator animation
 *   - Auto-scroll to latest message
 *   - Keyboard submit (Enter)
 */
export default function AIChatView({ selectedPatient, stats }) {
  const { aiConfig } = useData()
  const isCloudMode = aiConfig?.mode === 'cloud'
  const [messages, setMessages] = useState([
    {
      id: Date.now(),
      role: 'ai',
      text: `Hi! I'm your **AI Health Assistant**. I can help you explore and understand your medical records using natural language.\n\nTry asking me about your medications, lab results, allergies, doctor visits, or health conditions — or pick one of the suggestions below to get started.`,
      timestamp: new Date(),
      icon: '🤖',
      color: 'blue',
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping, scrollToBottom])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Handle send message
  const handleSend = useCallback((text) => {
    const q = (text || input).trim()
    if (!q) return

    // Add user message
    const userMsg = {
      id: Date.now(),
      role: 'user',
      text: q,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')

    // Show typing indicator
    setIsTyping(true)

    // Route to cloud or local processing based on AI mode
    if (isCloudMode && selectedPatient) {
      // Cloud mode: send query to Azure OpenAI
      ;(async () => {
        try {
          const aiText = await sendCloudChatQuery(q, selectedPatient)
          const aiMsg = {
            id: Date.now() + 1,
            role: 'ai',
            text: aiText,
            data: null,
            dataType: null,
            intent: 'cloud',
            icon: '☁️',
            color: 'blue',
            followUp: getFollowUpQuestions('summary'),
            timestamp: new Date(),
            isCloud: true,
          }
          setMessages(prev => [...prev, aiMsg])
        } catch (err) {
          const errorMsg = {
            id: Date.now() + 1,
            role: 'ai',
            text: `**Cloud AI Error**: ${err.message}\n\nFalling back to local analysis...`,
            icon: '⚠️',
            color: 'red',
            timestamp: new Date(),
          }
          // Fall back to local processing
          const result = processQuery(q, selectedPatient || stats)
          const fallbackMsg = {
            id: Date.now() + 2,
            role: 'ai',
            text: result.text,
            data: result.data,
            dataType: result.dataType,
            intent: result.intent,
            icon: result.icon,
            color: result.color,
            followUp: result.followUp || getFollowUpQuestions(result.intent),
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, errorMsg, fallbackMsg])
        } finally {
          setIsTyping(false)
        }
      })()
    } else {
      // Local mode: use local chatEngine
      setTimeout(() => {
        const result = processQuery(q, selectedPatient || stats)
        const aiMsg = {
          id: Date.now() + 1,
          role: 'ai',
          text: result.text,
          data: result.data,
          dataType: result.dataType,
          intent: result.intent,
          icon: result.icon,
          color: result.color,
          followUp: result.followUp || getFollowUpQuestions(result.intent),
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, aiMsg])
        setIsTyping(false)
      }, 600 + Math.random() * 400)
    }
  }, [input, selectedPatient, stats, isCloudMode])

  // Keyboard handler
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Suggested questions from engine
  const suggestions = getSuggestedQuestions()

  // ── Render helpers ─────────────────────────────

  // Render formatted text (markdown bold support)
  const renderFormattedText = (text) => {
    if (!text) return null
    return text.split('\n').map((line, li) => (
      <span key={li}>
        {li > 0 && <br />}
        {line.split(/(\*\*[^*]+\*\*|~~[^~]+~~)/).map((seg, si) => {
          if (seg.startsWith('**') && seg.endsWith('**')) {
            return <strong key={si} className="font-semibold">{seg.slice(2, -2)}</strong>
          }
          if (seg.startsWith('~~') && seg.endsWith('~~')) {
            return <del key={si} className="text-gray-400 line-through">{seg.slice(2, -2)}</del>
          }
          // Handle bullets
          if (seg.startsWith('• ')) {
            return <span key={si} className="block ml-2">{seg}</span>
          }
          return <span key={si}>{seg}</span>
        })}
      </span>
    ))
  }

  // Icon map for data types
  const dataTypeIcon = (type) => {
    const map = {
      medications: Pill,
      labs: TestTube,
      allergies: AlertCircle,
      encounters: Stethoscope,
      conditions: FileText,
      immunizations: Syringe,
      providers: User,
    }
    return map[type] || Activity
  }

  // Color map
  const colorMap = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100', icon: 'text-blue-600' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100', icon: 'text-green-600' },
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100', icon: 'text-red-600' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100', icon: 'text-purple-600' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100', icon: 'text-orange-600' },
    teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', badge: 'bg-teal-100', icon: 'text-teal-600' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', badge: 'bg-indigo-100', icon: 'text-indigo-600' },
    gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100', icon: 'text-gray-600' },
  }

  // Suggestion card color map
  const suggestionColorsFull = {
    purple: { bg: 'bg-purple-50 hover:bg-purple-100', border: 'border-purple-200', text: 'text-purple-800' },
    green: { bg: 'bg-green-50 hover:bg-green-100', border: 'border-green-200', text: 'text-green-800' },
    red: { bg: 'bg-red-50 hover:bg-red-100', border: 'border-red-200', text: 'text-red-800' },
    blue: { bg: 'bg-blue-50 hover:bg-blue-100', border: 'border-blue-200', text: 'text-blue-800' },
    teal: { bg: 'bg-teal-50 hover:bg-teal-100', border: 'border-teal-200', text: 'text-teal-800' },
    orange: { bg: 'bg-orange-50 hover:bg-orange-100', border: 'border-orange-200', text: 'text-orange-800' },
    indigo: { bg: 'bg-indigo-50 hover:bg-indigo-100', border: 'border-indigo-200', text: 'text-indigo-800' },
  }

  // Render structured data cards inside AI messages
  const renderDataCards = (data, dataType, color) => {
    if (!data || data.length === 0) return null
    const c = colorMap[color] || colorMap.blue
    const Icon = dataTypeIcon(dataType)

    return (
      <div className="mt-3 space-y-2">
        {data.slice(0, 6).map((item, index) => (
          <div
            key={index}
            className={`${c.bg} border ${c.border} rounded-lg p-3 text-sm`}
          >
            <div className="flex items-start gap-2">
              <Icon className={`w-4 h-4 mt-0.5 ${c.icon} flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                {dataType === 'medications' && (
                  <>
                    <p className={`font-semibold ${c.text}`}>{item.name}</p>
                    <p className="text-gray-600">{item.dosage || 'Dosage not specified'}</p>
                    {item.purpose && <p className="text-gray-500 text-xs mt-1">Purpose: {item.purpose}</p>}
                  </>
                )}
                {dataType === 'labs' && (
                  <>
                    <div className="flex items-center justify-between">
                      <p className={`font-semibold ${c.text}`}>{item.component}</p>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        item.flag === 'Normal' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>{item.flag}</span>
                    </div>
                    <p className="text-gray-600">{item.value} {item.unit || item.units || ''}</p>
                    <p className="text-gray-500 text-xs mt-1">Ref: {item.refLow}–{item.refHigh}</p>
                  </>
                )}
                {dataType === 'allergies' && (
                  <>
                    <p className={`font-semibold ${c.text}`}>{item.allergen || item.name}</p>
                    <p className="text-gray-600">Severity: {item.severity} | Reaction: {item.reaction || 'Not specified'}</p>
                  </>
                )}
                {dataType === 'encounters' && (
                  <>
                    <p className={`font-semibold ${c.text}`}>{item.encType}: {item.diagnosis || 'Routine'}</p>
                    <p className="text-gray-600">{new Date(item.contactDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    {item.chiefComplaint && <p className="text-gray-500 text-xs mt-1">{item.chiefComplaint}</p>}
                  </>
                )}
                {dataType === 'conditions' && (
                  <>
                    <div className="flex items-center justify-between">
                      <p className={`font-semibold ${c.text}`}>{item.name}</p>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        item.status === 'Active' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                      }`}>{item.status}</span>
                    </div>
                    <p className="text-gray-600">{item.severity} severity • Since {item.onset || 'unknown'}</p>
                  </>
                )}
                {dataType === 'providers' && (
                  <>
                    <p className={`font-semibold ${c.text}`}>{item.name}</p>
                    <p className="text-gray-600">{item.specialty}</p>
                  </>
                )}
                {dataType === 'immunizations' && (
                  <>
                    <p className={`font-semibold ${c.text}`}>{item.procName || item.name}</p>
                    <p className="text-gray-600">{item.orderDate || 'Date unknown'}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {data.length > 6 && (
          <p className="text-xs text-gray-500 text-center mt-1">
            ...and {data.length - 6} more items
          </p>
        )}
      </div>
    )
  }

  // ── Main Render ────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden mb-4">
        <div className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">AI Query Assistant</h2>
            <p className="text-sm text-gray-500">
              Ask questions about your health data in natural language
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
              <Sparkles className="w-3 h-3" />
              Deep Analysis
            </span>
            {isCloudMode ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                <Cloud className="w-3 h-3" />
                Azure OpenAI
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Local Processing
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {/* AI Avatar */}
              {msg.role === 'ai' && (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Message bubble */}
              <div className={`max-w-[75%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white ml-auto'
                      : 'bg-gray-50 border border-gray-200 text-gray-800'
                  }`}
                >
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {renderFormattedText(msg.text)}
                  </div>
                </div>

                {/* Structured data cards (AI messages only) */}
                {msg.role === 'ai' && msg.data && (
                  renderDataCards(msg.data, msg.dataType, msg.color)
                )}

                {/* Follow-up question chips */}
                {msg.role === 'ai' && msg.followUp && msg.followUp.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {msg.followUp.map((fq, fi) => (
                      <button
                        key={fi}
                        onClick={() => handleSend(fq)}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-full hover:bg-blue-100 hover:border-blue-300 transition-all hover:scale-105"
                      >
                        {fq}
                      </button>
                    ))}
                  </div>
                )}

                {/* Timestamp */}
                <p className={`text-[10px] text-gray-400 mt-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </p>
              </div>

              {/* User Avatar */}
              {msg.role === 'user' && (
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {/* Suggestions (show only when fewer than 2 messages) */}
          {messages.length <= 1 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-semibold text-gray-700">Try asking...</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {suggestions.map((s, i) => {
                  const sc = suggestionColorsFull[s.color] || suggestionColorsFull.blue
                  return (
                    <button
                      key={i}
                      onClick={() => handleSend(s.text)}
                      className={`group ${sc.bg} border ${sc.border} rounded-xl p-4 text-left transition-all hover:shadow-md hover:scale-[1.02]`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">{s.icon}</span>
                        <div>
                          <p className={`text-sm font-medium ${sc.text}`}>{s.text}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-gray-400 group-hover:text-blue-500 transition-colors">
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-[10px]">Ask this question</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about your health records..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                disabled={isTyping}
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className={`flex items-center justify-center w-11 h-11 rounded-xl transition-all ${
                input.trim() && !isTyping
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg hover:scale-105'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            {isCloudMode
              ? 'Queries are de-identified before sending to Azure OpenAI. PHI never leaves your device.'
              : 'All queries are processed locally. Your health data never leaves your device.'
            }
          </p>
        </div>
      </div>
    </div>
  )
}
