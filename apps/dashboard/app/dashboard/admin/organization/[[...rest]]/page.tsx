import { OrganizationWorkspace } from "@/components/dashboard/OrganizationWorkspace"

// Required for static export with optional catch-all routes
// Return at least the empty params case for [[...rest]]
export function generateStaticParams() {
  return [{ rest: [] }]
}

// Force dynamic behavior at runtime while allowing static export
export const dynamic = 'force-static'
export const dynamicParams = true

export default function AdminOrganizationPage() {
  return <OrganizationWorkspace profilePath="/dashboard/admin/organization" showOrganizationProfile />
}
