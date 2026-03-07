import { useState, useEffect, useCallback, useRef } from 'react'
import { X, ChevronRight, ChevronLeft, Play } from 'lucide-react'
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
  const overlayRef = useRef(null)
  const tooltipRef = useRef(null)

  const currentStep = TOUR_STEPS[step]
  const totalSteps = TOUR_STEPS.length

  // Position the tooltip relative to the target element
  const positionTooltip = useCallback(() => {
    if (!currentStep) return
    const el = document.querySelector(currentStep.target)
    if (!el) {
      // Target not in DOM yet (view might still be rendering) — retry
      setTimeout(positionTooltip, 200)
      return
    }

    const rect = el.getBoundingClientRect()
    const scrollY = window.scrollY
    const scrollX = window.scrollX

    // Scroll into view if needed
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })

    // Recalculate after scroll
    requestAnimationFrame(() => {
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
    })
  }, [currentStep])

  useEffect(() => {
    if (!active) return
    // Fire the step action (e.g. switch view) BEFORE positioning
    if (currentStep?.action && onStepAction) {
      onStepAction(currentStep.action)
      // Wait for view to render before positioning
      setTimeout(positionTooltip, 400)
    } else {
      positionTooltip()
    }
  }, [active, step, positionTooltip, currentStep, onStepAction])

  // Reposition on scroll/resize
  useEffect(() => {
    if (!active) return
    const handler = () => positionTooltip()
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
  const TOOLTIP_WIDTH = 320
  const TOOLTIP_HEIGHT_ESTIMATE = 220 // approximate max height of tooltip
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
  if (placement === 'bottom' && targetViewBottom + GAP + TOOLTIP_HEIGHT_ESTIMATE > vh) {
    effectivePlacement = 'top'
  } else if (placement === 'top' && targetViewTop - GAP - TOOLTIP_HEIGHT_ESTIMATE < 0) {
    effectivePlacement = 'bottom'
  }

  // Calculate tooltip center X, clamped to viewport
  const centerX = targetViewLeft + target.width / 2
  const halfTooltip = TOOLTIP_WIDTH / 2
  const clampedLeft = Math.max(12, Math.min(centerX - halfTooltip, vw - TOOLTIP_WIDTH - 12))

  if (effectivePlacement === 'bottom') {
    tooltipStyle = {
      top: Math.min(targetViewBottom + GAP, vh - TOOLTIP_HEIGHT_ESTIMATE - 12),
      left: clampedLeft,
    }
  } else if (effectivePlacement === 'top') {
    tooltipStyle = {
      top: Math.max(12, targetViewTop - GAP - TOOLTIP_HEIGHT_ESTIMATE),
      left: clampedLeft,
    }
  } else if (effectivePlacement === 'right') {
    const topCenter = targetViewTop + target.height / 2 - TOOLTIP_HEIGHT_ESTIMATE / 2
    tooltipStyle = {
      top: Math.max(12, Math.min(topCenter, vh - TOOLTIP_HEIGHT_ESTIMATE - 12)),
      left: Math.min(targetViewRight + GAP, vw - TOOLTIP_WIDTH - 12),
    }
  } else {
    // left
    const topCenter = targetViewTop + target.height / 2 - TOOLTIP_HEIGHT_ESTIMATE / 2
    tooltipStyle = {
      top: Math.max(12, Math.min(topCenter, vh - TOOLTIP_HEIGHT_ESTIMATE - 12)),
      left: Math.max(12, targetViewLeft - GAP - TOOLTIP_WIDTH),
    }
  }

  return (
    <>
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
            fill="rgba(0,0,0,0.5)"
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

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
        style={{
          top: tooltipStyle.top,
          left: tooltipStyle.left,
          width: TOOLTIP_WIDTH,
          maxHeight: vh - 24,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-white/80" />
            <span className="text-white text-xs font-medium">
              Step {step + 1} of {totalSteps}
            </span>
          </div>
          <button
            onClick={handleEnd}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-2">
          <h4 className="text-base font-bold text-gray-900">{currentStep.title}</h4>
          <p className="text-sm text-gray-600 leading-relaxed">{currentStep.content}</p>
        </div>

        {/* Progress bar */}
        <div className="px-5">
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="px-5 py-3 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={step === 0}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          <button
            onClick={handleEnd}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip tour
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
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
