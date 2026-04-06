import { Metadata } from "next"
import { ReviewInterface } from "@/components/review/ReviewInterface"

// Required for static export with dynamic routes
export function generateStaticParams() { return [] }
export const dynamic = 'force-static'
export const dynamicParams = true

export const metadata: Metadata = {
  title: "Code Review",
  description: "Review code changes and provide feedback",
}

interface ReviewPageProps {
  params: {
    id: string
  }
  searchParams: {
    assignment?: string
  }
}

export default function ReviewPage({ params, searchParams }: ReviewPageProps) {
  return (
    <ReviewInterface 
      analysisId={params.id} 
      assignmentId={searchParams.assignment}
    />
  )
}
