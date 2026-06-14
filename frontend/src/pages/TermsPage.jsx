export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Terms and Conditions</h1>
          <p className="text-sm text-gray-500 mt-2">Last updated: June 14, 2026</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using ClinQuilt ("the App"), you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the App.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p>ClinQuilt is a patient-facing health record viewer that allows individuals to connect to their healthcare providers' electronic health record (EHR) systems via SMART on FHIR, consolidate health records from multiple sources, and view AI-powered insights about their own health data.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Data Privacy and Security</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Local Processing Only:</strong> All health data retrieved through ClinQuilt is processed entirely within your browser. No Protected Health Information (PHI) is transmitted to ClinQuilt's servers at any time.</li>
              <li><strong>No Data Storage:</strong> ClinQuilt does not store, retain, or have access to your health records. Data exists only in your browser session unless you explicitly enable local persistence.</li>
              <li><strong>SMART on FHIR Authentication:</strong> When connecting to a hospital, you authenticate directly with that hospital's secure login system. ClinQuilt never receives or stores your hospital credentials.</li>
              <li><strong>Session Clearing:</strong> Your health data is automatically cleared when you close the browser session, unless local persistence is enabled by you.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Authorized Use</h2>
            <p>ClinQuilt is intended solely for use by the patient whose health records are being accessed, or by a legally authorized representative (e.g., parent of a minor, healthcare proxy). You agree to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Access only your own health records or records for individuals you are legally authorized to access.</li>
              <li>Not use ClinQuilt for any commercial, research, or population health purposes without explicit written consent.</li>
              <li>Not attempt to reverse-engineer, copy, modify, or distribute the application.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Not Medical Advice</h2>
            <p>ClinQuilt is an informational tool only. The AI-generated summaries and insights provided are not medical advice, diagnosis, or treatment recommendations. Always consult a qualified healthcare provider for medical decisions. Do not delay seeking medical attention based on information viewed in ClinQuilt.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Third-Party Health Systems</h2>
            <p>ClinQuilt connects to third-party healthcare organizations' FHIR APIs. The accuracy, completeness, and availability of data returned is the responsibility of those healthcare organizations. ClinQuilt makes no warranties about the data received from connected health systems.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Disclaimer of Warranties</h2>
            <p>ClinQuilt is provided "as is" without warranties of any kind, express or implied. We do not warrant that the service will be uninterrupted, error-free, or that data displayed will be complete or accurate.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, ClinQuilt and its developers shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the application, including but not limited to any clinical decisions made based on data viewed in the app.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Changes to Terms</h2>
            <p>We may update these Terms from time to time. Continued use of ClinQuilt after changes are posted constitutes your acceptance of the revised Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Contact</h2>
            <p>For questions about these Terms, contact us at: <a href="mailto:support@clinquilt.com" className="text-blue-600 hover:underline">support@clinquilt.com</a></p>
          </section>

        </div>

        <div className="mt-6 flex gap-4 text-sm text-gray-500">
          <a href="/" className="hover:text-gray-700">← Back to App</a>
          <span>·</span>
          <a href="/privacy" className="hover:text-gray-700">Privacy Policy</a>
        </div>
      </div>
    </div>
  )
}
