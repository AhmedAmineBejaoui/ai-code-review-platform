// Server-side wrapper page for static export compatibility
import { ProjectAnalysesPage } from './client-page'

// Required for static export with dynamic routes
// Returns placeholder params - actual data is fetched client-side
export function generateStaticParams() {
  return [{ projectId: '_placeholder_' }]
}

export default function Page() {
  return <ProjectAnalysesPage />
}
