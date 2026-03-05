import { SignIn } from "@clerk/nextjs"

import { ThemeModeButton } from "@/components/theme-mode-button"

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 py-10 dark:bg-slate-950 sm:px-6">
      <div className="mx-auto mb-6 flex w-full max-w-md justify-end">
        <ThemeModeButton />
      </div>
      <div className="mx-auto flex min-h-[80vh] w-full max-w-md items-center justify-center">
        <SignIn
          path="/sign-in"
          routing="path"
          forceRedirectUrl="/auth/role-redirect"
          fallbackRedirectUrl="/auth/role-redirect"
          signUpUrl="/sign-up"
          appearance={{
            elements: {
              card: "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900",
              headerTitle: "text-slate-900 dark:text-slate-100",
              headerSubtitle: "text-slate-500 dark:text-slate-400",
              socialButtonsBlockButton:
                "rounded-xl border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800",
              socialButtonsBlockButtonText:
                "text-slate-700 dark:text-slate-200",
              formFieldLabel: "text-slate-700 dark:text-slate-300",
              formFieldInput:
                "border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
              dividerText: "text-slate-400 dark:text-slate-500",
              dividerLine: "bg-slate-200 dark:bg-slate-700",
              formButtonPrimary:
                "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-xl",
              footerActionLink: "text-indigo-600 hover:text-indigo-700",
            },
          }}
        />
      </div>
    </main>
  )
}
