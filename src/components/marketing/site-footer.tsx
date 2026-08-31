const columns = [
  {
    title: 'Platform',
    links: [
      { label: 'The system', href: '#system' },
      { label: 'Five engines', href: '#engines' },
      { label: 'Campaign workflow', href: '#workflow' },
      { label: 'Why HubElites', href: '#difference' },
    ],
  },
  {
    title: 'Get started',
    links: [
      { label: 'Start building', href: '/onboarding' },
      { label: 'Log in', href: '/login' },
      { label: 'Ambassador dashboard', href: '/dashboard' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Independence notice', href: '#faq' },
      { label: 'Privacy', href: '#faq' },
      { label: 'Terms', href: '#faq' },
      { label: 'Contact', href: 'mailto:hello@hubelites.com' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <a className="logo" href="/">
              <span className="logo-mark">
                <span>H</span>
              </span>
              HubElites
            </a>
            <p>
              The demand engine in front of your funnel. HubElites plans the campaign, creates the media and sends the
              traffic — your Ambassador domain keeps the conversion and the attribution.
            </p>
          </div>

          {columns.map((column) => (
            <div className="footer-col" key={column.title}>
              <h4>{column.title}</h4>
              {column.links.map((link) => (
                <a key={link.label} href={link.href}>
                  {link.label}
                </a>
              ))}
            </div>
          ))}
        </div>

        <div className="footer-base">
          <span>© {new Date().getFullYear()} HubElites. All rights reserved.</span>
          <span>Independent platform for eStage Ambassadors. Not affiliated with or endorsed by eStage.</span>
        </div>
      </div>
    </footer>
  );
}
