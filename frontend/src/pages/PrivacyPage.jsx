export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mt-2">Last updated: June 14, 2026</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-8 text-gray-700 leading-relaxed">

          <section className="bg-green-50 border border-green-200 rounded-xl p-5">
            <p className="text-green-900 font-semibold text-sm">🔒 Core Privacy Guarantee</p>
            <p className="text-green-800 text-sm mt-1">ClinQuilt does not collect, store, transmit, or have access to your health records or Protected Health Information (PHI) at any time. All data processing occurs locally in your browser.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. What Data We Collect</h2>
            <p className="mb-3"><strong>Health Records:</strong> When you connect to a hospital, your health records are fetched from that hospital's FHIR API and stored only in your browser's memory for the duration of your session. This data is never sent to ClinQuilt's servers.</p>
            <p className="mb-3"><strong>Optional Local Persistence:</strong> If you enable local data persistence, encrypted health data may be stored in your browser's local storage (IndexedDB) using AES-256 encryption. This data never leaves your device.</p>
            <p><strong>Usage Analytics:</strong> ClinQuilt does not use analytics trackers, advertising SDKs, or telemetry of any kind. We do not track your usage, clicks, or behavior.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. How Your Health Data Is Used</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To display your health records in a unified, readable interface</li>
              <li>To generate AI-powered health summaries using local or cloud AI (configurable by you)</li>
              <li>To export PDF summaries you choose to share with care providers</li>
            </ul>
            <p className="mt-3">Your health data is <strong>never</strong> used for advertising, research, sold to third parties, or shared with any entity other than what you explicitly authorize.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Hospital Connections (SMART on FHIR)</h2>
            <p>When you connect to a hospital, you are redirected to that hospital's secure authentication portal. ClinQuilt:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Never sees or stores your hospital username or password</li>
              <li>Receives a temporary OAuth2 access token from the hospital, valid only for your session</li>
              <li>Uses that token to retrieve your records directly from the hospital's FHIR API</li>
              <li>Does not retain the access token after your session ends</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. AI Features</h2>
            <p>ClinQuilt offers AI-powered health summaries with three modes you control:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Local AI (default):</strong> Summaries are generated using rule-based logic entirely in your browser. No data leaves your device.</li>
              <li><strong>Browser AI:</strong> Uses the browser's built-in on-device AI (e.g., Chrome AI). Data stays on your device.</li>
              <li><strong>Cloud AI (optional):</strong> If you configure a cloud AI API key (e.g., OpenAI), a de-identified summary request may be sent. You are informed before enabling this mode and your full PHI is never transmitted.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Data Deletion</h2>
            <p>You can delete all locally stored data at any time by:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Clicking the "Clear All Data" button in the app (trash icon in the header)</li>
              <li>Closing your browser tab (session data is cleared automatically)</li>
              <li>Clearing your browser's site data in browser settings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Children's Privacy</h2>
            <p>ClinQuilt may be used by a parent or legal guardian to access the health records of a minor child, where permitted by the connected healthcare organization. We do not knowingly collect personal information from children independently.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. HIPAA</h2>
            <p>ClinQuilt operates as a patient-directed tool under the HIPAA right of access. As a personal health record application that does not store PHI on its servers, ClinQuilt is not a HIPAA-covered entity. The healthcare organizations you connect to remain responsible for their compliance obligations.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Changes to This Policy</h2>
            <p>We may update this Privacy Policy to reflect changes in our practices. The updated date at the top of this page will reflect any changes. Continued use of ClinQuilt constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Contact</h2>
            <p>For privacy questions or concerns: <a href="mailto:privacy@clinquilt.com" className="text-blue-600 hover:underline">privacy@clinquilt.com</a></p>
          </section>

        </div>

        <div className="mt-6 flex gap-4 text-sm text-gray-500">
          <a href="/" className="hover:text-gray-700">← Back to App</a>
          <span>·</span>
          <a href="/terms" className="hover:text-gray-700">Terms and Conditions</a>
        </div>
      </div>
    </div>
  )
}
