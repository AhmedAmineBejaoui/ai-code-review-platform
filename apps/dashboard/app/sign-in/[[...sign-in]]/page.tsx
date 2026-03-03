import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-md items-center justify-center">
        <SignIn
          path="/sign-in"
          routing="path"
          forceRedirectUrl="/"
          signUpUrl="/sign-in"
          appearance={{
            elements: {
              card: "rounded-2xl border border-slate-200 shadow-sm",
              headerTitle: "text-slate-900",
              headerSubtitle: "text-slate-500",
              socialButtonsBlockButton:
                "rounded-xl border-slate-200 hover:bg-slate-50",
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
