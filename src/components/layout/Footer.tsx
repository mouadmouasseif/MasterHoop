import {
  Activity,
  BarChart3,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  Code2,
  Dumbbell,
  Facebook,
  FileText,
  Goal,
  HelpCircle,
  Instagram,
  Linkedin,
  LockKeyhole,
  Mail,
  PlayCircle,
  Send,
  ShieldCheck,
  Trophy,
  UsersRound,
  Youtube,
} from "lucide-react";
import basketMotionAiLogo from "@/src/assets/basketmotion-logo.png";
import { BRAND_NAME, BRAND_SECONDARY_TAGLINE, BRAND_TAGLINE } from "@/src/shared/brand";

const platformLinks = [
  { label: "Features", icon: BarChart3 },
  { label: "How it works", icon: PlayCircle },
  { label: "Live Analysis", icon: Camera },
  { label: "Drills & Workouts", icon: Dumbbell },
  { label: "Progression", icon: Activity },
  { label: "Plans", icon: CalendarDays },
];

const resourceLinks = [
  { label: "Documentation", icon: BookOpen },
  { label: "Guides", icon: FileText },
  { label: "Blog", icon: BookOpen },
  { label: "Case Studies", icon: Trophy },
  { label: "Help Center", icon: HelpCircle },
  { label: "API", icon: Code2 },
];

const companyLinks = [
  { label: "About Us", icon: UsersRound },
  { label: "Our Mission", icon: Goal },
  { label: "Careers", icon: BriefcaseBusiness },
  { label: "Contact Us", icon: Mail },
  { label: "Privacy Policy", icon: ShieldCheck },
  { label: "Terms of Service", icon: FileText },
];

const featureStrip = [
  {
    title: "AI Analytics",
    text: "Advanced computer vision and AI algorithms for movement review.",
    icon: Brain,
  },
  {
    title: "Performance Insights",
    text: "Actionable metrics to track progress and maximize potential.",
    icon: BarChart3,
  },
  {
    title: "Smart Recommendations",
    text: "Personalized drills and training plans generated from observed data.",
    icon: FileText,
  },
  {
    title: "Coach & Team Tools",
    text: "Tools for coaches and clubs to manage athletes and sessions.",
    icon: UsersRound,
  },
  {
    title: "Secure & Reliable",
    text: "Security-first architecture for private performance data.",
    icon: LockKeyhole,
  },
];

const socialLinks = [
  { label: "Instagram", icon: Instagram, href: "https://www.instagram.com/BasketMotionAI" },
  { label: "YouTube", icon: Youtube, href: "https://www.youtube.com/" },
  { label: "LinkedIn", icon: Linkedin, href: "https://www.linkedin.com/" },
  { label: "Facebook", icon: Facebook, href: "https://www.facebook.com/" },
];

export default function Footer() {
  return (
    <footer className="relative mt-12 overflow-hidden border-t border-brand-orange/25 bg-[#050506] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-35">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full border border-brand-orange/25" />
        <div className="absolute -right-16 bottom-12 h-72 w-72 rounded-full border border-brand-orange/20" />
        <div className="absolute inset-x-0 bottom-0 h-32 border-t border-brand-orange/10 bg-[radial-gradient(circle_at_center,rgba(255,107,0,0.16),transparent_58%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-10 xl:grid-cols-[1.05fr_1.55fr_0.9fr]">
          <section className="max-w-md">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center xl:flex-col xl:items-start">
              <img
                src={basketMotionAiLogo}
                alt={`${BRAND_NAME} logo`}
                className="h-24 w-24 rounded-3xl object-cover ring-1 ring-brand-orange/30 sm:h-28 sm:w-28 lg:h-32 lg:w-32"
              />
              <div>
                <div className="text-3xl font-black uppercase leading-none tracking-normal sm:text-4xl">
                  Basket<span className="text-brand-orange">Motion</span>
                  <span className="mt-1 block text-xl tracking-[0.22em] text-white sm:text-2xl">AI</span>
                </div>
                <p className="mt-4 max-w-sm text-sm leading-7 text-white/62 sm:text-base">
                  {BRAND_NAME} is the all-in-one AI platform that analyzes, improves and elevates basketball performance.
                </p>
              </div>
            </div>
            <div className="mt-8 text-xs font-black uppercase tracking-[0.34em] text-white/80">
              Analyze. <span className="text-brand-orange">Improve.</span> Win.
            </div>
          </section>

          <nav className="grid gap-8 sm:grid-cols-3" aria-label="Footer navigation">
            <FooterColumn title="Platform" icon={Goal} links={platformLinks} />
            <FooterColumn title="Resources" icon={BookOpen} links={resourceLinks} />
            <FooterColumn title="Company" icon={UsersRound} links={companyLinks} />
          </nav>

          <section className="space-y-8">
            <div>
              <div className="mb-4 flex items-center gap-3 text-sm font-black uppercase tracking-wide">
                <Send size={22} className="text-brand-orange" />
                Stay in the game
              </div>
              <p className="text-sm leading-6 text-white/62">
                Subscribe for product updates, drills, training ideas and AI performance insights.
              </p>
              <form className="mt-5 flex flex-col gap-3 sm:flex-row xl:flex-col 2xl:flex-row" onSubmit={(event) => event.preventDefault()}>
                <label className="sr-only" htmlFor="footer-email">Email</label>
                <input
                  id="footer-email"
                  type="email"
                  placeholder="Enter your email"
                  className="min-h-12 min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-brand-orange/70"
                />
                <button
                  type="submit"
                  className="inline-flex min-h-12 items-center justify-center rounded-lg bg-brand-orange px-5 font-black text-white transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                  aria-label="Subscribe"
                >
                  <Send size={19} />
                </button>
              </form>
            </div>

            <div>
              <div className="mb-4 text-sm font-black uppercase tracking-wide">Follow us</div>
              <div className="flex flex-wrap gap-3">
                {socialLinks.map(({ label, icon: Icon, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    title={label}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-brand-orange/70 text-white transition hover:bg-brand-orange hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                  >
                    <Icon size={20} />
                  </a>
                ))}
              </div>
            </div>
          </section>
        </div>

        <section className="mt-10 rounded-2xl border border-brand-orange/40 bg-white/[0.025] p-4 shadow-2xl shadow-black/30 lg:p-6">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-[1fr_repeat(5,1.05fr)]">
            <div className="flex items-center gap-4 border-white/10 md:border-r md:pr-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-brand-orange/40 bg-brand-orange/10 text-brand-orange">
                <Brain size={34} />
              </div>
              <div>
                <div className="text-2xl font-black uppercase leading-none">
                  Motion <span className="text-brand-orange">AI</span>
                </div>
                <div className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-white/45">Powered by intelligence</div>
              </div>
            </div>

            {featureStrip.map(({ title, text, icon: Icon }) => (
              <div key={title} className="border-white/10 md:border-r md:pr-5 xl:last:border-r-0">
                <Icon className="mb-3 text-brand-orange" size={28} />
                <div className="text-sm font-black uppercase">{title}</div>
                <p className="mt-2 text-sm leading-6 text-white/55">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8 grid gap-6 border-t border-white/10 pt-8 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-brand-orange/35 bg-brand-orange/10 text-brand-orange">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="font-black">Your data is secure with us.</div>
              <p className="mt-1 max-w-sm text-sm leading-6 text-white/55">We use security-focused architecture to protect your information.</p>
            </div>
          </div>

          <div className="text-center">
            <div className="text-sm text-white/62">© 2026 {BRAND_NAME}. All rights reserved.</div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-white/70">
              <span>Created by</span>
              <span className="text-xl font-black tracking-wide text-white">Mouad Mouasseif</span>
              <span className="rounded-lg border border-brand-orange/40 px-2 py-1 text-xs font-black uppercase text-brand-orange">Motion AI</span>
            </div>
          </div>

          <div className="text-left lg:text-right">
            <div className="text-sm text-white/62">Proudly supporting basketball worldwide.</div>
            <div className="mt-3 flex flex-wrap gap-2 lg:justify-end">
              {["Youth", "Clubs", "Coaches", "Elite"].map((label) => (
                <span key={label} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-black uppercase tracking-wider text-white/55">
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  icon: HeaderIcon,
  links,
}: {
  title: string;
  icon: typeof Goal;
  links: { label: string; icon: typeof Goal }[];
}) {
  return (
    <section>
      <div className="mb-5 flex items-center gap-3 text-sm font-black uppercase tracking-wide">
        <HeaderIcon size={22} className="text-brand-orange" />
        <span>{title}</span>
      </div>
      <div className="mb-5 h-0.5 w-14 bg-brand-orange" />
      <ul className="space-y-4">
        {links.map(({ label, icon: Icon }) => (
          <li key={label}>
            <a href="#" className="group inline-flex items-center gap-3 text-sm text-white/70 transition hover:text-brand-orange">
              <Icon size={18} className="shrink-0 text-brand-orange" />
              <span className="leading-5">{label}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
