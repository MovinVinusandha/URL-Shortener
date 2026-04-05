import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
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

const fadeUpVariant: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

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
  <motion.div variants={fadeUpVariant} className="flex flex-col gap-3 p-6 bg-white border border-gray-100 rounded-2xl hover:-translate-y-1 transition-transform duration-200 shadow-sm">
    <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
      {icon}
    </div>
    <h3 className="font-semibold text-[#12141D] text-base" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h3>
    <p className="text-[#52525B] text-sm leading-relaxed">{desc}</p>
  </motion.div>
);

// ── Pricing card ──────────────────────────────────────────────────────────────
interface PricingCardProps {
  tier: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  onCtaClick?: (e: React.MouseEvent) => void;
}
const PricingCard: React.FC<PricingCardProps> = ({ tier, price, description, features, cta, highlighted, onCtaClick }) => (
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
    {onCtaClick ? (
      <button
        type="button"
        onClick={onCtaClick}
        className={`mt-auto text-center px-6 py-3 rounded-xl font-semibold text-sm transition-colors ${highlighted ? 'bg-white text-[#12141D] hover:bg-gray-100' : 'bg-[#12141D] text-white hover:bg-[#201F22]'}`}
      >
        {cta}
      </button>
    ) : (
      <Link
        to="/register"
        className={`mt-auto text-center px-6 py-3 rounded-xl font-semibold text-sm transition-colors ${highlighted ? 'bg-white text-[#12141D] hover:bg-gray-100' : 'bg-[#12141D] text-white hover:bg-[#201F22]'}`}
      >
        {cta}
      </Link>
    )}
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
  const urlInputRef = useRef<HTMLInputElement>(null);

  const [longUrl, setLongUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ShortenedResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleTryItNow = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    setTimeout(() => {
      urlInputRef.current?.focus();
    }, 400);
  };

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
    } catch (err: any) {
      const backendMessage = String(err?.response?.data?.message || err?.message || 'Failed to shorten URL. Please try again.');
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
            <BrandLogo className="h-9 w-auto text-[#12141D]" />
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

        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="relative z-10 w-full max-w-3xl mx-auto px-6 text-center py-20 flex flex-col items-center gap-8"
        >
          {/* Badge */}
          <motion.div variants={fadeUpVariant} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-200 bg-[#EDEDED] text-xs font-medium text-[#444748]">
            <span className="w-2 h-2 rounded-full bg-[#12141D] inline-block" />
            Fast · Free · No signup needed →
          </motion.div>

          {/* Headline */}
          <motion.div variants={fadeUpVariant} className="flex flex-col items-center gap-4">
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
          </motion.div>

          {/* ── Shorten Form ──────────────────────────────────────── */}
          <motion.div variants={fadeUpVariant} className="w-full max-w-2xl">
            <form
              onSubmit={handleShorten}
              className="flex flex-col sm:flex-row gap-2 p-2 bg-white border border-gray-200 rounded-2xl shadow-[1px_1px_27px_0px_rgba(0,0,0,0.12)]"
            >
              <div className="flex-1 relative flex items-center">
                <Link2 className="absolute left-4 w-5 h-5 text-gray-400 pointer-events-none flex-shrink-0" />
                <input
                  ref={urlInputRef}
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
                  Your short link is ready
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
          </motion.div>
        </motion.div>

        {/* Big "trim" bg text */}
        <TrimBigText />
      </section>

      {/* ── Trusted by Section (Figma Exact Match) ──────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeUpVariant}
        className="w-full max-w-[100vw] bg-black overflow-hidden relative min-h-[431px] flex flex-col justify-center"
      >
        {/* Background accent */}
        <div className="absolute inset-0 w-full h-full flex justify-end pointer-events-none">
          <svg className="h-full w-full object-cover object-right text-white fill-white" viewBox="0 0 1601 431" preserveAspectRatio="xMaxYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M1488.81 350C1488.81 325.705 1493.6 301.649 1502.9 279.204C1512.2 256.758 1525.84 236.364 1543.02 219.185C1560.21 202.006 1580.62 188.379 1603.08 179.082C1625.53 169.785 1649.6 165 1673.91 165L1673.91 350H1488.81Z" fill="currentColor"/>
          </svg>
        </div>
        
        <div className="relative z-10 w-full max-w-[940px] px-6 mx-auto flex flex-col items-center gap-16">
          <h2
            className="text-white text-2xl md:text-[34px] font-bold text-center"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Trusted by modern teams and developers
          </h2>
          
          <div className="w-full flex flex-col gap-10">
            <div className="w-full flex justify-center">
              <img src="/figma/row1.svg" alt="Trusted brand logos" className="w-full max-w-[933px] h-[39px]" />
            </div>
            <div className="w-full flex justify-between items-center px-4 md:px-10">
              <img src="/figma/logo2.svg" alt="Logo 2" className="h-[35px] w-auto" />
              <img src="/figma/logo3.svg" alt="Logo 3" className="h-[31px] w-auto" />
              <img src="/figma/logo4.svg" alt="Logo 4" className="h-[31px] w-auto" />
              <img src="/figma/natroma.svg" alt="Natroma" className="h-[34px] w-auto" />
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Feature Showcase 1 — Dashboard ──────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeUpVariant}
        className="py-20 bg-white"
        id="features"
      >
        <div className="w-full max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-2 items-center gap-12 lg:gap-8 px-4 sm:px-6 lg:px-8 py-24">
          {/* Screenshot */}
          <div className="relative w-full">
            <img
              src="/figma/dashboard_screenshot.png"
              alt="Trim dashboard showing link management"
              className="w-full h-auto drop-shadow-2xl rounded-xl"
            />
          </div>
          {/* Text */}
          <div className="flex flex-col gap-6 items-start text-left w-full max-w-lg lg:ml-auto">
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
            <ul className="flex flex-col gap-3 text-sm text-gray-600 items-start text-left">
              {['Nested folders for every project', 'Color-coded tags for quick filtering', 'Bulk actions on selected links'].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#12141D] flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#12141D] text-white text-sm font-semibold rounded-xl hover:bg-[#201F22] transition-colors"
            >
              Sign up for free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </motion.section>

      {/* ── Feature Showcase 2 — Analytics ──────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeUpVariant}
        className="py-20 bg-gray-50"
      >
        <div className="w-full max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-2 items-center gap-12 lg:gap-8 px-4 sm:px-6 lg:px-8 py-24">
          {/* Text */}
          <div className="flex flex-col gap-6 items-start text-left w-full max-w-lg lg:mr-auto order-last lg:order-first">
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
            <ul className="flex flex-col gap-3 text-sm text-gray-600 items-start text-left">
              {['Real-time click tracking', 'Device & browser breakdown', 'Geographic heatmap by country', 'Time-series click chart with period filters'].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#12141D] flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#12141D] text-white text-sm font-semibold rounded-xl hover:bg-[#201F22] transition-colors"
            >
              Create your first link <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {/* Screenshot */}
          <div className="relative w-full">
            <img
              src="/figma/analytics_screenshot.png"
              alt="Trim analytics showing click charts"
              className="w-full h-auto drop-shadow-2xl rounded-xl"
            />
          </div>
        </div>
      </motion.section>

      {/* ── Check all features grid ──────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeUpVariant}
        className="py-20 bg-white border-b border-gray-100"
      >
        <div className="max-w-6xl mx-auto px-6">
          <h2
            className="text-4xl font-bold text-[#12141D] text-center mb-12"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Check all features
          </h2>
          <motion.div variants={staggerContainer} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
          </motion.div>
        </div>
      </motion.section>

      {/* ── Pricing / Free & Open ────────────────────────────────── */}
      <motion.section
        id="pricing"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeUpVariant}
        className="py-20 bg-gray-50 relative overflow-hidden"
      >
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
              tier="Anonymous User"
              description=""
              price="Free"
              features={['Instant short links', '24-hour link expiration', 'Basic QR Code generation']}
              cta="Try it now"
              onCtaClick={handleTryItNow}
            />
            <PricingCard
              tier="Registered User"
              price="Free"
              description=""
              features={['Password protection', 'Folders & Custom Tags', 'Deep Analytics & Tracking', 'Permanent, non-expiring links']}
              cta="Create free account"
              highlighted
            />
          </div>
          <p className="text-center text-sm text-[#3F3F46] mt-10">
            Want to self-host this application? Check out the{' '}
            <a
              href="https://github.com/MovinVinusandha/URL-Shortener"
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
      </motion.section>

      {/* ── Testimonials ─────────────────────────────────────────── */}
      <motion.section
        id="testimonials"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeUpVariant}
        className="py-20 bg-white"
      >
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
      </motion.section>

      {/* ── Final CTA Banner & Footer (Figma Exact Match) ─────────── */}
      <footer 
        className="relative w-full flex flex-col items-center pt-24 overflow-hidden border-t border-gray-100 mt-20"
        style={{
          backgroundImage: `radial-gradient(#e5e7eb 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
          backgroundColor: '#ffffff'
        }}
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-white z-0 pointer-events-none"></div>

        {/* The CTA Block */}
        <div className="flex flex-col items-center gap-6 z-10 mb-16 relative">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#12141D] text-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Ready to manage your links?
          </h2>
          <Link to="/register" className="bg-[#12141D] text-white px-8 py-4 rounded-xl font-medium hover:bg-[#201F22] transition-colors mt-2 shadow-lg">
            Get Started
          </Link>
        </div>
        
        {/* The Massive Logo */}
        <div className="w-full max-w-[1600px] mx-auto flex justify-center items-end mt-auto px-4 translate-y-12 relative z-0">
          <svg className="w-full h-auto text-gray-900" viewBox="0 0 401 163" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M328.345 111.11C328.345 127.896 328.345 144.683 328.345 162.147C318.908 162.147 310.274 162.297 301.663 161.924C300.762 161.885 299.291 158.753 299.275 157.045C299.104 138.88 299.176 120.713 299.174 102.547C299.174 99.5468 299.218 96.5441 299.104 93.5479C298.615 80.7008 289.696 71.9234 277.122 71.8509C263.981 71.7751 254.853 80.1826 254.664 93.4346C254.364 114.43 254.433 135.434 254.688 156.431C254.745 161.11 253.423 162.519 248.812 162.24C242.503 161.859 236.151 162.123 229.819 162.202C227.318 162.233 225.696 161.759 225.704 158.683C225.796 122.023 225.814 85.3621 225.859 48.7017C225.859 48.547 225.975 48.3923 226.228 47.7606C235.072 47.7606 244.113 47.7606 253.905 47.7606C253.905 51.4324 253.905 54.9489 253.905 59.9863C263.847 49.5939 274.55 44.8348 287.55 46.0026C300.452 47.1616 310.357 53.6038 319.005 64.3878C320.5 62.4327 321.535 60.6903 322.932 59.3142C336.447 45.9941 352.562 42.0535 370.273 48.2864C387.948 54.5067 398.633 67.4285 400.104 86.4668C401 98.0677 400.504 109.778 400.585 121.439C400.668 133.272 400.519 145.11 400.833 156.936C400.947 161.222 399.51 162.424 395.388 162.207C389.238 161.882 383.052 161.939 376.896 162.195C372.968 162.358 371.695 160.995 371.719 157.04C371.845 136.041 371.882 115.039 371.641 94.0418C371.457 78.0197 358.407 68.4815 343.456 73.0716C334.17 75.9224 328.616 84.5644 328.114 97.7326C328.187 100.398 328.252 102.286 328.318 104.173C328.244 104.543 328.171 104.912 328.116 105.981C328.205 108.157 328.275 109.633 328.345 111.11Z" fill="currentColor"/>
          <path d="M48.879 74.9511C48.8902 89.7421 48.3855 104.558 49.1055 119.315C49.5385 128.187 57.7459 134.886 67.1143 135.94C68.9297 136.144 70.7721 136.166 72.6024 136.172C80.6426 136.2 80.632 136.187 80.5528 144.496C80.51 148.993 80.458 153.491 80.5128 157.987C80.5438 160.534 79.8336 162.299 76.899 162.114C69.2777 161.633 61.4474 162.061 54.0807 160.42C35.183 156.209 22.1952 141.002 20.9314 121.455C20.0195 107.351 20.2809 93.1568 20.4313 79.0073C20.4793 74.4932 18.9645 73.0611 14.7137 73.4061C11.2347 73.6883 7.72155 73.5216 4.22646 73.6403C1.41329 73.7358 -0.0941571 72.8692 0.00533092 69.6519C0.190511 63.6618 0.148855 57.6591 0.0033778 51.6664C-0.0750532 48.4356 1.20687 47.107 4.42412 47.2904C8.0801 47.4988 11.7656 47.3071 15.4058 47.6421C19.2781 47.9985 20.777 46.7687 20.619 42.6633C20.3118 34.6796 20.6207 26.674 20.4258 18.6835C20.3441 15.3328 21.2371 13.8883 24.8815 14.0287C31.3673 14.2785 37.8735 14.1901 44.365 14.0151C47.4273 13.9325 48.471 15.0883 48.4139 18.0875C48.2556 26.413 48.4409 34.7462 48.2045 43.0682C48.1043 46.5994 49.3247 47.6773 52.8042 47.5989C61.9216 47.3934 71.0468 47.5296 80.7088 47.5296C80.7088 55.6997 80.8661 63.3126 80.5101 70.9014C80.4655 71.8508 77.7342 73.383 76.2057 73.4363C67.7216 73.7327 59.2244 73.6555 50.0073 73.8554C49.1483 74.3202 49.0136 74.6356 48.879 74.9511Z" fill="currentColor"/>
          <path d="M137.689 79.6021C128.916 84.8812 124.94 92.4276 124.94 102.216C124.94 120.202 124.901 138.188 124.88 156.173C124.877 157.965 124.879 159.757 124.879 162.097C115.727 162.097 107.106 162.216 98.4998 161.92C97.6051 161.889 96.1065 159.418 96.0611 158.041C95.8201 150.721 95.951 143.389 95.9578 136.062C95.983 108.584 96.0102 81.106 96.0363 53.6281C96.038 51.8191 96.0364 50.0102 96.0364 47.8176C105.683 47.8176 114.92 47.8176 124.639 47.8176C124.639 52.7687 124.639 57.6507 124.639 62.4684C130.878 58.2289 136.381 53.2137 142.846 50.4592C149.184 47.7587 156.503 47.3586 164.287 45.7655C164.287 55.5351 164.291 63.6672 164.286 71.7992C164.283 75.0721 161.924 74.8698 159.72 74.8554C152.152 74.8058 144.748 75.5287 137.689 79.6021Z" fill="currentColor"/>
          <path d="M179.437 143.971C179.508 139.596 179.579 135.221 179.633 130.028C179.55 128.463 179.483 127.717 179.417 126.971C179.495 123.261 179.573 119.551 179.642 114.932C179.562 106.596 179.492 99.168 179.422 91.7404C179.501 78.7772 179.771 65.8108 179.555 52.8525C179.481 48.4051 180.826 47.0583 185.21 47.254C192.645 47.5861 200.106 47.3453 208.293 47.3453C208.293 50.046 208.292 52.1473 208.293 54.2487C208.311 88.3429 208.257 122.438 208.437 156.531C208.459 160.811 207.459 162.516 202.915 162.248C196.616 161.877 190.278 162.028 183.962 162.183C180.71 162.262 179.443 161.011 179.609 157.792C179.779 154.474 179.653 151.141 179.642 147.012C179.565 145.463 179.501 144.717 179.437 143.971Z" fill="currentColor"/>
          <path d="M177.056 14.3804C179.822 4.32414 186.227 -0.636336 195.06 0.0653536C203.38 0.726334 210.029 6.9702 210.829 14.8745C211.812 24.5753 204.476 32.9143 194.687 33.2246C184.215 33.5564 176.876 25.9083 177.056 14.3804Z" fill="currentColor"/>
          </svg>
        </div>

        {/* Bottom Links */}
        <div className="w-full relative z-10 border-t border-gray-100 bg-white pt-6 pb-6 mt-[-100px] flex flex-col items-center">
          <div className="w-full max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500 font-normal font-sans">
            <p>© Copyright 2026, All Rights Reserved</p>
            <div className="flex gap-8 mt-4 sm:mt-0">
              <Link to="/privacy-policy" className="hover:text-gray-900 transition-colors">Privacy Policy</Link>
              <Link to="/terms-and-conditions" className="hover:text-gray-900 transition-colors">Terms & Conditions</Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default HomePage;
