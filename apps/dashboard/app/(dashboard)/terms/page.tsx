export default function TermsPage() {
  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      
      <div className="prose prose-gray max-w-none">
        <p className="text-muted-foreground mb-4">Last updated: {new Date().toLocaleDateString()}</p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
        <p>
          By accessing and using Devora AI Code Review Platform, you accept and agree to be bound by the terms
          and provision of this agreement.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">2. Use License</h2>
        <p>
          Permission is granted to temporarily access and use the platform for code review and analysis purposes.
          This is the grant of a license, not a transfer of title.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">3. Service Description</h2>
        <p>
          Devora provides AI-powered code review services including:
        </p>
        <ul className="list-disc pl-6 mt-2">
          <li>Automated code analysis</li>
          <li>Security vulnerability detection</li>
          <li>Performance optimization recommendations</li>
          <li>Multi-agent code review</li>
          <li>GraphRAG-powered insights</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">4. User Responsibilities</h2>
        <p>Users are responsible for:</p>
        <ul className="list-disc pl-6 mt-2">
          <li>Maintaining the confidentiality of account credentials</li>
          <li>All activities that occur under their account</li>
          <li>Ensuring uploaded code complies with applicable laws</li>
          <li>Not attempting to bypass security measures</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">5. Data Processing</h2>
        <p>
          Your code and analysis results are processed according to our Privacy Policy. We use industry-standard
          security measures to protect your data.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">6. Intellectual Property</h2>
        <p>
          The platform and its original content, features, and functionality are owned by Devora and are
          protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">7. Limitation of Liability</h2>
        <p>
          Devora shall not be liable for any indirect, incidental, special, consequential, or punitive damages
          resulting from your use of or inability to use the service.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">8. Contact</h2>
        <p>
          For questions about these Terms, please contact us at: bejaouiahmed053@gmail.com
        </p>
      </div>
    </div>
  );
}
