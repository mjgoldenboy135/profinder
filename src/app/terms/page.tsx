import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Terms & Conditions — Profinder",
  description: "The terms that govern your use of Profinder.",
};

const EFFECTIVE_DATE = "July 13, 2026";
const CONTACT_EMAIL = "mjgoldenboy135@gmail.com";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold font-headline">{title}</h2>
      <div className="text-foreground/85 space-y-2 leading-relaxed">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="py-8">
      <Card className="w-full max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Terms &amp; Conditions</CardTitle>
          <CardDescription>Effective date: {EFFECTIVE_DATE}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Section title="1. Acceptance of These Terms">
            <p>
              Profinder (&quot;the Service&quot;, &quot;we&quot;, &quot;us&quot;) is a professional networking
              platform that lets you create a profile, discover other professionals, chat, and — if you
              choose — share your location on a map. By creating an account or using the Service, you
              agree to these Terms &amp; Conditions and to our{" "}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. If
              you do not agree, please do not use the Service.
            </p>
          </Section>

          <Section title="2. Eligibility">
            <p>
              You must be at least 18 years old to use Profinder. By registering, you confirm that you
              meet this requirement and that the information you provide is accurate and belongs to you.
            </p>
          </Section>

          <Section title="3. Your Account">
            <p>
              You are responsible for keeping your password confidential and for all activity that
              happens under your account. Notify us immediately if you believe your account has been
              compromised. We may suspend or terminate accounts that violate these Terms.
            </p>
          </Section>

          <Section title="4. Acceptable Use">
            <p>You agree NOT to use the Service to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>impersonate any person, or provide false professional credentials;</li>
              <li>harass, threaten, stalk, spam, or defraud other users;</li>
              <li>post content that is illegal, hateful, obscene, or infringes others&apos; rights;</li>
              <li>collect or scrape other users&apos; data, or use the Service for unsolicited marketing;</li>
              <li>attempt to breach, probe, or disrupt the security of the Service;</li>
              <li>use another user&apos;s shared location to follow, intimidate, or harm them.</li>
            </ul>
            <p>We may remove content or accounts that break these rules, at our sole discretion.</p>
          </Section>

          <Section title="5. Location Sharing">
            <p>
              Sharing your location on the map is entirely optional and controlled by you through the
              &quot;Appear Online&quot; switch and your visibility settings. You understand that any
              location you choose to share will be visible to other users according to those settings,
              and you share it at your own risk. Never rely on the Service for personal safety decisions.
            </p>
          </Section>

          <Section title="6. Your Content">
            <p>
              You keep ownership of the content you post (profile details, photos, messages). By posting
              it, you grant us a non-exclusive, worldwide licence to host, display, and transmit that
              content solely to operate the Service. You are responsible for what you post — do not
              share anything you don&apos;t have the right to share.
            </p>
          </Section>

          <Section title="7. Interactions Between Users">
            <p>
              Profinder only provides the platform. We do not vet, endorse, or guarantee any user, their
              credentials, or anything they say or offer. Meetings, transactions, or professional
              engagements you enter into with other users are strictly between you and them. Exercise
              common-sense caution, especially before meeting anyone in person.
            </p>
          </Section>

          <Section title="8. Third-Party Services">
            <p>
              The Service relies on third-party providers — for example Google (sign-in), MapTiler and
              OpenStreetMap (map tiles), Brevo (email delivery), and Render (hosting). Their services
              are subject to their own terms and privacy policies, which we do not control.
            </p>
          </Section>

          <Section title="9. Service Availability & Changes">
            <p>
              The Service is provided free of charge and &quot;as is&quot;, without warranties of any
              kind, express or implied. We may modify, suspend, or discontinue any part of the Service
              at any time without notice, and we do not guarantee uninterrupted or error-free operation
              or that data will never be lost. Please keep copies of anything important.
            </p>
          </Section>

          <Section title="10. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, Profinder and its operator shall not be liable for
              any indirect, incidental, special, consequential, or punitive damages — including loss of
              data, profits, reputation, or personal injury — arising from your use of the Service or
              your interactions with other users. Where liability cannot be excluded, it is limited to
              the amount you paid us to use the Service (currently zero).
            </p>
          </Section>

          <Section title="11. Indemnity">
            <p>
              You agree to indemnify and hold harmless Profinder and its operator from claims, damages,
              and expenses (including reasonable legal fees) arising from your content, your use of the
              Service, or your violation of these Terms or of any law or third-party right.
            </p>
          </Section>

          <Section title="12. Termination & Account Deletion">
            <p>
              You may delete your account at any time from your profile page (&quot;Delete
              Profile&quot;), which permanently removes your account, profile, messages, and
              conversations. We may suspend or terminate your access if you breach these Terms.
              Sections 6, 10, 11, and 13 survive termination.
            </p>
          </Section>

          <Section title="13. Governing Law">
            <p>
              These Terms are governed by the laws of India. Any disputes shall be subject to the
              exclusive jurisdiction of the courts of India.
            </p>
          </Section>

          <Section title="14. Changes to These Terms">
            <p>
              We may update these Terms from time to time. The &quot;Effective date&quot; above shows
              the latest revision, and continued use of the Service after changes means you accept the
              updated Terms.
            </p>
          </Section>

          <Section title="15. Contact">
            <p>
              Questions about these Terms? Contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
            </p>
          </Section>
        </CardContent>
      </Card>
    </div>
  );
}
