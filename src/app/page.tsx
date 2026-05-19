import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-radar-bg dot-grid">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-radar-border bg-radar-bg/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-radar-accent font-mono text-lg font-semibold radar-text-glow">
              ◎ LaunchRadar
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-radar-text-muted hover:text-radar-text text-sm transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="bg-radar-accent text-radar-bg text-sm font-semibold px-4 py-1.5 rounded hover:bg-radar-accent-dim transition-colors"
            >
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="pt-32 pb-24 px-6 max-w-6xl mx-auto">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 border border-radar-border bg-radar-surface px-3 py-1 rounded-full mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-radar-accent animate-pulse-slow" />
            <span className="text-radar-text-muted text-xs font-mono">
              Monitoring 1,200+ competitor pages
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight mb-6 animate-slide-up">
            Track every move
            <br />
            <span className="text-radar-accent radar-text-glow">
              your competitors make
            </span>
          </h1>

          <p className="text-radar-text-muted text-lg md:text-xl leading-relaxed mb-10 max-w-xl animate-slide-up">
            Get alerted the moment competitors change pricing, reposition their
            messaging, or quietly launch new features.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-slide-up">
            <Link
              href="/auth/signup"
              className="bg-radar-accent text-radar-bg font-semibold px-6 py-3 rounded-lg hover:bg-radar-accent-dim transition-colors radar-glow text-base"
            >
              Start tracking free →
            </Link>
            <span className="text-radar-text-muted text-sm">
              No credit card · 2 competitors free
            </span>
          </div>
        </div>

        {/* Feature grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="border border-radar-border bg-radar-surface rounded-lg p-5 hover:border-radar-accent/30 transition-colors"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="text-radar-accent font-mono text-xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-radar-text mb-1">{f.title}</h3>
              <p className="text-radar-text-muted text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="mt-24">
          <h2 className="text-2xl font-bold mb-2">
            How it works
          </h2>
          <p className="text-radar-text-muted mb-10">Up and running in 60 seconds.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <div key={step.title} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full border border-radar-accent/40 bg-radar-surface flex items-center justify-center font-mono text-radar-accent text-sm font-bold">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-radar-text mb-1">{step.title}</h3>
                  <p className="text-radar-text-muted text-sm">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing teaser */}
        <div className="mt-24 border border-radar-border bg-radar-surface rounded-xl p-8 max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xs font-mono text-radar-text-muted uppercase tracking-widest mb-1">Free plan</div>
              <div className="text-3xl font-bold">€0</div>
            </div>
            <div className="border border-radar-border rounded-lg px-4 py-3 text-center">
              <div className="text-xs font-mono text-radar-text-muted uppercase tracking-widest mb-1">Pro plan</div>
              <div className="text-3xl font-bold text-radar-accent">€19<span className="text-base font-normal text-radar-text-muted">/mo</span></div>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-radar-text-muted mb-6">
            {PRICING_FEATURES.map(f => (
              <li key={f.text} className="flex items-center gap-2">
                <span className={f.pro ? 'text-radar-accent' : 'text-radar-text-muted'}>
                  {f.pro ? '◉' : '○'}
                </span>
                {f.text}
              </li>
            ))}
          </ul>
          <Link
            href="/auth/signup"
            className="block text-center bg-radar-accent text-radar-bg font-semibold py-2.5 rounded-lg hover:bg-radar-accent-dim transition-colors"
          >
            Start free — no card needed
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-radar-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-radar-accent font-mono text-sm">◎ LaunchRadar</span>
          <span className="text-radar-text-muted text-xs">
            Built by{' '}
            <a href="https://actonit.pro" className="hover:text-radar-accent transition-colors">
              ActOnIT
            </a>
          </span>
        </div>
      </footer>
    </div>
  )
}

const FEATURES = [
  {
    icon: '◈',
    title: 'Pricing changes',
    desc: 'Know the moment a competitor tweaks their plans, adds tiers, or shifts to annual-only.',
  },
  {
    icon: '⊞',
    title: 'Feature launches',
    desc: 'Catch new features before they appear in case studies or show up in sales calls.',
  },
  {
    icon: '◐',
    title: 'Positioning shifts',
    desc: 'Detect headline and messaging rewrites that signal a strategic pivot.',
  },
  {
    icon: '⊙',
    title: 'Changelog alerts',
    desc: 'Follow changelog and blog pages for release announcements and product updates.',
  },
]

const STEPS = [
  {
    title: 'Add a competitor URL',
    desc: 'Paste in any SaaS domain. LaunchRadar discovers their key pages automatically.',
  },
  {
    title: 'We monitor 24/7',
    desc: 'Pages are crawled every 12 hours. Snapshots are diffed and changes ranked by severity.',
  },
  {
    title: 'You get the summary',
    desc: 'Email alerts include an AI-generated summary of what changed and why it matters.',
  },
]

const PRICING_FEATURES = [
  { text: '2 competitors (Free) / 20 competitors (Pro)', pro: false },
  { text: 'Daily scans (Free) / 12-hour scans (Pro)', pro: false },
  { text: 'Email alerts on change detection', pro: true },
  { text: 'AI-generated change summaries', pro: true },
  { text: 'Full change history & diffs', pro: true },
]
