import { Metadata } from "next"
import { InlineCodeReview } from "@/components/review/InlineCodeReview"

export const metadata: Metadata = {
  title: "Code Review Demo - AI Code Review Platform",
  description: "Experience AI-powered code review in action",
}

export default function CodeReviewDemoPage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Live Code Review Demo</h1>
        <p className="mt-2 text-muted-foreground">
          See how our AI detects issues and provides actionable suggestions in real-time
        </p>
      </div>

      <InlineCodeReview />
    </div>
  )
}
