import { AnnotatedDiff } from "@/components/dashboard/AnnotatedDiff"

// Required for static export with dynamic routes
export function generateStaticParams() { return [] }
export const dynamic = 'force-static'
export const dynamicParams = true

export default function DiffPage() {
  return <AnnotatedDiff />
}