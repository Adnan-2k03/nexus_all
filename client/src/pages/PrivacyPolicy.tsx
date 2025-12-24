import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Back Button */}
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-cyan-400 hover:underline mb-8"
          data-testid="button-back-to-landing"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Landing
        </button>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-cyan-400">Privacy Policy</h1>
            <p className="text-muted-foreground">Last updated: December 2025</p>
          </div>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">1. Introduction</h2>
            <p>
              Nexus Match ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and mobile applications (collectively, the "Service").
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">2. Information We Collect</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold">Personal Information</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  We collect information that you voluntarily provide to us when you:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Create an account or register for the Service</li>
                  <li>Complete your gaming profile (gamertag, bio, preferred games, etc.)</li>
                  <li>Upload profile images or game portfolios</li>
                  <li>Communicate with other users through chat or voice channels</li>
                  <li>Submit feedback, bug reports, or contact us for support</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold">Authentication Data</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  When you sign up using Google, Discord, or our custom authentication system, we receive and store authentication credentials securely, including:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Email address</li>
                  <li>Name (from OAuth providers)</li>
                  <li>Profile image (if available)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold">Usage Data</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  We automatically collect information about your interactions with our Service:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>IP address and device information</li>
                  <li>Browser type and version</li>
                  <li>Pages you visit and features you use</li>
                  <li>Time and date stamps of your activities</li>
                  <li>Voice and chat communication metadata (not content)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold">Location Data</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You may optionally provide your location (latitude, longitude, region) to help with player matching and discovery. This data is stored securely.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">3. How We Use Your Information</h2>
            <p>We use the information we collect for the following purposes:</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Provide, maintain, and improve the Service</li>
              <li>Enable matchmaking and player discovery features</li>
              <li>Facilitate real-time communication (chat and voice)</li>
              <li>Send notifications about matches, requests, and messages</li>
              <li>Authenticate and secure your account</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Display targeted advertisements (with proper consent)</li>
              <li>Analyze usage patterns to improve user experience</li>
              <li>Comply with legal obligations</li>
              <li>Detect, prevent, and address fraud or security issues</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">4. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your personal information, including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Encrypted data transmission (HTTPS/TLS)</li>
              <li>End-to-end encryption for voice communications (WebRTC)</li>
              <li>Secure password storage using industry-standard hashing</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Access controls and authentication mechanisms</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              However, no method of transmission over the internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">5. Data Sharing and Disclosure</h2>
            <p>We may share your information in the following circumstances:</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li><strong>Service Providers:</strong> Third-party vendors who assist us (hosting, analytics, payment processing)</li>
              <li><strong>Other Users:</strong> Your gamertag, profile image, and bio are visible to other players for matchmaking</li>
              <li><strong>Legal Compliance:</strong> When required by law or in response to legal process</li>
              <li><strong>Safety:</strong> To protect against fraud, security threats, or user safety</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              We do not sell your personal information to third parties for marketing purposes.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">6. Your Privacy Rights</h2>
            <p>Depending on your location, you may have the following rights:</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li><strong>Access:</strong> Request access to your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your data (subject to legal requirements)</li>
              <li><strong>Portability:</strong> Request your data in a portable format</li>
              <li><strong>Opt-Out:</strong> Opt out of marketing communications and non-essential data processing</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              To exercise these rights, please contact us at rxplorerh@gmail.com.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">7. Cookies and Tracking Technologies</h2>
            <p>
              We use cookies and similar tracking technologies to enhance your experience, remember preferences, and analyze usage patterns. You can control cookie settings through your browser, but disabling cookies may limit Service functionality.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">8. Children's Privacy</h2>
            <p>
              Nexus Match is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected information from a child under 13, we will take steps to delete such information and terminate the child's account.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">9. Third-Party Links</h2>
            <p>
              Our Service may contain links to third-party websites. We are not responsible for their privacy practices. We encourage you to review their privacy policies before providing personal information.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">10. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to provide the Service and comply with legal obligations. You may request deletion of your account and associated data at any time by contacting us.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">11. International Data Transfers</h2>
            <p>
              Your information may be transferred to, stored in, and processed in countries other than your country of residence. These countries may have data protection laws that differ from your home country. By using Nexus Match, you consent to such transfers.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">12. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our privacy practices, please contact us at:
            </p>
            <div className="bg-card p-4 rounded-md border mt-2">
              <p className="font-semibold">Email:</p>
              <a href="mailto:rxplorerh@gmail.com" className="text-cyan-400 hover:underline">
                rxplorerh@gmail.com
              </a>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">13. Policy Updates</h2>
            <p>
              We may update this Privacy Policy periodically to reflect changes in our practices or legal requirements. We will notify you of significant changes by updating the "Last updated" date at the top of this policy. Your continued use of the Service constitutes acceptance of the updated Privacy Policy.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
