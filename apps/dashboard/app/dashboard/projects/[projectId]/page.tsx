// Server-side wrapper page for static export compatibility
// The actual component is a client component in client-page.tsx

import { ProjectOverviewPage } from './client-page'

// Required for static export with dynamic routes
export function generateStaticParams() {
  return []
}
export const dynamic = 'force-static'
export const dynamicParams = true

export default function Page() {
  return <ProjectOverviewPage />
}
