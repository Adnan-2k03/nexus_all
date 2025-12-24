import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function ChildSafetyStandards() {
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
            <h1 className="text-4xl font-bold mb-2 text-cyan-400">Child Safety Standards</h1>
            <p className="text-muted-foreground">Last Updated: December 2025</p>
          </div>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">1. Our Commitment to Child Safety</h2>
            <p>
              NexusMatch is a gaming-focused social platform dedicated to connecting gamers safely. We maintain special protections for minors and comply with COPPA, GDPR, and all applicable child safety regulations.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">2. Age Verification & Account Management</h2>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li><strong>Minimum age:</strong> 13+ to create an account</li>
              <li>Age verification via email or phone during signup</li>
              <li>Users under 18 have restricted features (limited voice channel access, privacy controls)</li>
              <li>Automatic age gate before accessing certain features</li>
              <li>Parents can report underage accounts: <strong>1mdadnan2003@gmail.com</strong></li>
              <li>Account deletion available for all users upon request</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">3. Gaming Matchmaking Safety</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-green-400">Currently Enforced:</h3>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>User profiles reviewed before match connections are made</li>
                  <li>Match history visible for context</li>
                  <li>Block list enforcement (blocked users cannot match with you)</li>
                  <li>Account status check (banned users cannot initiate matches)</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-400">Will Add Soon:</h3>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Skill level verification to prevent predatory matching</li>
                  <li>Gamertag validation to detect suspicious patterns</li>
                  <li>Automated detection of problematic matching behaviors</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">4. Voice Channel Safety</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-green-400">Currently Enforced:</h3>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>1-on-1 voice channels restricted to connected users only</li>
                  <li>Group voice channels require explicit invitation</li>
                  <li>Host controls: ability to remove participants from group channels</li>
                  <li>Users can disconnect at any time</li>
                  <li>Mute button always available to participants</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-400">Will Add Soon:</h3>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Real-time moderation of voice content</li>
                  <li>Audio metadata logging for safety review</li>
                  <li>Users under 18 cannot be auto-added to group channels</li>
                  <li>Emergency disconnect reporting for inappropriate behavior</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">5. Profile & Content Protection</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-green-400">Currently Enforced:</h3>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>User bios filtered for extreme profanity</li>
                  <li>Portfolio pages limited to gaming achievements and hobbies</li>
                  <li>Profile images required (helps verify legitimate accounts)</li>
                  <li>Real-world location restricted to region-level only</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-400">Will Add Soon:</h3>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>AI scanning of portfolio pages for inappropriate content</li>
                  <li>Game achievements verified against official gaming databases</li>
                  <li>Automated detection of grooming language in bios</li>
                  <li>Advanced image scanning for violations</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">6. User Profiles & Privacy for Minors</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-green-400">Currently Enforced:</h3>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Users under 18 have automatically restricted profiles</li>
                  <li>Email/phone numbers hidden from all non-connected users</li>
                  <li>Gamertag-only visibility for non-connected users</li>
                  <li>Mutual interests/games only visible to connections</li>
                  <li>Portfolio pages visible only to connections (invitation-only)</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-400">Will Add Soon:</h3>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Dynamic privacy controls based on age</li>
                  <li>Parental override options for parent-supervised accounts</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">7. Chat & Message Safety</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-green-400">Currently Enforced:</h3>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Users can block individual message senders</li>
                  <li>Block enforcement: blocked users cannot message you</li>
                  <li>Message history retained for safety review (90 days)</li>
                  <li>Users can report messages with one-click reporting</li>
                  <li>Users can delete their own messages</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-400">Will Add Soon:</h3>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>AI-powered moderation scanning for grooming language</li>
                  <li>Automated filters for sexual content and exploitation terms</li>
                  <li>Real-time keyword detection for harmful content</li>
                  <li>Group chat invites with acceptance mechanism</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">8. Reporting & User Safety</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-green-400">In-App Reporting (Currently Active):</h3>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>One-click report button on profiles, messages, voice channels</li>
                  <li>Report categories: grooming, harassment, inappropriate content, underage user</li>
                  <li>Reports reviewed within 48 hours</li>
                  <li>User receives status update on report outcome</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Safety Contact:</h3>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Email: <strong>1mdadnan2003@gmail.com</strong></li>
                  <li>Response time: 48 hours for all reports</li>
                  <li>Escalation to law enforcement for serious violations</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-400">Will Add Soon:</h3>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Automated acknowledgment when report is submitted</li>
                  <li>Real-time updates on report status</li>
                  <li>Community safety dashboard showing enforcement actions</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">9. Community Standards & Enforcement</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Prohibited Behaviors:</h3>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Distribution of child sexual abuse material (CSAM)</li>
                  <li>Grooming or sexual exploitation of minors</li>
                  <li>Harassment, bullying, or targeted abuse</li>
                  <li>Impersonation or identity theft</li>
                  <li>Severe gaming-related toxicity/hate speech</li>
                  <li>Spam, bot accounts, or fake profiles</li>
                  <li>Collection of personal information from minors without consent</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-400">Enforcement Actions (Current):</h3>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>First violation: Warning + temporary account suspension (1-7 days)</li>
                  <li>Second violation: Extended suspension or permanent ban</li>
                  <li>Serious violations (CSAM, grooming): Immediate permanent ban + law enforcement report</li>
                  <li>Banned users cannot create new accounts on platform</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">10. Block & Filter Controls</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-green-400">Currently Enforced:</h3>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Users can block other users at any time</li>
                  <li>Blocked users cannot: send messages, match, view profile, add to voice channels</li>
                  <li>Block list management accessible in account settings</li>
                  <li>One-click unblock option available</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-400">Will Add Soon:</h3>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Suggested blocks for suspicious accounts targeting minors</li>
                  <li>Block analytics to detect coordinated harassment</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">11. Data Protection & Privacy</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-green-400">Currently Enforced:</h3>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>User data encrypted in transit (HTTPS only)</li>
                  <li>Passwords hashed and salted before storage</li>
                  <li>GDPR-compliant data handling</li>
                  <li>User right to data access honored within 30 days</li>
                  <li>User right to deletion honored within 30 days</li>
                  <li>No third-party data sharing without explicit user consent</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-400">Will Add Soon:</h3>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>End-to-end encryption for direct messages</li>
                  <li>Zero-knowledge verification options</li>
                  <li>Regular security audits and penetration testing</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">12. Authority Reporting</h2>
            <p>NexusMatch complies with:</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>NCMEC (National Center for Missing & Exploited Children) - mandatory CSAM reporting</li>
              <li>FBI cybercrimes division - coordinated criminal reporting</li>
              <li>Regional law enforcement - legal requests and warrants</li>
              <li>Gaming platform authorities - cross-ecosystem violation reporting</li>
              <li>Mandatory reporter obligations where applicable</li>
            </ul>
            <p className="text-sm mt-4">
              Our safety team escalates confirmed violations to appropriate authorities, maintains legal hold on evidence during investigations, and cooperates with law enforcement upon legal request.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-cyan-400">13. Emergency Contact</h2>
            <div className="bg-card p-4 rounded-md border mt-2 space-y-2">
              <p><strong>For Child Safety Concerns:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Email: <strong>1mdadnan2003@gmail.com</strong></li>
                <li>We respond to all reports within 48 hours</li>
                <li>For emergency situations: contact local law enforcement directly</li>
                <li>To report CSAM: contact NCMEC at CyberTipline.org</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4 mt-8 pt-8 border-t border-muted">
            <p className="text-sm text-muted-foreground">
              <strong>Last Updated:</strong> December 24, 2025<br/>
              <strong>Next Review:</strong> March 24, 2026
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
