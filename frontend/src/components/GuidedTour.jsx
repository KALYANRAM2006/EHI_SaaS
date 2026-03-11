import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import { X, ChevronRight, ChevronLeft, Play, SkipForward, Compass } from 'lucide-react'
import { TOUR_STEPS } from '../config/demo'

/**
 * GuidedTour — floating tooltip walkthrough that highlights UI elements.
 *
 * Phase flow:
 *   welcome → touring (step-by-step) → done
 *   welcome → skip (user chose "Explore on My Own")
 *
 * The tooltip is compact and NEVER overlaps the highlighted target element.
 * Positioning is fully viewport-clamped: nav buttons are always on screen.
 */
export default function GuidedTour({ active, onEnd, onStepAction }) {
  const [phase, setPhase] = useState('welcome') // 'welcome' | 'touring'
  const [step, setStep] = useState(0)
  const [pos, setPos] = useState(null)
  const [tooltipHeight, setTooltipHeight] = useState(0)
  const overlayRef = useRef(null)
  const tooltipRef = useRef(null)
  const retryRef = useRef(null)

  const currentStep = TOUR_STEPS[step]
  const totalSteps = TOUR_STEPS.length

  // Measure actual tooltip height after render
  useLayoutEffect(() => {
    if (tooltipRef.current) {
      setTooltipHeight(tooltipRef.current.offsetHeight)
    }
  })

  // Position the tooltip relative to the target element
  const positionTooltip = useCallback(() => {
    if (!currentStep) return
    if (retryRef.current) clearTimeout(retryRef.current)

    const el = document.querySelector(currentStep.target)
    if (!el) {
      retryRef.current = setTimeout(positionTooltip, 250)
      return
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' })

    requestAnimationFrame(() => {
      setTimeout(() => {
        const r = el.getBoundingClientRect()
        setPos({
          target: {
            top: r.top + window.scrollY,
            left: r.left + window.scrollX,
            width: r.width,
            height: r.height,
          },
          placement: currentStep.placement || 'bottom',
        })
      }, 120)
    })
  }, [currentStep])

  useEffect(() => {
    if (!active || phase !== 'touring') return
    if (currentStep?.action && onStepAction) {
      onStepAction(currentStep.action)
      const delay = currentStep.action.navigate ? 1500 : 500
      setTimeout(positionTooltip, delay)
    } else {
      positionTooltip()
    }
    return () => { if (retryRef.current) clearTimeout(retryRef.current) }
  }, [active, phase, step, positionTooltip, currentStep, onStepAction])

  // Reposition on scroll/resize
  useEffect(() => {
    if (!active || phase !== 'touring') return
    let ticking = false
    const handler = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(() => { positionTooltip(); ticking = false })
      }
    }
    window.addEventListener('resize', handler)
    window.addEventListener('scroll', handler, true)
    return () => {
      window.removeEventListener('resize', handler)
      window.removeEventListener('scroll', handler, true)
    }
  }, [active, phase, positionTooltip])

  const handleNext = () => {
    if (step < totalSteps - 1) setStep(step + 1)
    else handleEnd()
  }

  const handlePrev = () => {
    if (step > 0) setStep(step - 1)
  }

  const handleEnd = () => {
    setStep(0)
    setPos(null)
    setPhase('welcome')
    onEnd()
  }

  const handleStartTour = () => {
    setStep(0)
    setPos(null)
    setPhase('touring')
  }

  const handleSkipExplore = () => {
    handleEnd()
  }

  // Reset when tour becomes active
  useEffect(() => {
    if (active) {
      setStep(0)
      setPos(null)
      setPhase('welcome')
    }
  }, [active])

  if (!active) return null

  // ─── Welcome Screen ─────────────────────────────────────────────────────────
  if (phase === 'welcome') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Play className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Welcome to ClinQuilt Demo</h2>
                <p className="text-white/80 text-sm">Interactive product walkthrough</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            <p className="text-gray-600 text-sm leading-relaxed">
              ClinQuilt transforms complex health records (EHI exports) into beautiful,
              AI-powered visualizations. This demo will show you how it works.
            </p>
            <div className="text-gray-500 text-xs space-y-1">
              <p>You can choose to:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Take the guided tour</strong> — step-by-step walkthrough of every feature</li>
                <li><strong>Explore on your own</strong> — skip the tour and try the app freely</li>
              </ul>
              <p className="pt-1">You can restart the tour anytime using the floating button.</p>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-5 flex flex-col gap-3">
            <button
              onClick={handleStartTour}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
            >
              <Play className="w-4 h-4" />
              Start Guided Tour
            </button>
            <button
              onClick={handleSkipExplore}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              <Compass className="w-4 h-4" />
              Skip — Explore on My Own
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Touring Phase ──────────────────────────────────────────────────────────
  if (!pos || !currentStep) return null

  // === Tooltip positioning (never overlap target) ===
  const GAP = 14
  const TOOLTIP_WIDTH = 320
  const HARD_MAX_H = Math.min(280, window.innerHeight * 0.45) // smaller max
  const measuredH = tooltipHeight > 0 ? Math.min(tooltipHeight, HARD_MAX_H) : 220
  const { target, placement } = pos

  const vw = window.innerWidth
  const vh = window.innerHeight

  // Target in viewport coords
  const tTop = target.top - window.scrollY
  const tLeft = target.left - window.scrollX
  const tBottom = tTop + target.height
  const tRight = tLeft + target.width

  // Space available on each side of the target
  const spaceAbove = tTop
  const spaceBelow = vh - tBottom
  const spaceRight = vw - tRight
  const spaceLeft = tLeft

  // Pick best placement: prefer requested, then flip, then side
  let best = placement
  const needed = measuredH + GAP
  if (best === 'bottom' && spaceBelow < needed) {
    best = spaceAbove >= needed ? 'top'
      : spaceRight >= TOOLTIP_WIDTH + GAP ? 'right'
      : spaceLeft >= TOOLTIP_WIDTH + GAP ? 'left'
      : spaceBelow >= spaceAbove ? 'bottom' : 'top'
  }
  if (best === 'top' && spaceAbove < needed) {
    best = spaceBelow >= needed ? 'bottom'
      : spaceRight >= TOOLTIP_WIDTH + GAP ? 'right'
      : spaceLeft >= TOOLTIP_WIDTH + GAP ? 'left'
      : spaceAbove >= spaceBelow ? 'top' : 'bottom'
  }

  // Clamp horizontal center
  const centerX = tLeft + target.width / 2
  const clampedLeft = Math.max(8, Math.min(centerX - TOOLTIP_WIDTH / 2, vw - TOOLTIP_WIDTH - 8))

  // Compute final position — strictly no overlap with target
  let tooltipStyle = {}
  if (best === 'bottom') {
    tooltipStyle = {
      top: Math.min(tBottom + GAP, vh - measuredH - 8),
      left: clampedLeft,
    }
  } else if (best === 'top') {
    tooltipStyle = {
      top: Math.max(8, tTop - GAP - measuredH),
      left: clampedLeft,
    }
  } else if (best === 'right') {
    const vertCenter = tTop + target.height / 2 - measuredH / 2
    tooltipStyle = {
      top: Math.max(8, Math.min(vertCenter, vh - measuredH - 8)),
      left: Math.min(tRight + GAP, vw - TOOLTIP_WIDTH - 8),
    }
  } else {
    const vertCenter = tTop + target.height / 2 - measuredH / 2
    tooltipStyle = {
      top: Math.max(8, Math.min(vertCenter, vh - measuredH - 8)),
      left: Math.max(8, tLeft - GAP - TOOLTIP_WIDTH),
    }
  }

  // Final hard clamp: tooltip bottom must never exceed viewport
  if (tooltipStyle.top + measuredH > vh - 8) {
    tooltipStyle.top = vh - measuredH - 8
  }
  if (tooltipStyle.top < 8) tooltipStyle.top = 8

  return (
    <>
      {/* Clickable backdrop — click anywhere outside to skip */}
      <div
        className="fixed inset-0 z-[9997]"
        onClick={handleEnd}
        style={{ cursor: 'pointer' }}
      />

      {/* Semi-transparent overlay with cut-out */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[9998]"
        style={{ pointerEvents: 'none' }}
      >
        <svg className="w-full h-full" style={{ position: 'absolute', top: 0, left: 0 }}>
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={tLeft - 6}
                y={tTop - 6}
                width={target.width + 12}
                height={target.height + 12}
                rx="10"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.45)"
            mask="url(#tour-mask)"
          />
        </svg>

        {/* Pulsing ring */}
        <div
          className="absolute rounded-xl ring-3 ring-blue-400/50 animate-pulse pointer-events-none"
          style={{
            top: tTop - 6,
            left: tLeft - 6,
            width: target.width + 12,
            height: target.height + 12,
          }}
        />
      </div>

      {/* Compact Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col"
        style={{
          top: tooltipStyle.top,
          left: tooltipStyle.left,
          width: TOOLTIP_WIDTH,
          maxHeight: HARD_MAX_H,
          boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header with step count + skip/close */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 flex items-center justify-between flex-shrink-0 rounded-t-xl">
          <span className="text-white text-xs font-medium">
            Step {step + 1} / {totalSteps}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEnd}
              className="text-white/80 hover:text-white text-xs font-medium transition-colors flex items-center gap-1"
            >
              <SkipForward className="w-3 h-3" />
              Skip Tour
            </button>
            <button onClick={handleEnd} className="text-white/60 hover:text-white transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="px-4 py-3 overflow-y-auto flex-1 min-h-0">
          <h4 className="text-sm font-bold text-gray-900 mb-1">{currentStep.title}</h4>
          <p className="text-xs text-gray-600 leading-relaxed">{currentStep.content}</p>
        </div>

        {/* Progress + Nav — always pinned at bottom */}
        <div className="flex-shrink-0 border-t border-gray-100">
          {/* Thin progress bar */}
          <div className="px-4 pt-2">
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="px-4 py-2 flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={step === 0}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>

            <button
              onClick={handleEnd}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline"
            >
              Explore on my own
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              {step === totalSteps - 1 ? 'Finish' : 'Next'}
              {step < totalSteps - 1 && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/**
 * TourStartButton — floating "Take a Tour" button.
 */
export function TourStartButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-16 right-6 z-40 flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all hover:scale-105"
      style={{ boxShadow: '0 8px 25px rgba(59,130,246,0.4)' }}
    >
      <Play className="w-4 h-4" />
      <span className="text-sm font-semibold">Take a Tour</span>
    </button>
  )
}
