import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload,
  Database,
  Sparkles,
  Clock,
  Shield,
  FileText,
  CheckCircle2,
  ArrowRight,
  Heart,
  Activity,
  BarChart3,
  Lock,
} from 'lucide-react'
import FileUpload from '../components/FileUpload'
import { useData } from '../context/DataContext'

export default function LandingPage() {
  const navigate = useNavigate()
  const { uploadedFiles, loadSampleData } = useData()
  const [showUpload, setShowUpload] = useState(false)
  const [loadingSample, setLoadingSample] = useState(false)

  const handleFilesUploaded = () => navigate('/dashboard')

  const handleTrySampleData = () => {
    setLoadingSample(true)
    setTimeout(() => {
      const success = loadSampleData()
      if (success) navigate('/dashboard')
      setLoadingSample(false)
    }, 600)
  }

  const features = [
    {
      icon: Database,
      title: 'Multi-EHR Support',
      description: 'Parse Epic, Cerner, Athena, Allscripts, and more — any format, one tool.',
      gradient: 'from-teal-500 to-cyan-500',
    },
    {
      icon: Sparkles,
      title: 'AI Health Summary',
      description: 'Get plain-language insights and actionable summaries from complex records.',
      gradient: 'from-cyan-500 to-sky-500',
    },
    {
      icon: Activity,
      title: 'Timeline View',
      description: 'Visualize encounters, labs, and medications across your care journey.',
      gradient: 'from-sky-500 to-blue-500',
    },
    {
      icon: Lock,
      title: 'Zero-Trust Privacy',
      description: 'All parsing happens in your browser. Nothing is uploaded, stored, or shared.',
      gradient: 'from-teal-600 to-emerald-500',
    },
  ]

  const formats = [
    { name: 'C-CDA / XML', icon: FileText, vendors: 'Allscripts, Practice Fusion, MEDITECH' },
    { name: 'FHIR JSON', icon: BarChart3, vendors: 'Athena, Cerner' },
    { name: 'Epic TSV', icon: Database, vendors: 'Epic EHI Export' },
    { name: 'CSV / NDJSON', icon: Heart, vendors: 'Greenway, NextGen, eCW' },
  ]

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-100/60">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">HealthLens</span>
          </div>
          <nav className="hidden sm:flex items-center gap-8 text-sm font-medium text-gray-500">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How It Works</a>
            <button
              onClick={() => setShowUpload(true)}
              className="ml-2 px-5 py-2 text-sm font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
            >
              Get Started
            </button>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative">
        {/* Single radial glow */}
        <div className="hero-glow absolute inset-0 pointer-events-none" aria-hidden="true" />

        <div className="relative max-w-4xl mx-auto px-6 pt-28 pb-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 text-primary-700 text-sm font-medium mb-8 border border-primary-100">
            <Shield className="w-3.5 h-3.5" />
            <span>100 % Private — Data Never Leaves Your Device</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-gray-900 leading-[1.08] mb-6">
            Understand Your<br />
            <span className="bg-gradient-to-r from-teal-600 via-cyan-500 to-sky-500 bg-clip-text text-transparent">
              Health Records
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed mb-12">
            Upload EHI exports from any provider. HealthLens parses, normalizes,
            and surfaces <span className="text-gray-700 font-medium">clear, actionable insights</span> — entirely in your browser.
          </p>

          {/* CTA */}
          <div className="max-w-2xl mx-auto">
            {!showUpload ? (
              <div className="glass-card">
                <Upload className="w-12 h-12 mx-auto text-primary-400 mb-4" strokeWidth={1.5} />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Drop your health records here</h3>
                <p className="text-sm text-gray-400 mb-8">TSV, CSV, JSON, NDJSON, XML, ZIP — all supported</p>
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <button onClick={() => setShowUpload(true)} className="btn-primary inline-flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" />
                    Browse Files
                  </button>
                  <button onClick={handleTrySampleData} disabled={loadingSample} className="btn-secondary inline-flex items-center justify-center gap-2 disabled:opacity-50">
                    {loadingSample ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        Loading…
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4" />
                        Try Sample Data
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <FileUpload onComplete={handleFilesUploaded} />
            )}
          </div>
        </div>
      </section>

      {/* ── Supported Formats ── */}
      <section className="py-16 bg-gray-50/50">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 mb-8">
            Works with every major EHR export format
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {formats.map((f) => (
              <div key={f.name} className="glass-card !p-5 text-center">
                <f.icon className="w-6 h-6 text-primary-500 mx-auto mb-3" strokeWidth={1.8} />
                <p className="font-semibold text-gray-900 text-sm">{f.name}</p>
                <p className="text-xs text-gray-400 mt-1">{f.vendors}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Wave divider ── */}
      <div className="relative h-20 bg-white">
        <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path fill="#f9fafb" d="M0,48 C360,80 720,0 1080,48 C1260,64 1380,80 1440,48 L1440,80 L0,80 Z" />
        </svg>
      </div>

      {/* ── Features ── */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">
              Built for Clarity
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Everything you need to make sense of your health data — nothing you don't.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="feature-card fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                <div className={`w-12 h-12 mx-auto mb-5 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center shadow-md`}>
                  <f.icon className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Wave divider ── */}
      <div className="relative h-20 bg-gray-50">
        <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path fill="#ffffff" d="M0,32 C480,80 960,0 1440,48 L1440,80 L0,80 Z" />
        </svg>
      </div>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">
              Three Simple Steps
            </h2>
            <p className="text-lg text-gray-500">
              From raw export to actionable insight in seconds.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              { step: '1', title: 'Upload', desc: 'Drag & drop from any EHR system. ZIP, TSV, JSON, XML — we handle it.', icon: Upload },
              { step: '2', title: 'Parse', desc: 'Auto-detect vendor & format, apply YAML rules, normalize to FHIR.', icon: Database },
              { step: '3', title: 'Explore', desc: 'Browse your timeline, AI summaries, lab trends, and medication history.', icon: Sparkles },
            ].map((item, i) => (
              <div key={i} className="relative flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex items-center justify-center text-xl font-bold shadow-glow mb-6">
                  {item.step}
                </div>
                <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-primary-600" strokeWidth={2} />
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs">{item.desc}</p>
                {i < 2 && (
                  <ArrowRight className="hidden md:block absolute top-6 -right-5 w-10 h-10 text-gray-200" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-950 text-white py-14">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight">HealthLens</span>
          </div>
          <p className="text-gray-400 text-sm mb-1">
            Transform Your Health Data &middot; Privacy-First &middot; Multi-EHR Support
          </p>
          <p className="text-gray-500 text-xs">
            Built by Health Data Alchemist for EHIgnite Challenge 2026 &middot; Cedars-Sinai Health System
          </p>
        </div>
      </footer>
    </div>
  )
}
