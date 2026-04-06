import { RagCitations } from "@/components/dashboard/RagCitations"

// Required for static export with dynamic routes
export function generateStaticParams() { return [] }
export const dynamic = 'force-static'
export const dynamicParams = true

export default function RagPage() {
  return <RagCitations />
}