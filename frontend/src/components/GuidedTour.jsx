import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import { X, ChevronRight, ChevronLeft, Play, SkipForward } from 'lucide-react'
import { TOUR_STEPS } from '../config/demo'

/**
 * GuidedTour — floating tooltip-based walkthrough that highlights UI elements.
 *
 * Usage:
 *   <GuidedTour
 *     active={showTour}
 *     onEnd={() => setShowTour(false)}
 *     onStepAction={(action) => { if (action.view) setActiveView(action.view) }}
 *   />
 *
 * Each step targets a data-tour="..." attribute. The tooltip positions itself
 * relative to the target element with a pulsing highlight ring.
 */
export default function GuidedTour({ active, onEnd, onStepAction }) {
  const [step, setStep] = useState(0)
  const [pos, setPos] = useState(null)
  const [tooltipHeight, setTooltipHeight] = useState(0)
  const overlayRef = useRef(null)
  const tooltipRef = useRef(null)
  const retryRef = useRef(null)

  const currentStep = TOUR_STEPS[step]
  const totalSteps = TOUR_STEPS.length

  // Measure actual tooltip height after render for accurate positioning
  useLayoutEffect(() => {
    if (tooltipRef.current) {
      setTooltipHeight(tooltipRef.current.offsetHeight)
    }
  })

  // Position the tooltip relative to the target element
  const positionTooltip = useCallback(() => {
    if (!currentStep) return
    // Clear any pending retries
    if (retryRef.current) clearTimeout(retryRef.current)

    const el = document.querySelector(currentStep.target)
    if (!el) {
      // Target not in DOM yet (view might still be rendering) — retry up to 3s
      retryRef.current = setTimeout(positionTooltip, 250)
      return
    }

    // Scroll into view if needed
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })

    // Recalculate after scroll settles
    requestAnimationFrame(() => {
      setTimeout(() => {
        const updatedRect = el.getBoundingClientRect()
        setPos({
          target: {
            top: updatedRect.top + window.scrollY,
            left: updatedRect.left + window.scrollX,
            width: updatedRect.width,
            height: updatedRect.height,
          },
          placement: currentStep.placement || 'bottom',
        })
      }, 100)
    })
  }, [currentStep])

  useEffect(() => {
    if (!active) return
    // Fire the step action (e.g. navigate or switch view) BEFORE positioning
    if (currentStep?.action && onStepAction) {
      onStepAction(currentStep.action)
      // If navigating to a different page, wait longer for render
      const delay = currentStep.action.navigate ? 1500 : 500
      setTimeout(positionTooltip, delay)
    } else {
      positionTooltip()
    }
    return () => { if (retryRef.current) clearTimeout(retryRef.current) }
  }, [active, step, positionTooltip, currentStep, onStepAction])

  // Reposition on scroll/resize
  useEffect(() => {
    if (!active) return
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
  }, [active, positionTooltip])

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1)
    } else {
      handleEnd()
    }
  }

  const handlePrev = () => {
    if (step > 0) setStep(step - 1)
  }

  const handleEnd = () => {
    setStep(0)
    setPos(null)
    onEnd()
  }

  // Reset step when tour becomes active
  useEffect(() => {
    if (active) setStep(0)
  }, [active])

  if (!active || !pos || !currentStep) return null

  // Calculate tooltip position with viewport clamping
  const GAP = 16
  const TOOLTIP_WIDTH = 340
  const TOOLTIP_MAX_HEIGHT = Math.min(400, window.innerHeight - 32)
  // Use measured height if available, otherwise estimate
  const estimatedH = tooltipHeight > 0 ? tooltipHeight : 260
  let tooltipStyle = {}
  const { target, placement } = pos

  // Get viewport dimensions
  const vw = window.innerWidth
  const vh = window.innerHeight

  // Target position in viewport coordinates
  const targetViewTop = target.top - window.scrollY
  const targetViewLeft = target.left - window.scrollX
  const targetViewBottom = targetViewTop + target.height
  const targetViewRight = targetViewLeft + target.width

  // Determine best placement (auto-flip if would overflow)
  let effectivePlacement = placement
  if (placement === 'bottom' && targetViewBottom + GAP + estimatedH > vh) {
    effectivePlacement = 'top'
  }
  if (effectivePlacement === 'top' && targetViewTop - GAP - estimatedH < 0) {
    effectivePlacement = 'bottom'
  }

  // Calculate tooltip center X, clamped to viewport
  const centerX = targetViewLeft + target.width / 2
  const halfTooltip = TOOLTIP_WIDTH / 2
  const clampedLeft = Math.max(12, Math.min(centerX - halfTooltip, vw - TOOLTIP_WIDTH - 12))

  if (effectivePlacement === 'bottom') {
    // Place below target, clamp so tooltip doesn't overflow bottom
    const idealTop = targetViewBottom + GAP
    tooltipStyle = {
      top: Math.max(12, Math.min(idealTop, vh - estimatedH - 12)),
      left: clampedLeft,
    }
  } else if (effectivePlacement === 'top') {
    // Place above target, clamp so tooltip doesn't overflow top
    const idealTop = targetViewTop - GAP - estimatedH
    tooltipStyle = {
      top: Math.max(12, idealTop),
      left: clampedLeft,
    }
  } else if (effectivePlacement === 'right') {
    const topCenter = targetViewTop + target.height / 2 - estimatedH / 2
    tooltipStyle = {
      top: Math.max(12, Math.min(topCenter, vh - estimatedH - 12)),
      left: Math.min(targetViewRight + GAP, vw - TOOLTIP_WIDTH - 12),
    }
  } else {
    const topCenter = targetViewTop + target.height / 2 - estimatedH / 2
    tooltipStyle = {
      top: Math.max(12, Math.min(topCenter, vh - estimatedH - 12)),
      left: Math.max(12, targetViewLeft - GAP - TOOLTIP_WIDTH),
    }
  }

  return (
    <>
      {/* Clickable overlay backdrop — clicking outside the target skips tour */}
      <div
        className="fixed inset-0 z-[9997]"
        onClick={handleEnd}
        style={{ cursor: 'pointer' }}
      />

      {/* Semi-transparent overlay with cut-out for the target */}
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
                x={target.left - window.scrollX - 8}
                y={target.top - window.scrollY - 8}
                width={target.width + 16}
                height={target.height + 16}
                rx="12"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.55)"
            mask="url(#tour-mask)"
          />
        </svg>

        {/* Pulsing ring around target */}
        <div
          className="absolute rounded-xl ring-4 ring-blue-400/60 animate-pulse pointer-events-none"
          style={{
            top: target.top - window.scrollY - 8,
            left: target.left - window.scrollX - 8,
            width: target.width + 16,
            height: target.height + 16,
          }}
        />
      </div>

      {/* Tooltip — uses flex column so header/footer always visible, content scrolls */}
      <div
        ref={tooltipRef}
        className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col"
        style={{
          top: tooltipStyle.top,
          left: tooltipStyle.left,
          width: TOOLTIP_WIDTH,
          maxHeight: TOOLTIP_MAX_HEIGHT,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header — always visible */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-white/80" />
            <span className="text-white text-xs font-medium">
              Step {step + 1} of {totalSteps}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEnd}
              className="text-white/70 hover:text-white text-xs font-medium transition-colors flex items-center gap-1"
              title="Skip entire tour"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Skip
            </button>
            <button
              onClick={handleEnd}
              className="text-white/60 hover:text-white transition-colors ml-1"
              title="Close tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content — scrollable if tall */}
        <div className="px-5 py-4 space-y-2 overflow-y-auto flex-1 min-h-0">
          <h4 className="text-base font-bold text-gray-900">{currentStep.title}</h4>
          <p className="text-sm text-gray-600 leading-relaxed">{currentStep.content}</p>
        </div>

        {/* Progress bar */}
        <div className="px-5 flex-shrink-0">
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Navigation — always visible */}
        <div className="px-5 py-3 flex items-center justify-between flex-shrink-0 border-t border-gray-100">
          <button
            onClick={handlePrev}
            disabled={step === 0}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <span className="text-xs text-gray-400">{step + 1}/{totalSteps}</span>

          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            {step === totalSteps - 1 ? 'Finish' : 'Next'}
            {step < totalSteps - 1 && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </>
  )
}

/**
 * TourStartButton — floating "Take a Tour" button for the Dashboard.
 */
export function TourStartButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-16 right-6 z-40 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all hover:scale-105"
      style={{ boxShadow: '0 8px 25px rgba(59,130,246,0.4)' }}
    >
      <Play className="w-4 h-4" />
      <span className="text-sm font-semibold">Take a Tour</span>
    </button>
  )
}
