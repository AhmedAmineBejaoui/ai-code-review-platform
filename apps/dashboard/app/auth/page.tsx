import Link from "next/link"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  EyeOff,
  Github,
  Lock,
  Shield,
  Sparkles,
  Workflow,
} from "lucide-react"

const featureItems = [
  { label: "Inline Findings", icon: Sparkles },
  { label: "Secrets Redaction", icon: Shield },
  { label: "CI/CD Policy Gates", icon: CheckCircle2 },
  { label: "RAG Citations", icon: Workflow },
]

const avatars = [
  { initials: "AM", color: "from-cyan-400 to-blue-500" },
  { initials: "SK", color: "from-fuchsia-400 to-purple-500" },
  { initials: "RD", color: "from-amber-400 to-orange-500" },
]

export default function AuthPage() {
  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-900">
      <div className="mx-auto grid min-h-screen w-full max-w-[1400px] lg:grid-cols-[61%_39%]">
        <section className="relative border-r border-slate-200/80 px-6 pb-10 pt-6 sm:px-10 lg:px-16">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                <Shield className="h-4 w-4" />
              </span>
              <span className="text-[24px] font-semibold tracking-tight">TrustReview</span>
            </Link>
            <nav className="hidden items-center gap-8 text-sm text-slate-500 md:flex">
              <Link href="#" className="transition hover:text-slate-900">
                Product
              </Link>
              <Link href="#" className="transition hover:text-slate-900">
                Pricing
              </Link>
              <Link href="#" className="transition hover:text-slate-900">
                Docs
              </Link>
            </nav>
          </div>

          <div className="mx-auto mt-16 max-w-[640px] lg:mt-24">
            <h1 className="max-w-[520px] text-balance text-5xl font-bold leading-[1.03] text-slate-900 sm:text-6xl">
              Create your TrustReview account
            </h1>
            <p className="mt-7 max-w-[560px] text-lg leading-relaxed text-slate-500">
              Automate code review with explainable AI, citations, and policy gates.
            </p>

            <div className="mt-12 rounded-2xl bg-slate-700 px-5 py-6 text-white shadow-xl shadow-slate-900/15 sm:px-6">
              <p className="mb-4 text-xs tracking-[0.15em] text-slate-300">WHAT YOU GET</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {featureItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-600 text-cyan-300">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm text-slate-100">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 flex items-center gap-4 border-t border-slate-200 pt-5">
              <div className="flex -space-x-2">
                {avatars.map((avatar) => (
                  <span
                    key={avatar.initials}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br text-[10px] font-semibold text-white ${avatar.color}`}
                  >
                    {avatar.initials}
                  </span>
                ))}
              </div>
              <p className="text-sm italic text-slate-600">&ldquo;Fewer false positives, faster merges.&rdquo;</p>
            </div>
          </div>
        </section>

        <section className="flex h-full flex-col bg-white px-6 pb-8 pt-6 sm:px-10">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-5xl font-bold tracking-tight text-slate-900">Get started</h2>
            <Link href="#" className="text-sm font-medium text-slate-700 transition hover:text-slate-900">
              Sign in
              <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              <span className="text-base font-semibold text-[#4285F4]">G</span>
              Continue with Google
            </button>
            <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              <Github className="h-4 w-4" />
              Continue with GitHub
            </button>
          </div>

          <div className="my-5 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs uppercase tracking-[0.1em] text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Full name</label>
              <input
                type="text"
                defaultValue="Ahmed Bejaoui"
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Work email</label>
              <input
                type="email"
                defaultValue="name@company.com"
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
              <div className="flex h-11 items-center rounded-xl border border-slate-200 px-3">
                <input
                  type="password"
                  defaultValue="123456"
                  className="w-full bg-transparent text-sm outline-none"
                />
                <EyeOff className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-2 overflow-hidden rounded-full bg-slate-200">
                <div className="grid grid-cols-3">
                  <span className="h-1.5 bg-rose-500" />
                  <span className="h-1.5 bg-amber-400" />
                  <span className="h-1.5 bg-emerald-400" />
                </div>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">Use 8+ characters, 1 number, 1 symbol.</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirm password</label>
              <input
                type="password"
                defaultValue="1234567"
                className="h-11 w-full rounded-xl border border-rose-400 bg-rose-50/30 px-3 text-sm outline-none"
              />
              <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-500">
                <AlertCircle className="h-3.5 w-3.5" />
                Passwords do not match
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Team / Organization name <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                defaultValue="Acme Corp"
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <label className="flex items-center gap-2 pt-1 text-sm text-slate-600">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
              I agree to
              <Link href="#" className="underline">
                Terms
              </Link>
              &
              <Link href="#" className="underline">
                Privacy Policy
              </Link>
            </label>

            <button
              type="button"
              disabled
              className="mt-1 flex h-12 w-full items-center justify-center rounded-2xl bg-slate-200 text-sm font-semibold text-slate-500"
            >
              Create account
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="#" className="font-medium text-indigo-600 hover:text-indigo-700">
              Sign in
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-slate-400">
            Protected with enterprise-grade encryption
            <Lock className="ml-1 inline h-3.5 w-3.5" />
          </p>
        </section>
      </div>
    </main>
  )
}
