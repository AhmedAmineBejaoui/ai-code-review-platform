export default function PrivacyPage() {
  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      
      <div className="prose prose-gray max-w-none">
        <p className="text-muted-foreground mb-4">Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Information We Collect</h2>
        
        <h3 className="text-xl font-semibold mt-6 mb-3">1.1 Account Information</h3>
        <p>
          When you create an account, we collect your email address, name, and authentication credentials
          managed by Clerk.
        </p>

        <h3 className="text-xl font-semibold mt-6 mb-3">1.2 Code and Analysis Data</h3>
        <p>
          We process the code you submit for review, including:
        </p>
        <ul className="list-disc pl-6 mt-2">
          <li>Source code content</li>
          <li>Repository metadata</li>
          <li>Analysis results and findings</li>
          <li>LLM traces and metrics</li>
        </ul>

        <h3 className="text-xl font-semibold mt-6 mb-3">1.3 Usage Data</h3>
        <p>
          We automatically collect information about how you interact with our service:
        </p>
        <ul className="list-disc pl-6 mt-2">
          <li>API requests and responses</li>
          <li>LLM provider usage (Ollama, Anthropic, OpenAI, Azure)</li>
          <li>Performance metrics</li>
          <li>Error logs</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Your Information</h2>
        <p>We use collected information for:</p>
        <ul className="list-disc pl-6 mt-2">
          <li>Providing code review and analysis services</li>
          <li>Improving our AI models and algorithms</li>
          <li>Generating insights and recommendations</li>
          <li>Monitoring system performance and security</li>
          <li>Communicating with you about service updates</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">3. Data Security</h2>
        <p>
          We implement industry-standard security measures:
        </p>
        <ul className="list-disc pl-6 mt-2">
          <li>Encryption in transit (TLS/HTTPS)</li>
          <li>Encryption at rest for sensitive data</li>
          <li>Access controls and authentication</li>
          <li>Regular security audits</li>
          <li>Secret scanning and redaction</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data Processing Locations</h2>
        <p>
          Your data may be processed in the following locations:
        </p>
        <ul className="list-disc pl-6 mt-2">
          <li><strong>Local Processing (Ollama):</strong> Runs on our servers for CONFIDENTIAL data</li>
          <li><strong>Anthropic (Claude):</strong> US-based cloud processing</li>
          <li><strong>OpenAI (GPT):</strong> US-based cloud processing</li>
          <li><strong>Azure OpenAI:</strong> Region-specific based on your configuration</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">5. Data Retention</h2>
        <p>We retain your data as follows:</p>
        <ul className="list-disc pl-6 mt-2">
          <li><strong>LLM Traces:</strong> 90 days (configurable)</li>
          <li><strong>Analysis Results:</strong> Until you delete them</li>
          <li><strong>Account Data:</strong> Until you delete your account</li>
          <li><strong>Metrics:</strong> Aggregated permanently for analytics</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">6. Third-Party Services</h2>
        <p>We use the following third-party services:</p>
        <ul className="list-disc pl-6 mt-2">
          <li><strong>Clerk:</strong> Authentication and user management</li>
          <li><strong>Anthropic Claude:</strong> AI code analysis</li>
          <li><strong>OpenAI GPT:</strong> AI code analysis</li>
          <li><strong>Langfuse:</strong> LLM observability (optional)</li>
          <li><strong>Sentry:</strong> Error tracking (optional)</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">7. Your Rights</h2>
        <p>You have the right to:</p>
        <ul className="list-disc pl-6 mt-2">
          <li>Access your personal data</li>
          <li>Request data correction</li>
          <li>Request data deletion</li>
          <li>Export your data</li>
          <li>Opt-out of marketing communications</li>
          <li>Choose which LLM provider processes your code</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">8. Cookies and Tracking</h2>
        <p>
          We use cookies for authentication, session management, and analytics. You can control cookies
          through your browser settings.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">9. Children's Privacy</h2>
        <p>
          Our service is not intended for users under 18 years of age. We do not knowingly collect
          personal information from children.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">10. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any changes by
          posting the new Privacy Policy on this page and updating the "Last updated" date.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">11. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, please contact us at:
        </p>
        <ul className="list-none mt-2">
          <li><strong>Email:</strong> bejaouiahmed053@gmail.com</li>
          <li><strong>Organization:</strong> ai-code-review-2026</li>
        </ul>
      </div>
    </div>
  );
}
