"use client"

/**
 * Landing Page - Graphite Design System (Pixel-Perfect)
 * Based on graphite.com homepage specifications
 * 
 * 13 Sections:
 * 1. Announcement Banner
 * 2. Navbar (Sticky with blur) - Mobile hamburger menu
 * 3. Hero Section (Asymmetric)
 * 4. Trust Bar (Logo Marquee)
 * 5. Video Showcase
 * 6. Customer Stories Carousel
 * 7. Feature Showcase (Vertical Accordion)
 * 8. Feature Grid
 * 9. One Platform Pills
 * 10. AI Chat Showcase
 * 11. Integration Section
 * 12. Final CTA
 * 13. Footer
 * 
 * MOBILE RESPONSIVE: Optimized for all screen sizes (320px+)
 */

import { useEffect, useState } from "react"
import { useAuth } from "@clerk/clerk-react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { 
  ArrowRight, 
  ChevronDown, 
  Play, 
  ChevronLeft, 
  ChevronRight,
  MessageSquare,
  Zap,
  BarChart3,
  Shield,
  Users,
  Settings,
  Mail,
  Linkedin,
  Twitter,
  Youtube,
  Github,
  Menu,
  X,
  type LucideIcon
} from "lucide-react"

// Slack icon (not available in lucide-react, using custom SVG)
function SlackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.26 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.823 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.823 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.823 0a2.528 2.528 0 012.521 2.522v2.52H8.823zm0 1.26a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.823a2.528 2.528 0 012.522-2.521h6.301zm10.135 2.521a2.528 2.528 0 012.52-2.521A2.528 2.528 0 0124 8.823a2.528 2.528 0 01-2.522 2.521h-2.52V8.823zm-1.26 0a2.528 2.528 0 01-2.521 2.521 2.528 2.528 0 01-2.521-2.521V2.522A2.528 2.528 0 0115.177 0a2.528 2.528 0 012.521 2.522v6.301zm-2.521 10.135a2.528 2.528 0 012.521 2.52A2.528 2.528 0 0115.177 24a2.528 2.528 0 01-2.521-2.522v-2.52h2.521zm0-1.26a2.528 2.528 0 01-2.521-2.521 2.528 2.528 0 012.521-2.521h6.301A2.528 2.528 0 0124 15.177a2.528 2.528 0 01-2.522 2.521h-6.301z"/>
    </svg>
  )
}

// Hexagon Logo Component (used in navbar)
function HexagonLogo({ className = "", size = 32 }: { className?: string; size?: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      className={className}
    >
      <path 
        d="M16 2L28 9V23L16 30L4 23V9L16 2Z" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        fill="none"
      />
      <path 
        d="M16 6L24 11V21L16 26L8 21V11L16 6Z" 
        stroke="currentColor" 
        strokeWidth="1" 
        opacity="0.6"
        fill="none"
      />
      <path 
        d="M16 10L20 13V19L16 22L12 19V13L16 10Z" 
        stroke="currentColor" 
        strokeWidth="0.75" 
        opacity="0.3"
        fill="none"
      />
    </svg>
  )
}

// Trust logos with SVG paths
const trustLogos = [
  { name: "STATSIG", id: 1, logo: "/landing/logos/statsig.svg" },
  { name: "Harvey", id: 2, logo: "/landing/logos/harvey.svg" },
  { name: "Asana", id: 3, logo: "/landing/logos/asana.svg" },
  { name: "Semgrep", id: 4, logo: "/landing/logos/semgrep.svg" },
  { name: "Vercel", id: 5, logo: "/landing/logos/vercel.svg" },
  { name: "Duolingo", id: 6, logo: "/landing/logos/duolingo.svg" },
  { name: "Ramp", id: 7, logo: "/landing/logos/ramp.svg" },
]

// Feature showcase data with screenshots
const featureShowcaseItems = [
  {
    id: "ai-reviewer",
    title: "The AI reviewer you can collaborate with",
    description: "With AI Chat, get instant context on code changes, fix CI failures, and improve your PRs instantly right from your PR page, so you stay in flow.",
    label: "AI Chat",
    screenshot: "/landing/dashboard-reviews.png",
  },
  {
    id: "review-faster",
    title: "Review faster, ship sooner",
    description: "Get high signal AI reviews on every PR to catch critical bugs and get suggested fixes, pre-merge.",
    label: "AI code reviews",
    screenshot: "/landing/ai-era-bugs.png",
  },
  {
    id: "merge-queue",
    title: "Merge without conflicts or delays",
    description: "Our stack-aware merge queue lands PRs in order and keeps branches green, helping you gain momentum.",
    label: "Merge queue",
    screenshot: "/landing/ai-era-velocity.png",
  },
  {
    id: "stacked-prs",
    title: "Stay unblocked with stacked PRs",
    description: "Break larger PRs into smaller, sequenced changes to accelerate reviews and keep your team moving without waiting on feedback.",
    label: "Stacking",
    screenshot: "/landing/features-section.png",
  },
  {
    id: "pr-page",
    title: "Fast, focused reviews in a modern PR page",
    description: "A new PR page that highlights your changes, history, and comments, so you can review efficiently, catch what matters, and take action without missing a beat.",
    label: "PR page",
    screenshot: "/landing/review-everywhere-full.png",
  },
]

// Video tabs
const videoTabs = [
  { id: "stacked", label: "Stacked PRs", icon: "⬡" },
  { id: "pr-page", label: "PR page", icon: "⊞" },
  { id: "ai-review", label: "AI code review", icon: "✕" },
  { id: "chat", label: "Chat", icon: "○" },
  { id: "merge-queue", label: "Merge queue", icon: "☆" },
  { id: "pr-inbox", label: "PR inbox", icon: "◉" },
  { id: "dev-metrics", label: "Dev metrics", icon: "📊" },
]

// Customer stories with background images
const customerStories = [
  {
    id: 1,
    company: "Semgrep",
    title: "How stacked PRs help Semgrep engineers move faster",
    bgColor: "bg-[#E8F5F3]",
    textColor: "text-[#0D9488]",
    bgImage: "/landing/ai-era-security.png",
  },
  {
    id: 2,
    company: "Shopify",
    title: "How Shopify scaled their developer productivity with stacking",
    bgColor: "bg-[#F3F4F6]",
    textColor: "text-[#111827]",
    bgImage: "/landing/ai-era-velocity.png",
  },
  {
    id: 3,
    company: "Ramp",
    title: "See how Ramp ships code 3x faster with AI reviews",
    bgColor: "bg-[#D4E94C]",
    textColor: "text-[#111827]",
    bgImage: "/landing/ai-era-bugs.png",
  },
]

// Platform pills
const platformPills = [
  { icon: BarChart3, label: "Insights" },
  { icon: Shield, label: "Protections" },
  { icon: Zap, label: "Merge Queue" },
  { icon: Users, label: "Reviewer Assignment" },
  { icon: Settings, label: "Automations" },
]

// Footer links
const footerLinks = {
  features: ["CLI", "Merge queue", "Insights", "PR Inbox", "AI Reviews", "Agents", "AI Chat"],
  company: ["Blog", "Customers", "Careers", "Privacy policy", "Terms of service"],
  resources: ["Docs", "Pricing", "Status", "Guides", "Stacking workflow"],
  connect: [
    { label: "Contact us", icon: Mail },
    { label: "Community Slack", icon: SlackIcon },
    { label: "GitHub", icon: Github },
    { label: "X (Twitter)", icon: Twitter },
    { label: "LinkedIn", icon: Linkedin },
    { label: "YouTube", icon: Youtube },
  ],
}

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()
  const [activeFeature, setActiveFeature] = useState("ai-reviewer")
  const [activeVideoTab, setActiveVideoTab] = useState("stacked")
  const [isNavScrolled, setIsNavScrolled] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard")
    }
  }, [isSignedIn, isLoaded, router])

  // Handle nav scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsNavScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  return (
    <div className="relative min-h-screen bg-[#0C0C0D] text-[#F5F5F5] overflow-x-hidden">
      
      {/* ═══════════════════════════════════════════
          SECTION 1: Announcement Banner
          ═══════════════════════════════════════════ */}
      <div className="bg-[#1A1A1D] py-2.5 px-4">
        <div className="max-w-8xl mx-auto flex items-center justify-center gap-2 text-sm">
          <span className="text-[#C8D5A0]">
            Cursor Cloud Agents are now in Graphite. Create, review, and ship without leaving your PR.
          </span>
          <Link href="#" className="text-[#C8D5A0] hover:text-[#F5F5F5] inline-flex items-center gap-1 transition-colors">
            Read more <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
           SECTION 2: Navbar (Sticky) - Mobile Responsive
           ═══════════════════════════════════════════ */}
      <nav 
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isNavScrolled 
            ? "bg-[rgba(12,12,13,0.85)] backdrop-blur-[16px] border-b border-[rgba(255,255,255,0.06)]" 
            : "bg-transparent"
        }`}
      >
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 z-60">
              <HexagonLogo size={28} className="text-[#A0A0A8]" />
              <span className="text-lg font-semibold tracking-tight">Graphite</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              <button className="nav-text text-[#A0A0A8] hover:text-[#F5F5F5] px-4 py-2 transition-colors inline-flex items-center gap-1">
                Features <ChevronDown className="w-3 h-3" />
              </button>
              <button className="nav-text text-[#A0A0A8] hover:text-[#F5F5F5] px-4 py-2 transition-colors inline-flex items-center gap-1">
                Resources <ChevronDown className="w-3 h-3" />
              </button>
              <Link href="#" className="nav-text text-[#A0A0A8] hover:text-[#F5F5F5] px-4 py-2 transition-colors">
                Customers
              </Link>
              <Link href="#" className="nav-text text-[#A0A0A8] hover:text-[#F5F5F5] px-4 py-2 transition-colors">
                Docs
              </Link>
              <Link href="#" className="nav-text text-[#A0A0A8] hover:text-[#F5F5F5] px-4 py-2 transition-colors">
                Pricing
              </Link>
              <Link href="#" className="nav-text text-[#A0A0A8] hover:text-[#F5F5F5] px-4 py-2 transition-colors">
                Contact
              </Link>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <Link 
                href="/sign-in" 
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[rgba(255,255,255,0.06)] text-sm font-medium text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.05)] transition-all"
              >
                Log in
                <span className="w-5 h-5 rounded bg-[#222226] flex items-center justify-center text-xs">G</span>
              </Link>
              <Link 
                href="/sign-up"
                className="hidden xs:inline-flex items-center gap-1 px-4 py-2 rounded-full border border-[rgba(255,255,255,0.06)] bg-transparent text-sm font-medium text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.05)] transition-all"
              >
                Sign up <ArrowRight className="w-3 h-3" />
              </Link>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-full border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.05)] transition-all"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu Overlay */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="md:hidden mt-4 pb-4 border-t border-[rgba(255,255,255,0.06)]"
              >
                <div className="flex flex-col gap-1 pt-4">
                  <button className="nav-text text-left text-[#A0A0A8] hover:text-[#F5F5F5] px-2 py-3 transition-colors inline-flex items-center gap-2">
                    Features <ChevronDown className="w-3 h-3" />
                  </button>
                  <button className="nav-text text-left text-[#A0A0A8] hover:text-[#F5F5F5] px-2 py-3 transition-colors inline-flex items-center gap-2">
                    Resources <ChevronDown className="w-3 h-3" />
                  </button>
                  <Link href="#" className="nav-text text-left text-[#A0A0A8] hover:text-[#F5F5F5] px-2 py-3 transition-colors">
                    Customers
                  </Link>
                  <Link href="#" className="nav-text text-left text-[#A0A0A8] hover:text-[#F5F5F5] px-2 py-3 transition-colors">
                    Docs
                  </Link>
                  <Link href="#" className="nav-text text-left text-[#A0A0A8] hover:text-[#F5F5F5] px-2 py-3 transition-colors">
                    Pricing
                  </Link>
                  <Link href="#" className="nav-text text-left text-[#A0A0A8] hover:text-[#F5F5F5] px-2 py-3 transition-colors">
                    Contact
                  </Link>

                  <div className="flex flex-col gap-2 pt-4 border-t border-[rgba(255,255,255,0.06)] mt-4">
                    <Link 
                      href="/sign-in" 
                      className="inline-flex items-center gap-2 px-4 py-3 rounded-full border border-[rgba(255,255,255,0.06)] text-sm font-medium text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.05)] transition-all"
                    >
                      Log in
                      <span className="w-5 h-5 rounded bg-[#222226] flex items-center justify-center text-xs">G</span>
                    </Link>
                    <Link 
                      href="/sign-up"
                      className="inline-flex items-center gap-2 px-4 py-3 rounded-full border border-[rgba(255,255,255,0.06)] bg-transparent text-sm font-medium text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.05)] transition-all"
                    >
                      Sign up <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════
           SECTION 3: Hero Section (Asymmetric) - Mobile Responsive
           ═══════════════════════════════════════════ */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-20 pb-8 sm:pb-12 lg:pb-16">
        <div className="max-w-8xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: Text content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-xl"
            >
              <h1 className="hero-title text-[#F5F5F5] text-center lg:text-left mb-6">
                The next generation<br />
                of code review.
              </h1>
              
              <p className="body-text text-[#A0A0A8] mb-8 max-w-md mx-auto lg:mx-0">
                Graphite is the AI code review platform where teams ship higher quality code, faster.
              </p>

              <div className="flex flex-col sm:flex-row items-center lg:justify-start gap-3 mb-4">
                <Link 
                  href="/sign-up"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#E8713A] text-white text-sm font-medium hover:brightness-110 transition-all min-h-[48px]"
                >
                  Get started for free <ArrowRight className="w-4 h-4" />
                </Link>
                <Link 
                  href="#"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm font-medium hover:bg-[rgba(255,255,255,0.05)] transition-all min-h-[48px]"
                >
                  Request a demo
                </Link>
              </div>

              <p className="meta-text text-[#6B6B75] text-center lg:text-left">
                Free for your first 30 days. No credit card required. Synced with your GitHub account.
              </p>
            </motion.div>

            {/* Right: 3D Neon Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex justify-center lg:justify-end mt-8 lg:mt-0"
            >
              <div className="relative w-[250px] h-[250px] sm:w-[300px] sm:h-[300px] lg:w-[400px] lg:h-[400px]">
                {/* Outer glow */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div 
                    className="w-full h-full animate-neon-pulse"
                    style={{
                      filter: "blur(40px)",
                      background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)",
                    }}
                  />
                </div>
                
                {/* 3D Hexagon logo from SVG */}
                <div className="absolute inset-0 flex items-center justify-center animate-neon-pulse">
                  <img 
                    src="/landing/hero-logo.svg" 
                    alt="AI Code Review Platform" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
           SECTION 4: Trust Bar (Logo Marquee) - Mobile Responsive
           ═══════════════════════════════════════════ */}
      <section className="py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-8xl mx-auto">
          <div className="flex items-center gap-4 sm:gap-8">
            <p className="text-sm text-[#6B6B75] whitespace-nowrap min-w-fit">
              Trusted by leading<br className="hidden sm:block" />
              engineering teams at
            </p>
            
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center gap-8 sm:gap-12 animate-marquee">
                {[...trustLogos, ...trustLogos].map((logo, idx) => (
                  <div 
                    key={`${logo.id}-${idx}`}
                    className="text-[#6B6B75] whitespace-nowrap opacity-60 hover:opacity-100 transition-opacity h-6 sm:h-8 flex items-center flex-shrink-0"
                  >
                    <img 
                      src={logo.logo} 
                      alt={logo.name} 
                      className="h-5 sm:h-6 w-auto"
                      style={{ filter: "brightness(0.6) contrast(1.2)" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
           SECTION 5: Video Showcase - Mobile Responsive
           ═══════════════════════════════════════════ */}
      <section className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-[12px] sm:rounded-[16px] overflow-hidden bg-[#141416] border border-[rgba(255,255,255,0.08)]">
            {/* Video thumbnail with product screenshot */}
            <div className="aspect-video bg-[#0C0C0D] relative flex items-center justify-center overflow-hidden">
              {/* Product screenshot background */}
              <img 
                src="/landing/hero-preview.png" 
                alt="Product Preview"
                className="absolute inset-0 w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              
              {/* Play button */}
              <button className="relative z-10 inline-flex items-center gap-2 px-4 sm:px-6 py-3 rounded-full bg-white text-[#0C0C0D] text-sm font-medium hover:bg-gray-100 transition-all shadow-lg min-h-[48px]">
                <Play className="w-4 h-4 fill-current" />
                Play
              </button>

              {/* Video title */}
              <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 text-lg sm:text-2xl font-semibold text-white">
                Intro to AI Code Review
              </div>
            </div>

            {/* Tab bar - Mobile scrollable */}
            <div className="flex items-center gap-2 p-3 overflow-x-auto bg-[#141416] border-t border-[rgba(255,255,255,0.06)] scrollbar-hide">
              {videoTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveVideoTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                    activeVideoTab === tab.id
                      ? "bg-[#222226] text-[#F5F5F5]"
                      : "text-[#6B6B75] hover:text-[#A0A0A8]"
                  }`}
                >
                  <span className="text-xs">{tab.icon}</span>
                  <span className="hidden xs:inline">{tab.label}</span>
                  <span className="xs:hidden">{tab.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
           SECTION 6: Customer Stories Carousel - Mobile Responsive
           ═══════════════════════════════════════════ */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {customerStories.map((story) => (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`relative rounded-[12px] sm:rounded-[16px] overflow-hidden ${story.bgColor} aspect-[4/3] group cursor-pointer hover:-translate-y-1 transition-transform duration-300`}
              >
                {/* Background image */}
                <img 
                  src={story.bgImage} 
                  alt={story.company}
                  className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-multiply"
                />
                
                {/* Company logo area */}
                <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-8">
                  <span className={`text-2xl sm:text-3xl font-bold ${story.textColor}`}>
                    {story.company}
                  </span>
                </div>

                {/* Bottom overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="inline-block px-2 py-1 rounded text-xs font-medium bg-[rgba(255,255,255,0.1)] text-white/80 mb-2">
                    {story.company} Case Study
                  </div>
                  <p className="text-sm font-medium text-white leading-tight">
                    {story.title}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Carousel controls */}
          <div className="flex items-center justify-center gap-3 mt-6 sm:mt-8">
            <button className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#6B6B75] hover:text-[#F5F5F5] hover:border-[rgba(255,255,255,0.15)] transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#6B6B75] hover:text-[#F5F5F5] hover:border-[rgba(255,255,255,0.15)] transition-all">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
           SECTION 7: Feature Showcase (Vertical Accordion) - Mobile Responsive
           ═══════════════════════════════════════════ */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-[16px] sm:rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[#141416] overflow-hidden">
            {/* Plus decorators */}
            <span className="absolute top-3 sm:top-4 left-3 sm:left-4 text-[#4A4A54] text-sm">+</span>
            <span className="absolute top-3 sm:top-4 right-3 sm:right-4 text-[#4A4A54] text-sm">+</span>
            <span className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 text-[#4A4A54] text-sm">+</span>
            <span className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 text-[#4A4A54] text-sm">+</span>

            {/* Mobile: Stack vertically, Desktop: Grid */}
            <div className="block lg:grid lg:grid-cols-[1fr,380px]">
              {/* Screenshot area */}
              <div className="p-4 sm:p-6 lg:p-8 xl:p-12 flex items-center justify-center min-h-[300px] sm:min-h-[350px] lg:min-h-[400px]">
                <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg rounded-lg bg-[#0C0C0D] border border-[rgba(255,255,255,0.06)] overflow-hidden">
                  {/* Feature screenshot with animation */}
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={activeFeature}
                      src={featureShowcaseItems.find(f => f.id === activeFeature)?.screenshot}
                      alt={featureShowcaseItems.find(f => f.id === activeFeature)?.label}
                      className="w-full h-auto object-cover"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.3 }}
                    />
                  </AnimatePresence>
                </div>
              </div>

              {/* Sidebar accordion */}
              <div className="lg:border-l lg:border-[rgba(255,255,255,0.06)]">
                {featureShowcaseItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveFeature(item.id)}
                    className={`w-full text-left p-4 sm:p-6 border-b border-[rgba(255,255,255,0.06)] last:border-b-0 transition-all ${
                      activeFeature === item.id
                        ? "lg:border-l-[3px] lg:border-l-[#E8713A] bg-[rgba(232,113,58,0.05)]"
                        : "lg:border-l-[3px] lg:border-l-transparent hover:bg-[rgba(255,255,255,0.02)]"
                    }`}
                  >
                    <h3 className={`card-heading mb-2 ${
                      activeFeature === item.id ? "text-[#F5F5F5]" : "text-[#6B6B75]"
                    }`}>
                      {item.title}
                    </h3>
                    
                    <AnimatePresence>
                      {activeFeature === item.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <p className="card-body text-[#A0A0A8] mb-3 sm:mb-4">
                            {item.description}
                          </p>
                          <Link 
                            href="#"
                            className="inline-flex items-center gap-1 text-sm font-medium text-[#E8713A] hover:text-[#F09456] transition-colors"
                          >
                            Learn more <ArrowRight className="w-3 h-3" />
                          </Link>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
           SECTION 8: Feature Grid ("Everything you need") - Mobile Responsive
           ═══════════════════════════════════════════ */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-12"
          >
            <h2 className="section-title text-[#F5F5F5] mb-4">
              Everything you need to ship faster
            </h2>
            <p className="body-text text-[#A0A0A8] max-w-2xl mx-auto">
              The complete platform for modern code review and collaboration.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:gap-6">
            {/* Large card: Never wait on review */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-[12px] sm:rounded-[16px] bg-[#141416] border border-[rgba(255,255,255,0.08)] p-4 sm:p-6 lg:p-8 hover:border-[rgba(232,113,58,0.3)] hover:-translate-y-1 transition-all duration-300"
            >
              <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-center">
                <div>
                  <h3 className="feature-title text-[#F5F5F5] mb-3">
                    Never wait on review again
                  </h3>
                  <p className="card-body text-[#A0A0A8] mb-6">
                    Keep shipping while other changes are under review with stacking. Graphite&apos;s CLI and VS Code extension make it effortless to create and manage stacks, so you can stay unblocked.
                  </p>
                  <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                    <Link 
                      href="#"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#E8713A] text-white text-sm font-medium hover:brightness-110 transition-all min-h-[44px]"
                    >
                      Start stacking
                    </Link>
                    <Link 
                      href="#"
                      className="inline-flex items-center gap-1 text-sm font-medium text-[#A0A0A8] hover:text-[#F5F5F5] transition-colors"
                    >
                      Read more about our CLI <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
                <div className="bg-[#0C0C0D] rounded-lg p-3 sm:p-4 font-mono text-sm overflow-x-auto">
                  <div className="text-[#A0A0A8]">xiulung@graphite monorepo % gt log --stack</div>
                  <div className="mt-2 text-[#22C55E]">● 04-15-design_update_copy_and_layout (current)</div>
                  <div className="text-[#6B6B75]">  19 seconds ago</div>
                  <div className="text-[#22C55E]">○ 04-15-feat_create_fizzbuzz_script</div>
                  <div className="text-[#6B6B75]">  51 seconds ago</div>
                  <div className="text-[#A0A0A8]">○ main</div>
                </div>
              </div>
            </motion.div>

            {/* Two column cards */}
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="rounded-[12px] sm:rounded-[16px] bg-[#141416] border border-[rgba(255,255,255,0.08)] p-4 sm:p-6 hover:border-[rgba(232,113,58,0.3)] hover:-translate-y-1 transition-all duration-300"
              >
                <h3 className="card-heading text-[#F5F5F5] mb-2">
                  A review experience built for teams
                </h3>
                <p className="card-body text-[#A0A0A8] mb-4">
                  One unified inbox and review workflow for your team&apos;s PRs.
                </p>
                <Link 
                  href="#"
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#A0A0A8] hover:text-[#F5F5F5] transition-colors"
                >
                  Learn more <ArrowRight className="w-3 h-3" />
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="rounded-[12px] sm:rounded-[16px] bg-[#141416] border border-[rgba(255,255,255,0.08)] p-4 sm:p-6 hover:border-[rgba(232,113,58,0.3)] hover:-translate-y-1 transition-all duration-300"
              >
                <h3 className="card-heading text-[#F5F5F5] mb-2">
                  Don&apos;t miss a beat
                </h3>
                <p className="card-body text-[#A0A0A8] mb-4">
                  Actionable Slack notifications that meet you where you are.
                </p>
                <Link 
                  href="#"
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#A0A0A8] hover:text-[#F5F5F5] transition-colors"
                >
                  Read the docs <ArrowRight className="w-3 h-3" />
                </Link>
              </motion.div>
            </div>

            {/* Smarter CI + One Platform */}
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="rounded-[12px] sm:rounded-[16px] bg-[#141416] border border-[rgba(255,255,255,0.08)] p-4 sm:p-6 hover:border-[rgba(232,113,58,0.3)] hover:-translate-y-1 transition-all duration-300"
              >
                <h3 className="card-heading text-[#F5F5F5] mb-2">
                  Smarter CI
                </h3>
                <p className="card-body text-[#A0A0A8] mb-4">
                  Stacking-integrated CI that only runs when you need it.
                </p>
                <Link 
                  href="#"
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#A0A0A8] hover:text-[#F5F5F5] transition-colors"
                >
                  Read about CI Optimizations <ArrowRight className="w-3 h-3" />
                </Link>
              </motion.div>

              {/* One Platform with pills */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="rounded-[12px] sm:rounded-[16px] bg-[#141416] border border-[rgba(255,255,255,0.08)] p-4 sm:p-6 hover:border-[rgba(232,113,58,0.3)] hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex flex-col lg:flex-row lg:gap-6">
                  <div className="flex-1">
                    <h3 className="card-heading text-[#F5F5F5] mb-2">
                      One platform. All of your review essentials.
                    </h3>
                    <p className="card-body text-[#A0A0A8] mb-4">
                      Your CLI, PR page, inbox, and merge queue, unified in one seamless workflow.
                    </p>
                    <Link 
                      href="#"
                      className="inline-flex items-center gap-1 text-sm font-medium text-[#A0A0A8] hover:text-[#F5F5F5] transition-colors"
                    >
                      Read about merge queues <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                  
                  {/* Platform pills */}
                  <div className="flex flex-wrap gap-2 mt-4 lg:mt-0 lg:flex-col lg:gap-2">
                    {platformPills.map((pill) => (
                      <div 
                        key={pill.label}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-[#222226] border border-[rgba(255,255,255,0.06)] text-sm text-[#F5F5F5] flex-shrink-0"
                      >
                        <pill.icon className="w-4 h-4" />
                        {pill.label}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* AI Chat full width */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="rounded-[12px] sm:rounded-[16px] bg-[#141416] border border-[rgba(255,255,255,0.08)] p-4 sm:p-6 lg:p-8 hover:border-[rgba(232,113,58,0.3)] hover:-translate-y-1 transition-all duration-300"
            >
              <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-center">
                <div>
                  <h3 className="feature-title text-[#F5F5F5] mb-3">
                    The collaborative AI reviewer built into your PR page
                  </h3>
                  <p className="card-body text-[#A0A0A8] mb-6">
                    Resolve CI failures, apply suggested fixes, and commit your changes — all in one conversation.
                  </p>
                  <Link 
                    href="#"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#E8713A] text-white text-sm font-medium hover:brightness-110 transition-all min-h-[44px]"
                  >
                    Start chatting
                  </Link>
                </div>
                <div className="bg-[#0C0C0D] rounded-lg p-3 sm:p-4">
                  {/* AI Chat placeholder */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#7C5CFC] flex items-center justify-center text-white text-xs font-bold">
                      AI
                    </div>
                    <div className="flex-1 bg-[#1A1A1E] rounded-lg p-3">
                      <p className="text-sm text-[#A0A0A8]">
                        Graphite Agent has context on your entire codebase and PR history.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
           SECTION 11: Integration Section - Mobile Responsive
           ═══════════════════════════════════════════ */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 sm:mb-16"
          >
            <h2 className="section-title text-[#F5F5F5] mb-4">
              Developer infrastructure built for your team
            </h2>
            <p className="body-text text-[#A0A0A8]">
              Graphite works seamlessly with the technologies you already use
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: 3D Cards visualization */}
            <div className="flex justify-center order-2 lg:order-1">
              <div className="relative w-[250px] h-[250px] sm:w-[300px] sm:h-[300px]">
                {/* Stacked cards representing integrations */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-24 sm:w-48 sm:h-32 bg-[#141416] rounded-lg border border-[rgba(255,255,255,0.08)] transform rotate-[-5deg] flex items-center justify-center shadow-lg">
                  <img src="/landing/logos/slack.svg" alt="Slack" className="w-8 h-8 sm:w-10 sm:h-10 text-[#A0A0A8]" style={{ filter: "invert(0.7)" }} />
                </div>
                <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 w-40 h-24 sm:w-48 sm:h-32 bg-[#141416] rounded-lg border border-[rgba(255,255,255,0.08)] transform rotate-[2deg] flex items-center justify-center shadow-lg">
                  <img src="/landing/logos/github.svg" alt="GitHub" className="w-8 h-8 sm:w-10 sm:h-10" style={{ filter: "invert(0.7)" }} />
                </div>
                <div className="absolute bottom-12 sm:bottom-16 left-1/2 -translate-x-1/2 w-40 h-24 sm:w-48 sm:h-32 bg-[#141416] rounded-lg border border-[rgba(255,255,255,0.08)] flex items-center justify-center shadow-lg">
                  <img src="/landing/logos/vscode.svg" alt="VS Code" className="w-8 h-8 sm:w-10 sm:h-10" style={{ filter: "invert(0.7)" }} />
                </div>
              </div>
            </div>

            {/* Right: Integration descriptions */}
            <div className="space-y-6 sm:space-y-8 order-1 lg:order-2">
              <div className="border-l-2 border-[#4A4A54] pl-4 sm:pl-6">
                <h3 className="card-heading text-[#F5F5F5] mb-2">Where change happens</h3>
                <p className="card-body text-[#A0A0A8]">
                  Organizations that adopt Graphite ship more code with smaller PRs and faster review cycles.
                </p>
              </div>
              <div className="border-l-2 border-[#4A4A54] pl-4 sm:pl-6">
                <h3 className="card-heading text-[#F5F5F5] mb-2">Synced with GitHub</h3>
                <p className="card-body text-[#A0A0A8]">
                  GitHub sync and deep integration means your team is always on the same page.
                </p>
              </div>
              <div className="border-l-2 border-[#4A4A54] pl-4 sm:pl-6">
                <h3 className="card-heading text-[#F5F5F5] mb-2">Built on top of Git</h3>
                <p className="card-body text-[#A0A0A8]">
                  Graphite is integrated with all your git scripts, aliases, and workflows.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
           SECTION 12: Final CTA - Mobile Responsive
           ═══════════════════════════════════════════ */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="section-title text-[#F5F5F5] mb-6 sm:mb-8">
              Built for the world&apos;s fastest engineering<br className="hidden sm:block" />
              teams, now available for everyone.
            </h2>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link 
                href="#"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm font-medium hover:bg-[rgba(255,255,255,0.05)] transition-all min-h-[48px]"
              >
                Request a demo
              </Link>
              <Link 
                href="/sign-up"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm font-medium hover:bg-[rgba(255,255,255,0.05)] transition-all min-h-[48px]"
              >
                Start free trial <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
           SECTION 13: Footer - Mobile Responsive
           ═══════════════════════════════════════════ */}
      <footer className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-t border-[rgba(255,255,255,0.06)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-8 mb-8 sm:mb-12">
            {/* Logo */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-1">
              <HexagonLogo size={32} className="text-[#6B6B75]" />
            </div>

            {/* Features */}
            <div>
              <h4 className="text-sm font-semibold text-[#F5F5F5] mb-3 sm:mb-4">Features</h4>
              <ul className="space-y-2">
                {footerLinks.features.map((link) => (
                  <li key={link}>
                    <Link href="#" className="text-sm text-[#6B6B75] hover:text-[#F5F5F5] transition-colors inline-flex items-center gap-2">
                      {link}
                      {link === "Agents" && <span className="badge-new">NEW</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-[#F5F5F5] mb-3 sm:mb-4">Company</h4>
              <ul className="space-y-2">
                {footerLinks.company.map((link) => (
                  <li key={link}>
                    <Link href="#" className="text-sm text-[#6B6B75] hover:text-[#F5F5F5] transition-colors inline-flex items-center gap-2">
                      {link}
                      {link === "Careers" && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-[#222226] text-[#A0A0A8]">11</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div className="col-span-2 sm:col-span-1">
              <h4 className="text-sm font-semibold text-[#F5F5F5] mb-3 sm:mb-4">Resources</h4>
              <ul className="space-y-2">
                {footerLinks.resources.map((link) => (
                  <li key={link}>
                    <Link href="#" className="text-sm text-[#6B6B75] hover:text-[#F5F5F5] transition-colors">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Connect */}
            <div className="col-span-2 sm:col-span-1">
              <h4 className="text-sm font-semibold text-[#F5F5F5] mb-3 sm:mb-4">Connect</h4>
              <ul className="space-y-2">
                {footerLinks.connect.map((item) => (
                  <li key={item.label}>
                    <Link href="#" className="text-sm text-[#6B6B75] hover:text-[#F5F5F5] transition-colors inline-flex items-center gap-2">
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 sm:pt-8 border-t border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
              <span className="text-[#22C55E]">All systems operational</span>
            </div>
            <p className="text-sm text-[#4A4A54]">
              © Graphite 2026
            </p>
          </div>

          {/* Neon "Graphite" logo */}
          <div className="mt-12 sm:mt-16 flex justify-center">
            <div className="relative">
              <h2 
                className="text-[60px] sm:text-[80px] lg:text-[120px] font-bold tracking-tighter text-transparent"
                style={{
                  WebkitTextStroke: "1px rgba(255,255,255,0.3)",
                  textShadow: "0 0 40px rgba(255,255,255,0.2), 0 0 80px rgba(255,255,255,0.1)",
                }}
              >
                Graphite
              </h2>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
