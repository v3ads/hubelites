import { LegalPage, LegalSection } from '@/components/marketing/legal-page';

export const metadata = {
  title: 'Privacy Policy',
  description: 'How HubElites collects, uses and protects your data.',
};

export default function PrivacyPage() {
  return (
    <LegalPage
      kicker="Legal"
      title="Privacy Policy"
      updated="October 20, 2026"
      intro="This policy explains what HubElites (hubelites.com) collects, why, who processes it for us, and the choices you have. HubElites is an independent platform built for eStage Ambassadors; it is not affiliated with eStage."
    >
      <LegalSection heading="1. What we collect">
        <ul>
          <li>
            <b>Account data</b> — your email address and, if you provide it, your name. Sign-in is passwordless: we
            store no password.
          </li>
          <li>
            <b>Workspace data</b> — the brand profile you set up (business name, website, voice/style choices), your
            Mission 1000 destination URL, the audiences you define, and the channels you tell us you publish to.
          </li>
          <li>
            <b>Campaign data</b> — campaigns and assets you create or generate, their briefs, schedules and status,
            and the performance events recorded for them (such as asset status changes and tracked funnel visits).
          </li>
          <li>
            <b>Credits and billing data</b> — your credit balance and ledger history. Card payments, when offered,
            are processed by our payment provider; we never see or store your full card number.
          </li>
          <li>
            <b>Technical data</b> — the minimum logs needed to run and secure the service (sign-in events, generation
            jobs and their provider costs, errors).
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. How we use it">
        <p>
          We use your data to operate your workspace: authenticate you, generate the campaigns and media you request,
          reserve and charge credits correctly, point your calls to action at your destination, measure what your
          campaigns earn, and improve the recommendations the platform makes to you. We do not sell personal data, and
          we do not use your campaign content to train public AI models.
        </p>
      </LegalSection>

      <LegalSection heading="3. Who processes it for us">
        <p>HubElites runs on a small set of processors, each receiving only what its job requires:</p>
        <ul>
          <li><b>Supabase</b> — database, authentication and file storage.</li>
          <li><b>Vercel</b> — application hosting and delivery.</li>
          <li><b>Brevo</b> — transactional email, including your one-time sign-in codes.</li>
          <li><b>OpenRouter and media providers</b> — the AI models that generate your campaign text and media. Your brief and brand details are sent to generate what you asked for.</li>
          <li><b>Payment provider</b> — when you buy credits, payment processing happens on the provider&apos;s systems.</li>
          <li><b>Channels you connect</b> — when you connect a social account and approve publishing, the approved assets go to that platform under your account.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. Your audience's data">
        <p>
          HubElites creates demand in front of your funnel; registrations and purchases happen on your destination,
          not on HubElites. We do not collect your prospects&apos; registrations, orders or payment details from your
          funnel. If you add prospect information to HubElites yourself, you are responsible for having a lawful basis
          to use it, and we process it only as your workspace data.
        </p>
      </LegalSection>

      <LegalSection heading="5. Cookies and local storage">
        <p>
          HubElites uses the cookies required to keep you signed in securely. Your theme preference (dark/light) is
          stored in your browser&apos;s local storage. We do not use third-party advertising cookies.
        </p>
      </LegalSection>

      <LegalSection heading="6. Retention and deletion">
        <p>
          Workspace data is kept while your account is active. When you close your account, your workspace, campaigns
          and stored media are deleted, except records we must keep for accounting, security or legal reasons (such
          as credit ledger entries), which are retained only as long as those obligations require.
        </p>
      </LegalSection>

      <LegalSection heading="7. Your rights">
        <p>
          You can ask us to access, correct, export or delete your personal data at any time by emailing{' '}
          <a href="mailto:support@hubelites.com">support@hubelites.com</a> from your account email. We respond within
          the timeframe the law applicable to you requires.
        </p>
      </LegalSection>

      <LegalSection heading="8. Security">
        <p>
          Access to workspace data is enforced per tenant at the database level, provider credentials are held
          server-side and never exposed to browsers, and sign-in is by one-time code sent to your email. No system is
          perfectly secure, but we design HubElites so a failure in one workspace cannot expose another.
        </p>
      </LegalSection>

      <LegalSection heading="9. Children and changes">
        <p>
          HubElites is a business tool and is not directed at children under 16. If we change this policy, the new
          version is posted here with a new &ldquo;last updated&rdquo; date, and material changes are announced in the
          product.
        </p>
      </LegalSection>

      <LegalSection heading="10. Contact">
        <p>
          Privacy questions or requests: <a href="mailto:support@hubelites.com">support@hubelites.com</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
