import { Metadata } from "next"
import { ReviewerDashboard } from "@/components/reviewer/ReviewerDashboard"

export const metadata: Metadata = {
  title: "Reviewer Dashboard",
  description: "Code review dashboard for reviewers",
}

export default function ReviewerDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="card-heading text-foreground">Reviewer Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage your code reviews, assignments, and performance metrics.
        </p>
      </div>
      <ReviewerDashboard />
    </div>
  )
}