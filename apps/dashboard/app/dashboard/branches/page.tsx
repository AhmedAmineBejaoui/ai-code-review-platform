import { BranchList } from "@/components/dashboard/BranchList"

type BranchesPageProps = {
  searchParams?: {
    repo_id?: string
    org_id?: string
  }
}

export default function BranchesPage({ searchParams }: BranchesPageProps) {
  return <BranchList repoId={searchParams?.repo_id} orgId={searchParams?.org_id} />
}
