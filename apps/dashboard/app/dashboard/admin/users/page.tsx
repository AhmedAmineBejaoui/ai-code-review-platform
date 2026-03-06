import { UserManagement } from "@/components/dashboard/UserManagement"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function UsersPage() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href="/dashboard/organization">GÃ©rer les invitations organization</Link>
        </Button>
      </div>
      <UserManagement />
    </div>
  )
}
