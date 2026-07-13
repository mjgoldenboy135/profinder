import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Privacy Policy — Profinder",
  description: "How Profinder collects, uses, and protects your information.",
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

export default function PrivacyPage() {
  return (
    <div className="py-8">
      <Card className="w-full max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Privacy Policy</CardTitle>
          <CardDescription>Effective date: {EFFECTIVE_DATE}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Section title="1. What This Policy Covers">
            <p>
              This policy explains what information Profinder (&quot;we&quot;, &quot;us&quot;) collects
              when you use the Service, how we use it, who can see it, and the choices you have. It
              works together with our{" "}
              <Link href="/terms" className="text-primary hover:underline">Terms &amp; Conditions</Link>.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Account information</strong> — your name, email address, and a hashed password
                (we never store your password in readable form). If you sign in with Google, we receive
                your name and email from Google instead.
              </li>
              <li>
                <strong>Profile information you choose to add</strong> — profession, education,
                experience, bio, phone number, LinkedIn URL, profile photo, and a general address.
              </li>
              <li>
                <strong>Location</strong> — your precise location is collected <em>only</em> while you
                turn on &quot;Appear Online &amp; on Map&quot;, and stops updating when you turn it off.
              </li>
              <li>
                <strong>Messages</strong> — chats you send are stored so they can be delivered and shown
                to you and the recipient.
              </li>
              <li>
                <strong>Technical data</strong> — standard server logs (IP address, request times)
                needed to run and secure the Service.
              </li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Information">
            <ul className="list-disc pl-6 space-y-1">
              <li>to create and operate your account and profile;</li>
              <li>to show you and other users on the map, according to your visibility settings;</li>
              <li>to deliver chat messages between you and other users;</li>
              <li>to send account emails — verification and password reset (we do not send marketing emails);</li>
              <li>to keep the Service secure and prevent abuse.</li>
            </ul>
            <p>We do <strong>not</strong> sell your personal information to anyone.</p>
          </Section>

          <Section title="4. What Other Users Can See">
            <ul className="list-disc pl-6 space-y-1">
              <li>Your profile (name, photo, profession, bio, education, experience) is visible to logged-in users.</li>
              <li>
                Your email and phone number are shown <em>only</em> if you enable &quot;Show Contact
                Information&quot;.
              </li>
              <li>
                Your map location is shown <em>only</em> while you are online, and only to the audience
                you pick in &quot;Location Visibility&quot; (everyone, favorites only, or nobody).
              </li>
              <li>Messages are visible only to you and the person you&apos;re chatting with.</li>
            </ul>
          </Section>

          <Section title="5. Service Providers We Rely On">
            <p>
              We share data only with the providers needed to run the Service: Render (hosting and
              database), Brevo (sending verification and password-reset emails), Google (only if you
              use &quot;Sign in with Google&quot;), and MapTiler/OpenStreetMap (map tiles — they receive
              standard web requests when the map loads). Each processes data under its own privacy
              policy.
            </p>
          </Section>

          <Section title="6. Security">
            <p>
              All traffic to the Service is encrypted with HTTPS, passwords are stored hashed, and
              access to production systems is restricted. No online service can guarantee perfect
              security, so please use a unique password and keep it private.
            </p>
          </Section>

          <Section title="7. Data Retention & Deletion">
            <p>
              We keep your data while your account exists. Deleting your account (&quot;Delete
              Profile&quot; on your profile page) permanently removes your account, profile, photo,
              messages, and conversations from our database. Server logs are retained briefly for
              security and then rotated away.
            </p>
          </Section>

          <Section title="8. Your Choices & Rights">
            <ul className="list-disc pl-6 space-y-1">
              <li>view and edit all your profile information at any time from your profile page;</li>
              <li>control location sharing and contact-info visibility with in-app switches;</li>
              <li>delete your account yourself, permanently, at any time;</li>
              <li>
                email us at{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>{" "}
                to ask what data we hold about you or to request a correction.
              </li>
            </ul>
          </Section>

          <Section title="9. Children">
            <p>
              Profinder is for adults (18+). We do not knowingly collect data from anyone under 18; if
              we learn we have, we will delete it.
            </p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>
              If we change this policy, we will update the effective date above. Significant changes
              may also be announced in the app. Continued use after changes means you accept the
              updated policy.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              Privacy questions or requests:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
            </p>
          </Section>
        </CardContent>
      </Card>
    </div>
  );
}
