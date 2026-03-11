import { ShieldCheck, Clock, Lock } from 'lucide-react'
import { formatExpiryDate, getDaysRemaining } from '../config/demo'
import { APP_VERSION } from '../utils/privacy'

/**
 * DemoExpiredGate — full-screen blocker shown when the demo has expired.
 * Replaces the entire app content. No way to dismiss or bypass.
 */
export default function DemoExpiredGate() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50 relative overflow-hidden px-4">
      {/* Background orbs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-red-400/10 to-pink-400/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full text-center space-y-8">
        {/* Lock icon */}
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-xl" style={{ boxShadow: '0 10px 25px rgba(239,68,68,0.3)' }}>
          <Lock className="w-10 h-10 text-white" />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-gray-900">Demo Period Expired</h1>
          <p className="text-lg text-gray-600">
            This ClinQuilt demonstration expired on <span className="font-semibold text-gray-900">{formatExpiryDate()}</span>.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg space-y-4">
          <div className="flex items-center gap-3 justify-center text-gray-600">
            <Clock className="w-5 h-5 text-red-500" />
            <span className="text-sm">Demo access has ended</span>
          </div>

          <p className="text-sm text-gray-500 leading-relaxed">
            Thank you for evaluating ClinQuilt! To request an extended demo or provide feedback, please reach out.
          </p>

          <div className="flex justify-center">
            <a
              href="mailto:kalyanram2006@gmail.com?subject=ClinQuilt%20Demo%20Extension%20Request"
              className="px-6 py-3 text-sm font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
              style={{ boxShadow: '0 4px 14px rgba(59,130,246,0.3)' }}
            >
              Request Extension
            </a>
          </div>
        </div>

        {/* Trust indicators */}
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
          <ShieldCheck className="w-4 h-4" />
          <span>ClinQuilt v{APP_VERSION} — All session data has been cleared</span>
        </div>
      </div>
    </div>
  )
}

/**
 * DemoExpiryBanner — thin banner at the bottom of the screen showing days remaining.
 * Only shown in demo mode when the demo is still active.
 */
export function DemoExpiryBanner() {
  const days = getDaysRemaining()
  const urgent = days <= 7

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium border-t backdrop-blur-md ${
      urgent
        ? 'bg-red-50/90 text-red-800 border-red-200'
        : 'bg-blue-50/90 text-blue-800 border-blue-200'
    }`}>
      <Clock className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
      {days === 0
        ? 'Demo expires today'
        : days === 1
          ? 'Demo expires tomorrow'
          : `Demo expires in ${days} days (${formatExpiryDate()})`
      }
      <span className="mx-2 text-gray-300">|</span>
      <a href="mailto:kalyanram2006@gmail.com?subject=ClinQuilt%20Demo%20Feedback" className="underline hover:no-underline">
        Contact: kalyanram2006@gmail.com
      </a>
    </div>
  )
}
