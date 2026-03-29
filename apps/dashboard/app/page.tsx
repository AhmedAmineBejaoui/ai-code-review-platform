"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  Menu,
  Moon,
  Sun,
  Zap,
  Loader,
  CheckCircle2,
  Clock,
  Users,
  BarChart3,
  Code2,
  Sparkles,
  Shield,
  Rocket,
  Github,
  Chrome,
  Facebook,
  Twitter,
  Instagram,
  ArrowRight,
  Check,
  Star,
  TrendingUp,
  Target,
  Layers,
  GitBranch,
  MessageSquare,
  Award,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DottedSurface } from "@/components/ui/dotted-surface";
import { LogoCloud } from "@/components/ui/logo-cloud";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface KanbanTask {
  id: string;
  title: string;
  description: string;
  category: string;
  progress: number;
  assignees: string[];
  priority: "low" | "medium" | "high";
  dueDate: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  tasks: KanbanTask[];
  color: string;
}

interface BlogPost {
  id: string;
  title: string;
  description: string;
  author: string;
  date: string;
  imageUrl: string;
  category: string;
  readTime: string;
}

interface Testimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  company: string;
  avatar: string;
  rating: number;
}

interface PricingTier {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted: boolean;
  cta: string;
}

interface CompanyLogo {
  name: string;
  icon: any;
}

// ============================================================================
// DATA
// ============================================================================

const kanbanColumns: KanbanColumn[] = [
  {
    id: "todo",
    title: "To Do",
    color: "rgb(239, 68, 68)",
    tasks: [
      {
        id: "task-1",
        title: "Database Schema Design",
        description: "Design PostgreSQL schema for user analytics",
        category: "Backend",
        progress: 0,
        assignees: ["JD", "SM"],
        priority: "high",
        dueDate: "Mar 30",
      },
      {
        id: "task-2",
        title: "API Rate Limiting",
        description: "Implement Redis-based rate limiter",
        category: "Infrastructure",
        progress: 0,
        assignees: ["AK"],
        priority: "medium",
        dueDate: "Apr 2",
      },
    ],
  },
  {
    id: "in-progress",
    title: "In Progress",
    color: "rgb(234, 179, 8)",
    tasks: [
      {
        id: "task-3",
        title: "OAuth Integration",
        description: "Add Google & GitHub OAuth providers",
        category: "Auth",
        progress: 65,
        assignees: ["RP", "JD"],
        priority: "high",
        dueDate: "Mar 28",
      },
      {
        id: "task-4",
        title: "Dashboard UI Polish",
        description: "Refine dashboard animations and transitions",
        category: "Frontend",
        progress: 40,
        assignees: ["SM"],
        priority: "medium",
        dueDate: "Mar 29",
      },
    ],
  },
  {
    id: "in-review",
    title: "In Review",
    color: "rgb(59, 130, 246)",
    tasks: [
      {
        id: "task-5",
        title: "WebSocket Events",
        description: "Real-time collaboration events via Socket.io",
        category: "Backend",
        progress: 90,
        assignees: ["AK", "RP"],
        priority: "high",
        dueDate: "Mar 27",
      },
    ],
  },
  {
    id: "done",
    title: "Done",
    color: "rgb(34, 197, 94)",
    tasks: [
      {
        id: "task-6",
        title: "Payment Integration",
        description: "Stripe subscription billing setup",
        category: "Payments",
        progress: 100,
        assignees: ["JD", "AK"],
        priority: "high",
        dueDate: "Mar 25",
      },
      {
        id: "task-7",
        title: "Email Templates",
        description: "Transactional email designs with Resend",
        category: "Email",
        progress: 100,
        assignees: ["SM"],
        priority: "low",
        dueDate: "Mar 24",
      },
    ],
  },
];

const blogPosts: BlogPost[] = [
  {
    id: "1",
    title: "Building Scalable Task Assignment Systems",
    description:
      "How AI-powered task distribution can reduce project bottlenecks by 60% and improve team velocity.",
    author: "Sarah Chen",
    date: "Mar 15, 2026",
    imageUrl:
      "https://firebasestorage.googleapis.com/v0/b/ai-review-platform.appspot.com/o/blog%2Fscalable-systems.jpg?alt=media",
    category: "Engineering",
    readTime: "8 min read",
  },
  {
    id: "2",
    title: "The Future of Autonomous Development",
    description:
      "Exploring how AI agents are transforming software engineering workflows and accelerating delivery timelines.",
    author: "Michael Rodriguez",
    date: "Mar 10, 2026",
    imageUrl:
      "https://firebasestorage.googleapis.com/v0/b/ai-review-platform.appspot.com/o/blog%2Fautonomous-dev.jpg?alt=media",
    category: "AI & ML",
    readTime: "6 min read",
  },
  {
    id: "3",
    title: "Optimizing Team Collaboration with Smart Kanban",
    description:
      "Learn how intelligent task boards can predict blockers and automatically rebalance workload across your team.",
    author: "Emily Watson",
    date: "Mar 5, 2026",
    imageUrl:
      "https://firebasestorage.googleapis.com/v0/b/ai-review-platform.appspot.com/o/blog%2Fkanban-optimization.jpg?alt=media",
    category: "Product",
    readTime: "5 min read",
  },
];

const testimonials: Testimonial[] = [
  {
    id: "1",
    quote:
      "Codebase AI transformed how our team assigns work. Tasks are distributed intelligently based on expertise and availability. Our velocity increased 40% in the first month.",
    name: "Alex Thompson",
    role: "Engineering Manager",
    company: "TechCorp",
    avatar: "AT",
    rating: 5,
  },
  {
    id: "2",
    quote:
      "The autonomous task assignment eliminates bottlenecks. No more manual triaging in stand-ups. The AI understands context and dependencies better than we expected.",
    name: "Priya Patel",
    role: "CTO",
    company: "StartupXYZ",
    avatar: "PP",
    rating: 5,
  },
  {
    id: "3",
    quote:
      "Finally, a tool that actually reduces meetings. Codebase AI handles task distribution intelligently while keeping everyone in the loop with real-time updates.",
    name: "Marcus Johnson",
    role: "Product Lead",
    company: "InnovateLabs",
    avatar: "MJ",
    rating: 5,
  },
  {
    id: "4",
    quote:
      "The kanban board is beautifully designed and the AI suggestions are spot-on. It's like having an extra project manager who never sleeps.",
    name: "Sofia Martinez",
    role: "Senior Developer",
    company: "DevStudios",
    avatar: "SM",
    rating: 5,
  },
  {
    id: "5",
    quote:
      "We cut sprint planning time by 70%. The AI pre-assigns tasks based on historical data and team capacity. Game changer for our distributed team.",
    name: "David Kim",
    role: "VP Engineering",
    company: "CloudScale",
    avatar: "DK",
    rating: 5,
  },
  {
    id: "6",
    quote:
      "Codebase AI's insights help us identify overloaded team members before burnout happens. The predictive analytics are incredibly valuable.",
    name: "Rachel Green",
    role: "Agile Coach",
    company: "TeamFlow",
    avatar: "RG",
    rating: 5,
  },
];

const pricingTiers: PricingTier[] = [
  {
    id: "developer",
    name: "Developer",
    price: "$0",
    period: "forever",
    description: "Perfect for individual developers and small projects",
    features: [
      "Up to 3 active projects",
      "Basic task assignment",
      "Community support",
      "5 GB storage",
      "Basic analytics",
    ],
    highlighted: false,
    cta: "Start Free",
  },
  {
    id: "team",
    name: "Team Pro",
    price: "$49",
    period: "per seat/month",
    description: "For growing teams who need intelligent automation",
    features: [
      "Unlimited projects",
      "AI-powered task distribution",
      "Priority support",
      "100 GB storage",
      "Advanced analytics & insights",
      "Custom integrations",
      "Real-time collaboration",
    ],
    highlighted: true,
    cta: "Start 14-day Trial",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "contact sales",
    description: "For large organizations with custom requirements",
    features: [
      "Everything in Team Pro",
      "Dedicated account manager",
      "SLA guarantees",
      "Unlimited storage",
      "Custom AI model training",
      "On-premise deployment option",
      "Advanced security & compliance",
    ],
    highlighted: false,
    cta: "Contact Sales",
  },
];

const companyLogos: CompanyLogo[] = [
  { name: "GitHub", icon: Github },
  { name: "Chrome", icon: Chrome },
  { name: "Facebook", icon: Facebook },
  { name: "Twitter", icon: Twitter },
  { name: "Instagram", icon: Instagram },
];

// ============================================================================
// COMPONENTS
// ============================================================================

function Navbar() {
  const [isDark, setIsDark] = useState(true);

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-6xl px-4"
    >
      <nav className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3 shadow-2xl">
        {/* Animated border gradient */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 opacity-50">
            <div className="absolute inset-[-100%] animate-[spin_3s_linear_infinite] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 blur-sm" />
          </div>
        </div>

        <div className="relative flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Zap className="h-6 w-6 text-blue-400 group-hover:text-blue-300 transition-colors" />
              <div className="absolute inset-0 bg-blue-400 blur-lg opacity-50 group-hover:opacity-70 transition-opacity" />
            </div>
            <span className="font-bold text-lg text-white">Codebase AI</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="#features"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Features
            </Link>
            <Link
              href="#insights"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Insights
            </Link>
            <Link
              href="#pricing"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="#blog"
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Blog
            </Link>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Moon className="h-4 w-4 text-gray-300" />
              ) : (
                <Sun className="h-4 w-4 text-gray-300" />
              )}
            </button>

            {/* Auth */}
            <SignedOut>
              <SignInButton mode="modal">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-300 hover:text-white hover:bg-white/10"
                >
                  Sign In
                </Button>
              </SignInButton>
              <SignInButton mode="modal">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
                >
                  Get Started
                </Button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              <Link href="/dashboard">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
                >
                  Dashboard
                </Button>
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>

            {/* Mobile menu */}
            <button className="md:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
              <Menu className="h-5 w-5 text-gray-300" />
            </button>
          </div>
        </div>
      </nav>
    </motion.header>
  );
}

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 pt-32 pb-20 overflow-hidden">
      {/* Full-Screen Animated Dotted Surface Background (fixed positioning) */}
      <DottedSurface />
      
      {/* Gradient overlay for better text readability */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80 pointer-events-none z-[1]" />
      
      {/* Radial gradient overlay at center for focus */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 flex items-center justify-center z-[2]"
      >
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15),transparent_50%)] blur-[30px]" />
      </div>

      <div className="relative max-w-5xl mx-auto text-center z-10">
        {/* Animated badge */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8"
        >
          <Loader className="h-4 w-4 text-blue-400 animate-spin" />
          <span className="text-sm text-gray-300">
            Autonomous Task Assignment Platform
          </span>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight"
        >
          Full-Stack Task Assignment
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
            Powered by AI
          </span>
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed"
        >
          Let AI intelligently distribute tasks across your team based on
          expertise, availability, and workload. Eliminate bottlenecks and
          accelerate delivery with autonomous project management.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <SignedOut>
            <SignInButton mode="modal">
              <Button
                size="lg"
                className="relative group px-8 py-6 text-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Start Free Trial
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </span>
                {/* Shimmer effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </Button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <Link href="/dashboard">
              <Button
                size="lg"
                className="relative group px-8 py-6 text-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Go to Dashboard
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </Button>
            </Link>
          </SignedIn>

          <Button
            size="lg"
            variant="outline"
            className="px-8 py-6 text-lg bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            Watch Demo
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto"
        >
          {[
            { value: "60%", label: "Faster Task Distribution" },
            { value: "10k+", label: "Active Teams" },
            { value: "99.9%", label: "Uptime SLA" },
          ].map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="text-4xl font-bold text-white mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function KanbanDashboard() {
  return (
    <section className="relative py-32 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-blue-950/10 to-black" />

      <div className="relative max-w-7xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-blue-500/10 text-blue-400 border-blue-500/20">
            Smart Kanban Board
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Visualize Your Workflow
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            AI-powered task board that automatically organizes, prioritizes, and
            assigns work based on team capacity and expertise.
          </p>
        </motion.div>

        {/* Kanban board */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl"
        >
          {/* Board header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
            <div className="flex items-center gap-4">
              <h3 className="text-xl font-semibold text-white">
                Project Dashboard
              </h3>
              <Badge
                variant="outline"
                className="bg-green-500/10 text-green-400 border-green-500/20"
              >
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                Live
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:text-white hover:bg-white/5"
              >
                <Users className="h-4 w-4 mr-2" />
                Team
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:text-white hover:bg-white/5"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
            </div>
          </div>

          {/* Kanban columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kanbanColumns.map((column, colIdx) => (
              <motion.div
                key={column.id}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: colIdx * 0.1 }}
                className="bg-white/[0.02] border border-white/5 rounded-xl p-4"
              >
                {/* Column header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: column.color }}
                    />
                    <h4 className="font-semibold text-white text-sm">
                      {column.title}
                    </h4>
                    <span className="text-xs text-gray-500">
                      {column.tasks.length}
                    </span>
                  </div>
                </div>

                {/* Tasks */}
                <div className="space-y-3">
                  {column.tasks.map((task, taskIdx) => (
                    <motion.div
                      key={task.id}
                      initial={{ scale: 0.9, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: colIdx * 0.1 + taskIdx * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      className="group relative bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 rounded-lg p-3 cursor-pointer transition-all"
                    >
                      {/* Priority indicator */}
                      <div
                        className="absolute top-0 right-0 w-12 h-12 opacity-20 blur-xl"
                        style={{
                          backgroundColor:
                            task.priority === "high"
                              ? "rgb(239, 68, 68)"
                              : task.priority === "medium"
                                ? "rgb(234, 179, 8)"
                                : "rgb(34, 197, 94)",
                        }}
                      />

                      <div className="relative">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="text-sm font-medium text-white leading-tight flex-1">
                            {task.title}
                          </h5>
                        </div>

                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                          {task.description}
                        </p>

                        <div className="flex items-center justify-between text-xs">
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0.5 bg-white/5 text-gray-400 border-white/10"
                          >
                            {task.category}
                          </Badge>
                          <span className="text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {task.dueDate}
                          </span>
                        </div>

                        {/* Progress bar */}
                        {task.progress > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                              <span>Progress</span>
                              <span>{task.progress}%</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                whileInView={{ width: `${task.progress}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 1, delay: 0.5 }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: column.color }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Assignees */}
                        <div className="flex items-center gap-1 mt-3">
                          {task.assignees.map((assignee, idx) => (
                            <div
                              key={idx}
                              className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-[9px] font-semibold text-white border border-white/10"
                            >
                              {assignee}
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* AI Insights panel */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="mt-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">
                  AI Insights
                </h4>
                <p className="text-xs text-gray-400">
                  <strong className="text-blue-400">
                    OAuth Integration task
                  </strong>{" "}
                  is at risk of missing deadline. Consider reassigning{" "}
                  <strong>Database Schema Design</strong> to balance workload.
                  Team velocity: <strong className="text-green-400">+12%</strong>{" "}
                  this sprint.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function LogoMarquee() {
  const logos = companyLogos.map((logo) => ({
    name: logo.name,
    icon: <logo.icon className="h-6 w-6" />,
  }));

  return (
    <LogoCloud
      logos={logos}
      title="Trusted by innovative teams worldwide"
      variant="default"
      gap={48}
      className="py-20"
    />
  );
}

function Features() {
  const features = [
    {
      icon: Target,
      title: "Intelligent Task Assignment",
      description:
        "AI analyzes team expertise, workload, and availability to assign tasks optimally. No more manual triaging.",
      color: "blue",
    },
    {
      icon: TrendingUp,
      title: "Predictive Analytics",
      description:
        "Get early warnings about bottlenecks, missed deadlines, and capacity issues before they impact delivery.",
      color: "purple",
    },
    {
      icon: Layers,
      title: "Smart Prioritization",
      description:
        "Tasks are automatically ranked by business impact, dependencies, and urgency using ML algorithms.",
      color: "pink",
    },
    {
      icon: GitBranch,
      title: "Dependency Mapping",
      description:
        "Visualize task relationships and blockers. AI suggests optimal execution order to minimize wait time.",
      color: "green",
    },
    {
      icon: MessageSquare,
      title: "Real-Time Collaboration",
      description:
        "Live updates, comments, and notifications keep everyone aligned without constant status meetings.",
      color: "orange",
    },
    {
      icon: Award,
      title: "Performance Insights",
      description:
        "Track team velocity, individual contributions, and project health with AI-powered dashboards.",
      color: "cyan",
    },
  ];

  return (
    <section id="features" className="relative py-32 px-4">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/10 to-black" />

      <div className="relative max-w-7xl mx-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-purple-500/10 text-purple-400 border-purple-500/20">
            Powerful Features
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Built for Modern Teams
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Everything you need to streamline task management and accelerate
            delivery, powered by cutting-edge AI.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={idx}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className="group relative bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-xl p-6 transition-all cursor-pointer"
                style={
                  {
                    "--glow-color": `var(--${feature.color}-500)`,
                  } as React.CSSProperties
                }
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                  <div
                    className="absolute inset-0 rounded-xl blur-xl"
                    style={{
                      background: `radial-gradient(circle at center, var(--glow-color, rgb(59, 130, 246)) 0%, transparent 70%)`,
                      opacity: 0.15,
                    }}
                  />
                </div>

                <div className="relative">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6 text-white" />
                  </div>

                  <h3 className="text-xl font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Blog() {
  return (
    <section id="blog" className="relative py-32 px-4">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-blue-950/10 to-black" />

      <div className="relative max-w-7xl mx-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-blue-500/10 text-blue-400 border-blue-500/20">
            Engineering Insights
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Latest from Our Blog
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Deep dives into AI-powered development, team productivity, and
            software engineering best practices.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {blogPosts.map((post, idx) => (
            <motion.article
              key={post.id}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -8 }}
              className="group relative bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-xl overflow-hidden transition-all cursor-pointer"
            >
              {/* Image */}
              <div className="relative h-48 bg-gradient-to-br from-blue-500/20 to-purple-500/20 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                {/* Placeholder gradient since actual images may not load */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 opacity-30" />
                <Badge className="absolute top-4 left-4 z-20 bg-black/50 backdrop-blur-sm text-white border-white/20">
                  {post.category}
                </Badge>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                  <span>{post.author}</span>
                  <span>•</span>
                  <span>{post.date}</span>
                  <span>•</span>
                  <span>{post.readTime}</span>
                </div>

                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  {post.title}
                </h3>

                <p className="text-gray-400 text-sm leading-relaxed mb-4">
                  {post.description}
                </p>

                <div className="flex items-center text-blue-400 text-sm font-medium group-hover:gap-2 transition-all">
                  Read article
                  <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="relative py-32 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/10 to-black" />

      <div className="relative max-w-7xl mx-auto mb-16">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Badge className="mb-4 bg-purple-500/10 text-purple-400 border-purple-500/20">
            Customer Stories
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Loved by Teams Everywhere
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            See how engineering teams use Codebase AI to ship faster and work
            smarter.
          </p>
        </motion.div>
      </div>

      {/* First row - scrolling right to left */}
      <div className="relative mb-6">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10" />

        <div className="flex overflow-hidden">
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="flex gap-6"
          >
            {[...testimonials.slice(0, 3), ...testimonials.slice(0, 3)].map(
              (testimonial, idx) => (
                <div
                  key={idx}
                  className="flex-shrink-0 w-[400px] bg-white/[0.02] border border-white/5 rounded-xl p-6"
                >
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>

                  <p className="text-gray-300 text-sm leading-relaxed mb-6">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-sm font-semibold text-white">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">
                        {testimonial.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {testimonial.role} at {testimonial.company}
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}
          </motion.div>
        </div>
      </div>

      {/* Second row - scrolling left to right */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10" />

        <div className="flex overflow-hidden">
          <motion.div
            animate={{ x: ["-50%", "0%"] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="flex gap-6"
          >
            {[...testimonials.slice(3, 6), ...testimonials.slice(3, 6)].map(
              (testimonial, idx) => (
                <div
                  key={idx}
                  className="flex-shrink-0 w-[400px] bg-white/[0.02] border border-white/5 rounded-xl p-6"
                >
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>

                  <p className="text-gray-300 text-sm leading-relaxed mb-6">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-sm font-semibold text-white">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">
                        {testimonial.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {testimonial.role} at {testimonial.company}
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="relative py-32 px-4">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-blue-950/10 to-black" />

      <div className="relative max-w-7xl mx-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-blue-500/10 text-blue-400 border-blue-500/20">
            Simple Pricing
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Choose Your Plan
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Start free, scale as you grow. No hidden fees, cancel anytime.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingTiers.map((tier, idx) => (
            <motion.div
              key={tier.id}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -8 }}
              className={`relative bg-white/[0.02] border rounded-2xl p-8 transition-all ${
                tier.highlighted
                  ? "border-blue-500/50 shadow-2xl shadow-blue-500/20 scale-105"
                  : "border-white/5 hover:border-white/10"
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">
                  {tier.name}
                </h3>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-5xl font-bold text-white">
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="text-gray-500 text-sm">
                      /{tier.period}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400">{tier.description}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {tier.features.map((feature, featureIdx) => (
                  <li key={featureIdx} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <SignedOut>
                <SignInButton mode="modal">
                  <Button
                    className={`w-full ${
                      tier.highlighted
                        ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
                        : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                    }`}
                  >
                    {tier.cta}
                  </Button>
                </SignInButton>
              </SignedOut>

              <SignedIn>
                <Link href="/dashboard">
                  <Button
                    className={`w-full ${
                      tier.highlighted
                        ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
                        : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                    }`}
                  >
                    {tier.cta}
                  </Button>
                </Link>
              </SignedIn>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const footerLinks = {
    product: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Integrations", href: "#" },
      { label: "API Docs", href: "#" },
      { label: "Changelog", href: "#" },
    ],
    company: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#blog" },
      { label: "Careers", href: "#" },
      { label: "Press Kit", href: "#" },
      { label: "Contact", href: "#" },
    ],
    resources: [
      { label: "Documentation", href: "#" },
      { label: "Guides", href: "#" },
      { label: "Community", href: "#" },
      { label: "Support", href: "#" },
      { label: "Status", href: "#" },
    ],
    legal: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Security", href: "#" },
      { label: "Cookies", href: "#" },
    ],
  };

  return (
    <footer className="relative border-t border-white/5 bg-black">
      {/* Cosmic grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-50" />

      <div className="relative max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Zap className="h-6 w-6 text-blue-400" />
              <span className="font-bold text-lg text-white">Codebase AI</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              AI-powered task assignment for modern development teams.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © 2026 Codebase AI. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>Built with</span>
            <Zap className="h-4 w-4 text-blue-400" />
            <span>by developers, for developers</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function LandingPage() {
  return (
    <main className="relative min-h-screen bg-black text-white overflow-x-hidden">
      <Navbar />
      <Hero />
      <LogoMarquee />
      <KanbanDashboard />
      <Features />
      <Blog />
      <Testimonials />
      <Pricing />
      <Footer />
    </main>
  );
}
