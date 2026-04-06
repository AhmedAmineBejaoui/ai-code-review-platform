// Server-side wrapper page for static export compatibility
import { ProjectDependenciesPage } from './client-page'

// Required for static export with dynamic routes
export function generateStaticParams() {
  return []
}
export const dynamic = 'force-static'
export const dynamicParams = true

export default function Page() {
  return <ProjectDependenciesPage />
}
