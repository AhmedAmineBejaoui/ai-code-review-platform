import { AlertTriangle, ShieldAlert } from "lucide-react"

type ClerkConfigurationNoticeProps = {
  title?: string
  description?: string
}

export function ClerkConfigurationNotice({
  title = "Authentication temporarily unavailable",
  description = "Clerk is not configured for this deployment. Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to the runtime and redeploy the dashboard build.",
}: ClerkConfigurationNoticeProps) {
  return (
    <div className="space-y-5 rounded-[16px] border border-[--auth-border] bg-[--auth-glass] p-5 shadow-[0_22px_70px_var(--auth-card-shadow)] sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-[12px] border border-[--auth-border] bg-[--auth-field] text-[--orange]">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[--orange]">Auth status</p>
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">{title}</h1>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="rounded-[12px] border border-[--auth-border] bg-[--auth-field] px-4 py-3 text-sm text-muted-foreground">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[--orange]" />
          <p>
            The sign-in form is hidden because the client-side Clerk bootstrap script cannot initialize without a valid
            publishable key.
          </p>
        </div>
      </div>
    </div>
  )
}
