import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Link2,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  ArrowRight,
  MousePointerClick,
  Folder,
  Tag,
  BarChart3,
  Shield,
  Zap,
} from 'lucide-react';
import axiosInstance, { extractBackendError } from '../api/axiosInstance';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';
import type { UrlSend } from '../types';

interface ShortenedResult {
  shortUrl: string;
  longUrl: string;
}

// ── GitHub icon (inline SVG) ─────────────────────────────────────────────────
const GithubIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

// ── Grid background SVG ───────────────────────────────────────────────────────
const GridBg: React.FC = () => (
  <svg
    className="absolute inset-0 w-full h-full pointer-events-none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse">
        <path d="M 64 0 L 0 0 0 64" fill="none" stroke="#EFEFEF" strokeWidth="1" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)" />
  </svg>
);

// ── Quarter-circle decorative shapes ─────────────────────────────────────────
const QuarterCircle: React.FC<{ className?: string; flip?: boolean }> = ({ className, flip }) => (
  <svg
    viewBox="0 0 120 120"
    className={className}
    style={{ transform: flip ? 'scaleX(-1)' : undefined }}
  >
    <path d="M0 120 Q0 0 120 0 L120 120 Z" fill="currentColor" />
  </svg>
);

// ── Trim SVG big text background ─────────────────────────────────────────────
const TrimBigText: React.FC = () => (
  <div className="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
    <p
      className="text-center font-bold text-[clamp(80px,15vw,200px)] leading-none tracking-tighter text-black/[0.04] dark:text-white/[0.04] whitespace-nowrap"
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      trim
    </p>
  </div>
);

// ── Feature card ──────────────────────────────────────────────────────────────
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
}
const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, desc }) => (
  <div className="flex flex-col gap-3 p-6 bg-white border border-gray-100 rounded-2xl hover:-translate-y-1 transition-transform duration-200 shadow-sm">
    <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
      {icon}
    </div>
    <h3 className="font-semibold text-[#12141D] text-base" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h3>
    <p className="text-[#52525B] text-sm leading-relaxed">{desc}</p>
  </div>
);

// ── Pricing card ──────────────────────────────────────────────────────────────
interface PricingCardProps {
  tier: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}
const PricingCard: React.FC<PricingCardProps> = ({ tier, price, description, features, cta, highlighted }) => (
  <div className={`flex flex-col gap-6 p-8 rounded-2xl border ${highlighted ? 'bg-[#12141D] border-[#12141D] text-white' : 'bg-white border-gray-200 text-[#12141D]'}`}>
    <div>
      <p className={`text-sm font-medium mb-1 ${highlighted ? 'text-gray-400' : 'text-gray-500'}`}>{tier}</p>
      <p className={`text-4xl font-bold ${highlighted ? 'text-white' : 'text-[#12141D]'}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{price}</p>
      <p className={`text-sm mt-2 ${highlighted ? 'text-gray-300' : 'text-gray-500'}`}>{description}</p>
    </div>
    <ul className="flex flex-col gap-3">
      {features.map((f) => (
        <li key={f} className="flex items-center gap-2 text-sm">
          <Check className={`w-4 h-4 flex-shrink-0 ${highlighted ? 'text-white' : 'text-[#12141D]'}`} />
          <span className={highlighted ? 'text-gray-200' : 'text-gray-700'}>{f}</span>
        </li>
      ))}
    </ul>
    <Link
      to="/register"
      className={`mt-auto text-center px-6 py-3 rounded-xl font-semibold text-sm transition-colors ${highlighted ? 'bg-white text-[#12141D] hover:bg-gray-100' : 'bg-[#12141D] text-white hover:bg-[#201F22]'}`}
    >
      {cta}
    </Link>
  </div>
);

// ── Testimonial card ──────────────────────────────────────────────────────────
interface TestimonialProps {
  quote: string;
  name: string;
  role: string;
  initials: string;
}
const TestimonialCard: React.FC<TestimonialProps> = ({ quote, name, role, initials }) => (
  <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col gap-4">
    <p className="text-gray-700 text-sm leading-relaxed">"{quote}"</p>
    <div className="flex items-center gap-3 mt-auto">
      <div className="w-9 h-9 rounded-full bg-[#12141D] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
        {initials}
      </div>
      <div>
        <p className="text-sm font-semibold text-[#12141D]">{name}</p>
        <p className="text-xs text-gray-500">{role}</p>
      </div>
    </div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const HomePage: React.FC = () => {
  const { token } = useAuth();

  const [longUrl, setLongUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShortenedResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!longUrl.trim()) return;
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const { data } = await axiosInstance.post<UrlSend>('/shorten', {
        longUrl: longUrl.trim(),
      });
      setResult({ shortUrl: data.shortUrl, longUrl: data.longUrl });
    } catch (err: unknown) {
      const backendMessage = extractBackendError(err, 'Failed to shorten URL. Please try again.');
      setError(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white font-sans" style={{ fontFamily: "'Inter', 'Space Grotesk', sans-serif" }}>

      {/* ── Navbar ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <BrandLogo className="w-7 h-7 text-[#12141D]" />
            <span className="font-bold text-[#12141D] text-lg tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              trim
            </span>
          </div>

          {/* Nav links (desktop) */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
            <a href="#features" className="hover:text-[#12141D] transition-colors">Features</a>
            <a href="#pricing" className="hover:text-[#12141D] transition-colors">Pricing</a>
            <a href="#testimonials" className="hover:text-[#12141D] transition-colors">Reviews</a>
          </nav>

          {/* Auth buttons */}
          <div className="flex items-center gap-3">
            {token ? (
              <Link
                to="/dashboard"
                className="px-4 py-2 bg-[#12141D] text-white text-sm font-semibold rounded-xl hover:bg-[#201F22] transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-600 hover:text-[#12141D] transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-[#12141D] text-white text-sm font-semibold rounded-xl hover:bg-[#201F22] transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ──────────────────────────────────────────── */}
      <section id="hero" className="relative overflow-hidden min-h-[90vh] flex flex-col items-center justify-center" style={{ background: 'linear-gradient(180deg, rgba(250,250,250,0) 0%, rgba(196,196,196,0.21) 100%)' }}>
        <GridBg />

        <div className="relative z-10 w-full max-w-3xl mx-auto px-6 text-center py-20 flex flex-col items-center gap-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-200 bg-[#EDEDED] text-xs font-medium text-[#444748]">
            <span className="w-2 h-2 rounded-full bg-[#12141D] inline-block" />
            Fast · Free · No signup needed →
          </div>

          {/* Headline */}
          <div className="flex flex-col items-center gap-4">
            <h1
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-[#12141D] leading-[1.05] tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Shorten, track &amp;<br />
              <span className="relative">
                manage your links
                <span className="absolute -bottom-2 left-0 right-0 h-1 rounded-full bg-[#12141D]/10" />
              </span>
            </h1>
            <p className="text-base sm:text-lg text-gray-500 max-w-xl leading-relaxed">
              Paste your long URL below and get a short, shareable link instantly.
              No account required to try it out.
            </p>
          </div>

          {/* ── Shorten Form ──────────────────────────────────────── */}
          <div className="w-full max-w-2xl">
            <form
              onSubmit={handleShorten}
              className="flex flex-col sm:flex-row gap-2 p-2 bg-white border border-gray-200 rounded-2xl shadow-[1px_1px_27px_0px_rgba(0,0,0,0.12)]"
            >
              <div className="flex-1 relative flex items-center">
                <Link2 className="absolute left-4 w-5 h-5 text-gray-400 pointer-events-none flex-shrink-0" />
                <input
                  id="home-shorten-input"
                  type="url"
                  required
                  value={longUrl}
                  onChange={(e) => { setLongUrl(e.target.value); setResult(null); setError(''); }}
                  className="w-full bg-transparent pl-12 pr-4 py-3.5 text-[#12141D] placeholder-gray-400 text-sm focus:outline-none"
                  placeholder="Paste your long URL here…"
                />
              </div>
              <button
                id="home-shorten-submit"
                type="submit"
                disabled={loading}
                className="px-6 py-3.5 bg-[#12141D] text-white text-sm font-semibold rounded-xl hover:bg-[#201F22] transition-colors flex items-center justify-center gap-2 flex-shrink-0 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Shortening…
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Shorten it
                  </>
                )}
              </button>
            </form>

            {/* Error */}
            {error && (
              <div className="mt-3 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-left">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="mt-3 p-4 bg-white border border-gray-200 rounded-xl text-left shadow-sm">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">
                  Your short link is ready 🎉
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href={result.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-[#12141D] font-semibold text-base hover:underline flex items-center gap-1.5 min-w-0"
                  >
                    <span className="truncate">{result.shortUrl}</span>
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                  </a>
                  <button
                    id="home-copy-btn"
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0"
                  >
                    {copied ? (
                      <><Check className="w-4 h-4 text-green-600" /> Copied!</>
                    ) : (
                      <><Copy className="w-4 h-4" /> Copy</>
                    )}
                  </button>
                </div>
                <p className="text-gray-400 text-xs mt-2 truncate">→ {result.longUrl}</p>
              </div>
            )}

            {/* Sub-CTA */}
            <p className="mt-4 text-xs text-gray-500">
              {token ? (
                <>Go to your{' '}
                  <Link to="/dashboard" className="font-bold underline text-[#12141D] hover:no-underline">
                    dashboard
                  </Link>{' '}
                  to manage, edit, and track all your links.
                </>
              ) : (
                <>
                  <Link to="/register" className="font-bold underline text-[#12141D] hover:no-underline">
                    Create a free account
                  </Link>{' '}
                  to manage, edit, and track your links.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Big "trim" bg text */}
        <TrimBigText />
      </section>

      {/* ── Trusted by Section ──────────────────────────────────── */}
      <section className="py-14 border-y border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <p
            className="text-center font-bold text-gray-900 text-xl mb-10"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Trusted by modern teams and developers
          </p>
          {/* Placeholder logo strip */}
          <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-6 opacity-40">
            {['Vercel', 'Supabase', 'PlanetScale', 'Railway', 'Netlify', 'Linear', 'Loom', 'Raycast'].map((name) => (
              <span key={name} className="font-bold text-lg text-gray-700 tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Showcase 1 — Dashboard ──────────────────────── */}
      <section className="py-20 bg-white" id="features">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          {/* Screenshot */}
          <div className="rounded-2xl overflow-hidden shadow-[1px_1px_27px_0px_rgba(0,0,0,0.12)] border border-gray-100">
            <img
              src="/figma/dashboard_screenshot.png"
              alt="Trim dashboard showing link management"
              className="w-full h-auto object-cover"
            />
          </div>
          {/* Text */}
          <div className="flex flex-col gap-6">
            <h2
              className="text-4xl font-bold text-[#12141D] leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Organize links with<br />Folders &amp; Tags
            </h2>
            <p className="text-gray-500 leading-relaxed">
              Keep your links tidy with powerful folder organization and
              tag labeling. Filter your entire link library by folder or
              tag in seconds — no more digging through a messy list.
            </p>
            <ul className="flex flex-col gap-3 text-sm text-gray-600">
              {['Nested folders for every project', 'Color-coded tags for quick filtering', 'Bulk actions on selected links'].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#12141D] flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              className="self-start inline-flex items-center gap-2 px-5 py-3 bg-[#12141D] text-white text-sm font-semibold rounded-xl hover:bg-[#201F22] transition-colors"
            >
              Sign up for free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Feature Showcase 2 — Analytics ──────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div className="flex flex-col gap-6">
            <h2
              className="text-4xl font-bold text-[#12141D] leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Deep click analytics<br />for every link
            </h2>
            <p className="text-gray-500 leading-relaxed">
              See exactly who is clicking your links — broken down by
              device, browser, country, and city. Spot trends at a glance
              with clean, interactive charts.
            </p>
            <ul className="flex flex-col gap-3 text-sm text-gray-600">
              {['Real-time click tracking', 'Device & browser breakdown', 'Geographic heatmap by country', 'Time-series click chart with period filters'].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#12141D] flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              className="self-start inline-flex items-center gap-2 px-5 py-3 bg-[#12141D] text-white text-sm font-semibold rounded-xl hover:bg-[#201F22] transition-colors"
            >
              Create your first link <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {/* Screenshot */}
          <div className="rounded-2xl overflow-hidden shadow-[1px_1px_27px_0px_rgba(0,0,0,0.12)] border border-gray-100">
            <img
              src="/figma/analytics_screenshot.png"
              alt="Trim analytics showing click charts"
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      </section>

      {/* ── Check all features grid ──────────────────────────────── */}
      <section className="py-20 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <h2
            className="text-4xl font-bold text-[#12141D] text-center mb-12"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Check all features
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard
              icon={<Zap className="w-5 h-5 text-[#12141D]" />}
              title="Instant shortening"
              desc="Generate a short link in milliseconds — no account required."
            />
            <FeatureCard
              icon={<BarChart3 className="w-5 h-5 text-[#12141D]" />}
              title="Click analytics"
              desc="Track clicks, devices, browsers, and geographic data in real-time."
            />
            <FeatureCard
              icon={<Folder className="w-5 h-5 text-[#12141D]" />}
              title="Folders"
              desc="Organize your links into folders for any project or campaign."
            />
            <FeatureCard
              icon={<Tag className="w-5 h-5 text-[#12141D]" />}
              title="Tags"
              desc="Label links with tags and filter your library instantly."
            />
            <FeatureCard
              icon={<Shield className="w-5 h-5 text-[#12141D]" />}
              title="Password protection"
              desc="Secure sensitive links behind a password so only the right people can access them."
            />
            <FeatureCard
              icon={<MousePointerClick className="w-5 h-5 text-[#12141D]" />}
              title="Custom aliases"
              desc="Create branded short links with your own memorable custom slug."
            />
          </div>
        </div>
      </section>

      {/* ── Pricing / Free & Open ────────────────────────────────── */}
      <section id="pricing" className="py-20 bg-gray-50 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <h2
            className="text-4xl font-bold text-[#12141D] text-center mb-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Free and Open
          </h2>
          <p className="text-center text-gray-500 mb-12 max-w-xl mx-auto">
            Trim is free to use with no limits. Self-host it yourself or use our hosted version.
          </p>
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <PricingCard
              tier="Hosted"
              price="Free"
              description="Everything you need, hosted for you."
              features={['Unlimited short links', 'Click analytics', 'Folders & Tags', 'Password protection', 'Custom aliases']}
              cta="Try it now"
            />
            <PricingCard
              tier="Self-hosted"
              price="$0"
              description="Run it on your own infrastructure."
              features={['Full source code', 'Docker Compose ready', 'Spring Boot + React', 'Your own domain', 'No vendor lock-in']}
              cta="View GitHub"
              highlighted
            />
          </div>
          <p className="text-center text-sm text-[#3F3F46] mt-10">
            Want to self-host this application? Check out the{' '}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline hover:no-underline inline-flex items-center gap-1"
            >
              <GithubIcon className="w-4 h-4" /> GitHub
            </a>{' '}
            repository.
          </p>
        </div>
        {/* Decorative quarter circles */}
        <QuarterCircle className="absolute bottom-0 left-0 w-32 h-32 text-gray-100 opacity-60" />
        <QuarterCircle className="absolute top-0 right-0 w-24 h-24 text-gray-100 opacity-60" flip />
      </section>

      {/* ── Testimonials ─────────────────────────────────────────── */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2
            className="text-4xl font-bold text-right text-[#12141D] mb-12"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Honest reviews from<br />our customers
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <TestimonialCard
              quote="Trim replaced four different link management tools for us. The analytics alone are worth it — country breakdowns, device splits, all in one dashboard."
              name="Sarah M."
              role="Product Lead · Vercel"
              initials="SM"
            />
            <TestimonialCard
              quote="We needed password-protected links for client deliverables. Trim nailed it. Setup took minutes and the custom aliases look so much more professional."
              name="James K."
              role="Freelance Developer"
              initials="JK"
            />
            <TestimonialCard
              quote="The folder and tag system is the best I've used. I can filter 500+ links by campaign in seconds. The self-hosting option sealed the deal for my team."
              name="Ayla R."
              role="Growth Engineer · Linear"
              initials="AR"
            />
          </div>
        </div>
      </section>

      {/* ── Final CTA Banner ─────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="relative rounded-3xl bg-[#12141D] p-14 text-center overflow-hidden">
            {/* Decorative circles */}
            <QuarterCircle className="absolute bottom-0 left-0 w-40 h-40 text-white/5" />
            <QuarterCircle className="absolute top-0 right-0 w-32 h-32 text-white/5" flip />

            <div className="relative z-10 flex flex-col items-center gap-6">
              <h2
                className="text-4xl sm:text-5xl font-bold text-white"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Ready to manage your links?
              </h2>
              <p className="text-gray-400 max-w-lg">
                Join thousands of developers and marketers who trust Trim to shorten, track, and organize their links.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Link
                  to="/register"
                  className="px-6 py-3.5 bg-white text-[#12141D] font-semibold rounded-xl hover:bg-gray-100 transition-colors text-sm"
                >
                  Create free account
                </Link>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="px-6 py-3.5 border border-white/20 text-white/80 hover:text-white hover:border-white/40 font-semibold rounded-xl transition-colors text-sm"
                >
                  Try it now
                </button>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3.5 border border-white/20 text-white/80 hover:text-white hover:border-white/40 font-semibold rounded-xl transition-colors text-sm inline-flex items-center gap-2"
                >
                  <GithubIcon className="w-4 h-4" /> GitHub repository
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-8 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BrandLogo className="w-6 h-6 text-[#12141D]" />
            <span className="font-bold text-[#12141D] text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>trim</span>
          </div>
          <p className="text-gray-400 text-xs">© Copyright 2026, All Rights Reserved</p>
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <a href="#" className="hover:text-[#12141D] transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-[#12141D] transition-colors">Terms &amp; Conditions</a>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default HomePage;
