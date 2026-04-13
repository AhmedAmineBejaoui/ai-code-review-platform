export const clerkAuthAppearance = {
  elements: {
    rootBox: "w-full",
    cardBox: "w-full",
    card: "w-full border-0 bg-transparent p-0 shadow-none",
    headerTitle:
      "text-[1.95rem] leading-tight font-semibold tracking-[-0.04em] text-foreground",
    headerSubtitle: "mt-2 text-sm text-muted-foreground",
    header: "px-4 pt-5",
    form: "px-4 pb-5",
    socialButtonsBlockButton:
      "h-11 rounded-xl border border-border bg-card text-foreground shadow-none transition-colors hover:bg-card-hover",
    socialButtonsBlockButtonText: "text-sm font-medium text-foreground",
    dividerLine: "bg-border",
    dividerText: "text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground",
    formFieldLabel: "text-sm font-medium text-foreground",
    formFieldInput:
      "h-11 rounded-xl border border-border bg-background text-sm text-foreground shadow-none focus:border-orange focus:ring-orange/20",
    formFieldInputShowPasswordButton: "text-muted-foreground hover:text-foreground",
    formButtonPrimary:
      "h-11 rounded-xl bg-orange text-sm font-semibold text-white shadow-none transition-colors hover:bg-orange-hover",
    footerActionText: "text-sm text-muted-foreground",
    footerActionLink: "text-sm font-medium text-teal hover:text-teal/80",
    identityPreviewText: "text-sm text-muted-foreground",
    formFieldErrorText: "text-sm text-red-500",
    formFieldSuccessText: "text-sm text-green-status",
    formResendCodeLink: "text-sm font-medium text-teal hover:text-teal/80",
    otpCodeFieldInput:
      "h-11 rounded-xl border border-border bg-background text-sm text-foreground focus:border-orange focus:ring-orange/20",
    alertText: "text-sm text-muted-foreground",
  },
} as const
