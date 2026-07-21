import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Child Safety Standards — Profinder",
  description:
    "Profinder's standards against child sexual abuse and exploitation (CSAE), and how to report it.",
};

const EFFECTIVE_DATE = "July 19, 2026";
const CONTACT_EMAIL = "mjgoldenboy135@gmail.com";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold font-headline">{title}</h2>
      <div className="text-foreground/85 space-y-2 leading-relaxed">{children}</div>
    </section>
  );
}

export default function ChildSafetyPage() {
  return (
    <div className="py-8">
      <Card className="w-full max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Child Safety Standards</CardTitle>
          <CardDescription>Effective date: {EFFECTIVE_DATE}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Section title="1. Our Commitment">
            <p>
              Profinder has a <strong>zero-tolerance policy</strong> toward child sexual abuse and
              exploitation (CSAE) and child sexual abuse material (CSAM). We are committed to keeping
              our platform safe and to preventing, detecting, and removing any content or conduct
              that sexualizes, endangers, or exploits children. These standards apply to every user
              of the Service.
            </p>
          </Section>

          <Section title="2. Prohibited Content and Conduct">
            <p>The following are strictly forbidden on Profinder, without exception:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Child sexual abuse material (CSAM) in any form.</li>
              <li>The sexualization of minors, or sexually suggestive content involving minors.</li>
              <li>Grooming, enticement, or any attempt to sexually exploit or abuse a child.</li>
              <li>Trafficking, solicitation, or the facilitation of harm to a minor.</li>
              <li>Sharing, requesting, or linking to any of the above.</li>
            </ul>
            <p>
              Profinder is intended for adult professionals and is <strong>not directed at
              children</strong>. Users must meet the minimum age required by our{" "}
              <Link href="/terms" className="text-primary hover:underline">Terms &amp; Conditions</Link>{" "}
              and applicable law.
            </p>
          </Section>

          <Section title="3. How to Report">
            <p>Anyone can report CSAE content or conduct, quickly and confidentially:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>In the app:</strong> open the profile of the user in question and use{" "}
                <strong>Report User</strong> (choose &quot;Inappropriate content&quot; or
                &quot;Other&quot;), and <strong>Block User</strong> to stop all contact.
              </li>
              <li>
                <strong>By email:</strong> contact our child-safety point of contact at{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                  {CONTACT_EMAIL}
                </a>
                . Reports are treated as urgent.
              </li>
            </ul>
          </Section>

          <Section title="4. How We Respond">
            <p>When we become aware of CSAE content or conduct, we act promptly to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Remove the offending content and preserve relevant evidence.</li>
              <li>Suspend or permanently ban the responsible account(s).</li>
              <li>
                Report confirmed CSAM to the appropriate authorities, including the National Center
                for Missing &amp; Exploited Children (NCMEC) and/or local law enforcement, as
                required by law.
              </li>
              <li>Cooperate with lawful requests from child-protection authorities.</li>
            </ul>
          </Section>

          <Section title="5. Point of Contact">
            <p>
              Our designated child-safety point of contact can be reached at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                {CONTACT_EMAIL}
              </a>
              . We are committed to complying with applicable child-safety laws and with the child
              safety standards of the platforms through which Profinder is distributed.
            </p>
          </Section>

          <Section title="6. Related Policies">
            <p>
              These standards work together with our{" "}
              <Link href="/terms" className="text-primary hover:underline">Terms &amp; Conditions</Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
          </Section>
        </CardContent>
      </Card>
    </div>
  );
}
