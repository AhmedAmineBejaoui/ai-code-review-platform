import Link from "next/link"

import { UserManagement } from "@/components/dashboard/UserManagement"
import { Button } from "@/components/ui/button"

export default function UsersPage() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href="/dashboard/organization">Gerer les invitations organization</Link>
        </Button>
      </div>
      <UserManagement />
    </div>
  )
}
