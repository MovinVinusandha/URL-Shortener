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
  Sparkles,
} from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import BrandLogo from '../components/BrandLogo';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../context/AuthContext';
import type { UrlSend } from '../types';

const fadeUpVariant: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
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

// ── Crisp Dot Matrix Background ──────────────────────────────────────────────
const DotMatrix: React.FC<{ className?: string; fadeMask?: boolean }> = ({
  className = '',
  fadeMask = true,
}) => (
  <div
    className={`absolute inset-0 w-full h-full pointer-events-none text-zinc-900/[0.18] dark:text-zinc-100/[0.22] ${className}`}
    style={{
      backgroundImage: 'radial-gradient(circle, currentColor 1.25px, transparent 1.25px)',
      backgroundSize: '24px 24px',
      maskImage: fadeMask
        ? 'radial-gradient(ellipse 80% 70% at 50% 50%, black 45%, transparent 100%)'
        : undefined,
      WebkitMaskImage: fadeMask
        ? 'radial-gradient(ellipse 80% 70% at 50% 50%, black 45%, transparent 100%)'
        : undefined,
    }}
  />
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

// ── Feature card (Arcane Grid Cell) ─────────────────────────────────────────
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
}
const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, desc }) => (
  <div className="p-6 sm:p-8 bg-background flex flex-col items-start gap-4 transition-colors group hover:bg-secondary/40">
    <div className="w-9 h-9 rounded-full bg-secondary text-muted-foreground border border-border flex items-center justify-center group-hover:text-foreground group-hover:border-border transition-colors">
      {icon}
    </div>
    <div>
      <h3
        className="font-semibold text-sm tracking-tight text-foreground transition-colors"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {title}
      </h3>
      <p className="text-muted-foreground text-xs leading-relaxed mt-1.5">{desc}</p>
    </div>
  </div>
);

// ── Pricing card (Arcane Connected Cell) ─────────────────────────────────────
interface PricingCardProps {
  tier: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  ctaLink?: string;
  highlighted?: boolean;
  onCtaClick?: (e: React.MouseEvent) => void;
}
const PricingCard: React.FC<PricingCardProps> = ({
  tier,
  price,
  description,
  features,
  cta,
  ctaLink = '/register',
  highlighted,
  onCtaClick,
}) => (
  <div className="p-8 sm:p-10 bg-background flex flex-col justify-between transition-colors hover:bg-secondary/20">
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-secondary text-muted-foreground border border-border flex items-center justify-center">
            {highlighted ? <Sparkles className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tier}</p>
        </div>
        {highlighted && (
          <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
            Recommended
          </span>
        )}
      </div>
      <p
        className="text-4xl font-bold text-foreground mt-4 tracking-tight"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {price}
      </p>
      {description && <p className="text-xs mt-2 text-muted-foreground">{description}</p>}
    </div>
    <ul className="flex flex-col gap-3 my-8">
      {features.map((f) => (
        <li key={f} className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="w-4 h-4 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground flex-shrink-0">
            <Check className="w-2.5 h-2.5" />
          </div>
          <span>{f}</span>
        </li>
      ))}
    </ul>
    {onCtaClick ? (
      <button
        type="button"
        onClick={onCtaClick}
        className={`w-full text-center px-6 py-2.5 rounded-lg font-semibold text-xs transition-colors ${
          highlighted ? 'btn-solid' : 'btn-secondary'
        }`}
      >
        {cta}
      </button>
    ) : (
      <Link
        to={ctaLink}
        className={`w-full text-center px-6 py-2.5 rounded-lg font-semibold text-xs transition-colors ${
          highlighted ? 'btn-solid' : 'btn-secondary'
        }`}
      >
        {cta}
      </Link>
    )}
  </div>
);

// ── Testimonial card (Arcane Review Cell) ────────────────────────────────────
interface TestimonialProps {
  quote: string;
  name: string;
  role: string;
  initials: string;
}
const TestimonialCard: React.FC<TestimonialProps> = ({ quote, name, role, initials }) => (
  <div className="p-8 bg-background flex flex-col justify-between gap-6 hover:bg-secondary/20 transition-colors">
    <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">"{quote}"</p>
    <div className="flex items-center gap-3 pt-4 border-t border-border">
      <div className="w-8 h-8 rounded-full bg-secondary text-foreground border border-border flex items-center justify-center text-xs font-bold flex-shrink-0">
        {initials}
      </div>
      <div>
        <p className="text-xs font-semibold text-foreground">{name}</p>
        <p className="text-[11px] text-muted-foreground">{role}</p>
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
  const [generatedUrl, setGeneratedUrl] = useState<ShortenedResult | null>(null);
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
    setGeneratedUrl(null);
    setLoading(true);
    try {
      const { data } = await axiosInstance.post<UrlSend>('/shorten', {
        longUrl: longUrl.trim(),
      });
      setGeneratedUrl({ shortUrl: data.shortUrl, longUrl: data.longUrl });
    } catch (err: any) {
      const backendMessage = String(
        err?.response?.data?.message || err?.message || 'Failed to shorten URL. Please try again.'
      );
      setError(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!generatedUrl) return;
    await navigator.clipboard.writeText(generatedUrl.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-primary/20 selection:text-primary"
      style={{ fontFamily: "'Inter', 'Space Grotesk', sans-serif" }}
    >
      {/* ── Navbar ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-14 flex items-center justify-between relative">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <BrandLogo className="h-8 w-auto text-foreground" />
            </Link>
          </div>

          {/* Nav links (desktop - exactly centered) */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-muted-foreground absolute left-1/2 -translate-x-1/2">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              Pricing
            </a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">
              Reviews
            </a>
          </nav>

          {/* Auth buttons & Theme toggle */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {token ? (
              <Link
                to="/dashboard"
                className="btn-solid"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="btn-solid"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ──────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative overflow-hidden min-h-[85vh] flex flex-col items-center justify-center pt-8 pb-16"
      >
        {/* Crisp Visible Dot Matrix */}
        <DotMatrix />

        {/* Subtle Ambient Radial Glow */}
        <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[300px] bg-primary/10 rounded-full blur-[120px]" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="relative z-10 w-full max-w-3xl mx-auto px-6 text-center py-12 flex flex-col items-center gap-6 sm:gap-7"
        >
          {/* 1. Badge */}
          <motion.div
            variants={fadeUpVariant}
            className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card/80 backdrop-blur-sm text-xs font-medium text-muted-foreground shadow-sm hover:border-border/80 hover:text-foreground transition-colors cursor-pointer"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span>Fast · Free · No signup needed</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 ease-out group-hover:translate-x-1 text-muted-foreground group-hover:text-foreground" />
          </motion.div>

          {/* 2. Trim Logo */}
          <motion.div variants={fadeUpVariant} className="flex items-center justify-center mt-1 mb-3 sm:mb-5">
            <BrandLogo className="h-16 sm:h-20 md:h-24 w-auto text-foreground" />
          </motion.div>

          {/* 3. Headline */}
          <motion.h1
            variants={fadeUpVariant}
            className="text-4xl sm:text-6xl lg:text-7xl font-bold text-foreground leading-[1.08] tracking-tight max-w-2xl"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Shorten, track &amp;
            <br />
            <span className="relative">
              manage your links{' '}
              <span className="absolute -bottom-1.5 left-0 right-0 h-1 rounded-full bg-primary/30" />
            </span>
          </motion.h1>

          {/* 4. Subtitle Paragraph */}
          <motion.p
            variants={fadeUpVariant}
            className="text-sm sm:text-base text-muted-foreground max-w-lg leading-relaxed mt-3 sm:mt-5"
          >
            Paste your long URL below and get a short, shareable link instantly. No account required
            to try it out.
          </motion.p>

          {/* ── Shorten Form ──────────────────────────────────────── */}
          <motion.div variants={fadeUpVariant} className="w-full max-w-2xl mt-1">
            <form
              onSubmit={handleShorten}
              className="flex flex-col sm:flex-row gap-2 p-1.5 sm:p-2 bg-card border border-border rounded-xl shadow-xl shadow-black/5 dark:shadow-black/40"
            >
              <div className="flex-1 relative flex items-center">
                <Link2 className="absolute left-3.5 w-4 h-4 text-muted-foreground pointer-events-none flex-shrink-0" />
                <input
                  ref={urlInputRef}
                  id="home-shorten-input"
                  type="url"
                  required
                  value={longUrl}
                  onChange={(e) => {
                    setLongUrl(e.target.value);
                    setGeneratedUrl(null);
                    setError('');
                  }}
                  className="w-full bg-transparent pl-10 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none"
                  placeholder="Paste your long URL here…"
                />
              </div>
              <button
                id="home-shorten-submit"
                type="submit"
                disabled={loading}
                className="group btn-solid px-5 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 flex-shrink-0 disabled:opacity-60 transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    <span>Shortening…</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 transition-transform duration-200 ease-out group-hover:scale-125 group-hover:-rotate-12 group-hover:fill-current" />
                    <span>Shorten it</span>
                  </>
                )}
              </button>
            </form>

            {/* Error */}
            {error && (
              <div className="mt-3 flex items-center gap-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-2.5 text-left">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <p className="text-rose-500 text-xs font-medium">{error}</p>
              </div>
            )}

            {/* Result */}
            {generatedUrl && (
              <div className="mt-3 p-4 bg-card border border-border rounded-xl text-left shadow-md">
                <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider mb-2">
                  Your short link is ready
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href={generatedUrl.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-foreground font-semibold text-sm hover:underline flex items-center gap-1.5 min-w-0"
                  >
                    <span className="truncate">{generatedUrl.shortUrl}</span>
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                  </a>
                  <button
                    id="home-copy-btn"
                    onClick={copyToClipboard}
                    className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <p className="text-muted-foreground text-xs mt-2 truncate">
                  → {generatedUrl.longUrl}
                </p>
              </div>
            )}

            {/* Sub-CTA */}
            <p className="mt-4 text-xs text-muted-foreground">
              {token ? (
                <>
                  Go to your{' '}
                  <Link
                    to="/dashboard"
                    className="font-semibold text-foreground underline hover:no-underline"
                  >
                    dashboard
                  </Link>{' '}
                  to manage, edit, and track all your links.
                </>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="font-semibold text-foreground underline hover:no-underline"
                  >
                    Create a free account
                  </Link>{' '}
                  to manage, edit, and track your links.
                </>
              )}
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Trusted by Section ──────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={fadeUpVariant}
        className="w-full bg-background border-y border-border overflow-hidden relative py-14 flex flex-col justify-center"
      >
        <div className="relative z-10 w-full max-w-5xl px-6 mx-auto flex flex-col items-center gap-8">
          <h2
            className="text-muted-foreground text-xs font-semibold uppercase tracking-widest text-center"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Trusted by modern teams and developers
          </h2>
          <div className="w-full flex flex-col gap-8">
            <div className="w-full flex justify-center">
              <img
                src="/figma/row1.svg"
                alt="Trusted brand logos"
                className="w-full max-w-[933px] h-[34px] brightness-0 opacity-60 dark:invert dark:opacity-75 transition-opacity hover:opacity-100"
              />
            </div>
            <div className="w-full flex justify-between items-center px-4 md:px-10">
              <img
                src="/figma/logo2.svg"
                alt="Logo 2"
                className="h-[28px] w-auto brightness-0 opacity-60 dark:invert dark:opacity-75 transition-opacity hover:opacity-100"
              />
              <img
                src="/figma/logo3.svg"
                alt="Logo 3"
                className="h-[26px] w-auto brightness-0 opacity-60 dark:invert dark:opacity-75 transition-opacity hover:opacity-100"
              />
              <img
                src="/figma/logo4.svg"
                alt="Logo 4"
                className="h-[26px] w-auto brightness-0 opacity-60 dark:invert dark:opacity-75 transition-opacity hover:opacity-100"
              />
              <img
                src="/figma/natroma.svg"
                alt="Natroma"
                className="h-[28px] w-auto brightness-0 opacity-60 dark:invert dark:opacity-75 transition-opacity hover:opacity-100"
              />
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Feature Showcase 1 — Dashboard ──────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={fadeUpVariant}
        className="py-20 bg-background"
        id="features"
      >
        <div className="w-full max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-2 items-center gap-12 lg:gap-8 px-4 sm:px-6 lg:px-8 py-8">
          {/* Screenshot */}
          <div className="relative w-full">
            <img
              src="/figma/dashboard_screenshot.png"
              alt="Trim dashboard showing link management"
              className="w-full h-auto rounded-xl"
            />
          </div>

          {/* Text */}
          <div className="flex flex-col gap-6 items-start text-left w-full max-w-lg lg:ml-auto">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground" /> Workspace Organization
            </div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-foreground leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Organize links with
              <br />
              Folders &amp; Tags
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Keep your links tidy with powerful folder organization and tag labeling. Filter your
              entire link library by folder or tag in seconds — no more digging through a messy
              list.
            </p>
            <ul className="flex flex-col gap-2.5 text-xs text-muted-foreground items-start text-left">
              {[
                'Nested folders for every project',
                'Color-coded tags for quick filtering',
                'Bulk actions on selected links',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-foreground flex-shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              className="group btn-solid inline-flex items-center gap-2"
            >
              <span>Sign up for free</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 ease-out group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </motion.section>

      {/* ── Feature Showcase 2 — Analytics ──────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={fadeUpVariant}
        className="py-20 bg-background border-y border-border"
      >
        <div className="w-full max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-2 items-center gap-12 lg:gap-8 px-4 sm:px-6 lg:px-8 py-8">
          {/* Text */}
          <div className="flex flex-col gap-6 items-start text-left w-full max-w-lg lg:mr-auto order-last lg:order-first">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" /> Advanced Tracking
            </div>
            <h2
              className="text-3xl sm:text-4xl font-bold text-foreground leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Deep click analytics
              <br />
              for every link
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              See exactly who is clicking your links — broken down by device, browser, country, and
              city. Spot trends at a glance with clean, interactive charts.
            </p>
            <ul className="flex flex-col gap-2.5 text-xs text-muted-foreground items-start text-left">
              {[
                'Real-time click tracking',
                'Device & browser breakdown',
                'Geographic heatmap by country',
                'Time-series click chart with period filters',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-foreground flex-shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              className="group btn-solid inline-flex items-center gap-2"
            >
              <span>Create your first link</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 ease-out group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Screenshot */}
          <div className="relative w-full">
            <img
              src="/figma/analytics_screenshot.png"
              alt="Trim analytics showing click charts"
              className="w-full h-auto rounded-xl"
            />
          </div>
        </div>
      </motion.section>

      {/* ── Check all features grid (Arcane Connected Bento Box) ─── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={fadeUpVariant}
        className="py-20 bg-background border-b border-border"
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2
              className="text-3xl sm:text-4xl font-bold text-foreground mb-2"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Check all features
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Everything you need to create, manage, and analyze your links.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-border rounded-2xl overflow-hidden border border-border shadow-sm">
            <FeatureCard
              icon={<Zap className="w-4 h-4" />}
              title="Instant shortening"
              desc="Generate a short link in milliseconds — no account required."
            />
            <FeatureCard
              icon={<BarChart3 className="w-4 h-4" />}
              title="Click analytics"
              desc="Track clicks, devices, browsers, and geographic data in real-time."
            />
            <FeatureCard
              icon={<Folder className="w-4 h-4" />}
              title="Folders"
              desc="Organize your links into folders for any project or campaign."
            />
            <FeatureCard
              icon={<Tag className="w-4 h-4" />}
              title="Tags"
              desc="Label links with tags and filter your library instantly."
            />
            <FeatureCard
              icon={<Shield className="w-4 h-4" />}
              title="Password protection"
              desc="Secure sensitive links behind a password so only the right people can access them."
            />
            <FeatureCard
              icon={<MousePointerClick className="w-4 h-4" />}
              title="Custom aliases"
              desc="Create branded short links with your own memorable custom slug."
            />
          </div>
        </div>
      </motion.section>

      {/* ── Pricing / Free & Open (Arcane Connected Box) ─────────── */}
      <motion.section
        id="pricing"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={fadeUpVariant}
        className="py-20 bg-background relative overflow-hidden border-b border-border"
      >
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <h2
            className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-2"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Free and Open
          </h2>
          <p className="text-center text-muted-foreground text-xs sm:text-sm mb-12 max-w-xl mx-auto">
            Trim is free to use with no limits. Self-host it yourself or use our hosted version.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[1px] bg-border rounded-2xl overflow-hidden border border-border max-w-3xl mx-auto shadow-sm">
            <PricingCard
              tier="Anonymous User"
              description=""
              price="Free"
              features={[
                'Instant short links',
                '24-hour link expiration',
                'Basic QR Code generation',
              ]}
              cta="Try it now"
              onCtaClick={handleTryItNow}
            />
            <PricingCard
              tier="Registered User"
              price="Free"
              description=""
              features={[
                'Password protection',
                'Folders & Custom Tags',
                'Deep Analytics & Tracking',
                'Permanent, non-expiring links',
              ]}
              cta={token ? 'Go to Dashboard' : 'Create free account'}
              ctaLink={token ? '/dashboard' : '/register'}
              highlighted
            />
          </div>

          <p className="text-center text-xs text-muted-foreground mt-10">
            Want to self-host this application? Check out the{' '}
            <a
              href="https://github.com/MovinVinusandha/URL-Shortener"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground underline hover:no-underline inline-flex items-center gap-1"
            >
              <GithubIcon className="w-3.5 h-3.5" /> GitHub
            </a>{' '}
            repository.
          </p>
        </div>

        {/* Decorative quarter circles */}
        <QuarterCircle className="absolute bottom-0 left-0 w-32 h-32 text-border opacity-40 pointer-events-none" />
        <QuarterCircle
          className="absolute top-0 right-0 w-24 h-24 text-border opacity-40 pointer-events-none"
          flip
        />
      </motion.section>

      {/* ── Testimonials (Arcane Connected Review Box) ─────────────── */}
      <motion.section
        id="testimonials"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={fadeUpVariant}
        className="py-20 bg-background"
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2
              className="text-3xl sm:text-4xl font-bold text-foreground mb-2"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Honest reviews from our customers
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              See what modern developers and product teams think about Trim.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-border rounded-2xl overflow-hidden border border-border shadow-sm">
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

      {/* ── Final CTA Banner & Footer (With Crisp Dot Matrix) ─── */}
      <footer className="relative w-full flex flex-col items-center pt-24 pb-0 overflow-hidden border-t border-border mt-16 bg-background">
        {/* Crisp Visible Dot Matrix in End Section */}
        <DotMatrix fadeMask={false} className="opacity-70" />

        {/* Ambient Subtle Glow */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-[140px]" />

        {/* The CTA Block */}
        <div className="flex flex-col items-center gap-5 z-10 mb-16 relative px-6 text-center">
          <h2
            className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Ready to manage your links?
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
            Join thousands of teams and developers who organize, secure, and track their links with Trim.
          </p>
          <Link
            to={token ? '/dashboard' : '/register'}
            className="group btn-solid px-8 py-3 text-xs font-semibold shadow-lg mt-2 inline-flex items-center gap-2"
          >
            <span>{token ? 'Go to Dashboard' : 'Get Started'}</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 ease-out group-hover:translate-x-1" />
          </Link>
        </div>

        {/* The Massive Logo Watermark */}
        <div className="w-full max-w-[1600px] mx-auto flex justify-center items-end mt-auto px-4 translate-y-12 relative z-0">
          <svg
            className="w-full h-auto text-foreground/[0.04]"
            viewBox="0 0 401 163"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M328.345 111.11C328.345 127.896 328.345 144.683 328.345 162.147C318.908 162.147 310.274 162.297 301.663 161.924C300.762 161.885 299.291 158.753 299.275 157.045C299.104 138.88 299.176 120.713 299.174 102.547C299.174 99.5468 299.218 96.5441 299.104 93.5479C298.615 80.7008 289.696 71.9234 277.122 71.8509C263.981 71.7751 254.853 80.1826 254.664 93.4346C254.364 114.43 254.433 135.434 254.688 156.431C254.745 161.11 253.423 162.519 248.812 162.24C242.503 161.859 236.151 162.123 229.819 162.202C227.318 162.233 225.696 161.759 225.704 158.683C225.796 122.023 225.814 85.3621 225.859 48.7017C225.859 48.547 225.975 48.3923 226.228 47.7606C235.072 47.7606 244.113 47.7606 253.905 47.7606C253.905 51.4324 253.905 54.9489 253.905 59.9863C263.847 49.5939 274.55 44.8348 287.55 46.0026C300.452 47.1616 310.357 53.6038 319.005 64.3878C320.5 62.4327 321.535 60.6903 322.932 59.3142C336.447 45.9941 352.562 42.0535 370.273 48.2864C387.948 54.5067 398.633 67.4285 400.104 86.4668C401 98.0677 400.504 109.778 400.585 121.439C400.668 133.272 400.519 145.11 400.833 156.936C400.947 161.222 399.51 162.424 395.388 162.207C389.238 161.882 383.052 161.939 376.896 162.195C372.968 162.358 371.695 160.995 371.719 157.04C371.845 136.041 371.882 115.039 371.641 94.0418C371.457 78.0197 358.407 68.4815 343.456 73.0716C334.17 75.9224 328.616 84.5644 328.114 97.7326C328.187 100.398 328.252 102.286 328.318 104.173C328.244 104.543 328.171 104.912 328.116 105.981C328.205 108.157 328.275 109.633 328.345 111.11Z"
              fill="currentColor"
            />
            <path
              d="M48.879 74.9511C48.8902 89.7421 48.3855 104.558 49.1055 119.315C49.5385 128.187 57.7459 134.886 67.1143 135.94C68.9297 136.144 70.7721 136.166 72.6024 136.172C80.6426 136.2 80.632 136.187 80.5528 144.496C80.51 148.993 80.458 153.491 80.5128 157.987C80.5438 160.534 79.8336 162.299 76.899 162.114C69.2777 161.633 61.4474 162.061 54.0807 160.42C35.183 156.209 22.1952 141.002 20.9314 121.455C20.0195 107.351 20.2809 93.1568 20.4313 79.0073C20.4793 74.4932 18.9645 73.0611 14.7137 73.4061C11.2347 73.6883 7.72155 73.5216 4.22646 73.6403C1.41329 73.7358 -0.0941571 72.8692 0.00533092 69.6519C0.190511 63.6618 0.148855 57.6591 0.0033778 51.6664C-0.0750532 48.4356 1.20687 47.107 4.42412 47.2904C8.0801 47.4988 11.7656 47.3071 15.4058 47.6421C19.2781 47.9985 20.777 46.7687 20.619 42.6633C20.3118 34.6796 20.6207 26.674 20.4258 18.6835C20.3441 15.3328 21.2371 13.8883 24.8815 14.0287C31.3673 14.2785 37.8735 14.1901 44.365 14.0151C47.4273 13.9325 48.471 15.0883 48.4139 18.0875C48.2556 26.413 48.4409 34.7462 48.2045 43.0682C48.1043 46.5994 49.3247 47.6773 52.8042 47.5989C61.9216 47.3934 71.0468 47.5296 80.7088 47.5296C80.7088 55.6997 80.8661 63.3126 80.5101 70.9014C80.4655 71.8508 77.7342 73.383 76.2057 73.4363C67.7216 73.7327 59.2244 73.6555 50.0073 73.8554C49.1483 74.3202 49.0136 74.6356 48.879 74.9511Z"
              fill="currentColor"
            />
            <path
              d="M137.689 79.6021C128.916 84.8812 124.94 92.4276 124.94 102.216C124.94 120.202 124.901 138.188 124.88 156.173C124.877 157.965 124.879 159.757 124.879 162.097C115.727 162.097 107.106 162.216 98.4998 161.92C97.6051 161.889 96.1065 159.418 96.0611 158.041C95.8201 150.721 95.951 143.389 95.9578 136.062C95.983 108.584 96.0102 81.106 96.0363 53.6281C96.038 51.8191 96.0364 50.0102 96.0364 47.8176C105.683 47.8176 114.92 47.8176 124.639 47.8176C124.639 52.7687 124.639 57.6507 124.639 62.4684C130.878 58.2289 136.381 53.2137 142.846 50.4592C149.184 47.7587 156.503 47.3586 164.287 45.7655C164.287 55.5351 164.291 63.6672 164.286 71.7992C164.283 75.0721 161.924 74.8698 159.72 74.8554C152.152 74.8058 144.748 75.5287 137.689 79.6021Z"
              fill="currentColor"
            />
            <path
              d="M179.437 143.971C179.508 139.596 179.579 135.221 179.633 130.028C179.55 128.463 179.483 127.717 179.417 126.971C179.495 123.261 179.573 119.551 179.642 114.932C179.562 106.596 179.492 99.168 179.422 91.7404C179.501 78.7772 179.771 65.8108 179.555 52.8525C179.481 48.4051 180.826 47.0583 185.21 47.254C192.645 47.5861 200.106 47.3453 208.293 47.3453C208.293 50.046 208.292 52.1473 208.293 54.2487C208.311 88.3429 208.257 122.438 208.437 156.531C208.459 160.811 207.459 162.516 202.915 162.248C196.616 161.877 190.278 162.028 183.962 162.183C180.71 162.262 179.443 161.011 179.609 157.792C179.779 154.474 179.653 151.141 179.642 147.012C179.565 145.463 179.501 144.717 179.437 143.971Z"
              fill="currentColor"
            />
            <path
              d="M177.056 14.3804C179.822 4.32414 186.227 -0.636336 195.06 0.0653536C203.38 0.726334 210.029 6.9702 210.829 14.8745C211.812 24.5753 204.476 32.9143 194.687 33.2246C184.215 33.5564 176.876 25.9083 177.056 14.3804Z"
              fill="currentColor"
            />
          </svg>
        </div>

        {/* Bottom Navigation & Links Section */}
        <div className="w-full relative z-10 border-t border-border bg-background/95 backdrop-blur-md pt-16 pb-8">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            {/* Upper Columns Row */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12">
              {/* Left Bio Column */}
              <div className="md:col-span-5 flex flex-col items-start gap-4">
                <Link to="/" className="flex items-center gap-2">
                  <BrandLogo className="h-7 w-auto text-foreground" />
                </Link>
                <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                  Modern, fast, and open-source URL shortener with comprehensive analytics, custom tags, and folder management.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 text-xs font-medium mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  All Systems Operational
                </div>
              </div>

              {/* Navigation Columns */}
              <div className="md:col-span-7 grid grid-cols-3 gap-8">
                {/* Column 1: PRODUCT */}
                <div className="flex flex-col gap-3">
                  <p className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                    Product
                  </p>
                  <ul className="flex flex-col gap-2 text-xs text-muted-foreground">
                    <li>
                      <a href="#features" className="hover:text-foreground transition-colors">
                        Overview
                      </a>
                    </li>
                    <li>
                      <a href="#pricing" className="hover:text-foreground transition-colors">
                        Plans
                      </a>
                    </li>
                    <li>
                      <a href="#testimonials" className="hover:text-foreground transition-colors">
                        Customer Reviews
                      </a>
                    </li>
                    <li>
                      <Link to="/dashboard" className="hover:text-foreground transition-colors">
                        Link Manager
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Column 2: RESOURCES */}
                <div className="flex flex-col gap-3">
                  <p className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                    Resources
                  </p>
                  <ul className="flex flex-col gap-2 text-xs text-muted-foreground">
                    <li>
                      <a
                        href="https://github.com/MovinVinusandha/URL-Shortener"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground transition-colors"
                      >
                        GitHub Repo
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://github.com/MovinVinusandha/URL-Shortener#readme"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground transition-colors"
                      >
                        Documentation
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://github.com/MovinVinusandha/URL-Shortener#docker-compose"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground transition-colors"
                      >
                        Self-Hosting
                      </a>
                    </li>
                  </ul>
                </div>

                {/* Column 3: LEGAL */}
                <div className="flex flex-col gap-3">
                  <p className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                    Legal
                  </p>
                  <ul className="flex flex-col gap-2 text-xs text-muted-foreground">
                    <li>
                      <Link to="/privacy-policy" className="hover:text-foreground transition-colors">
                        Privacy Policy
                      </Link>
                    </li>
                    <li>
                      <Link to="/terms-and-conditions" className="hover:text-foreground transition-colors">
                        Terms &amp; Conditions
                      </Link>
                    </li>
                    <li>
                      <Link to="/settings/security" className="hover:text-foreground transition-colors">
                        Security
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="border-t border-border pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-muted-foreground">
              <p>© Copyright 2026, All Rights Reserved</p>
              <div className="flex items-center gap-6 mt-4 sm:mt-0">
                <Link to="/privacy-policy" className="hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
                <Link to="/terms-and-conditions" className="hover:text-foreground transition-colors">
                  Terms &amp; Conditions
                </Link>
                <a
                  href="https://github.com/MovinVinusandha/URL-Shortener"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                >
                  <GithubIcon className="w-3.5 h-3.5" /> GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
