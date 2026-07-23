import * as React from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { ClipboardCheck, Eye } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { StatCard } from "@/components/shared/StatCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { listMyApprovals } from "@/services/approvals.service"
import { formatDateTime } from "@/utils/format"
import type { StatusTone } from "@/constants/status"
import type { MyApprovalItem, MyApprovalTab } from "@/types"

const TABS: { value: MyApprovalTab; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "returned", label: "Returned" },
  { value: "released", label: "Released" },
]

function statusTone(status: string): StatusTone {
  if (status === "approved" || status === "released") return "success"
  if (status === "rejected") return "danger"
  if (status === "returned") return "warning"
  if (status === "pending") return "info"
  return "neutral"
}

export default function MyApprovalsPage() {
  const [tab, setTab] = React.useState<MyApprovalTab>("pending")
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["my-approvals", { tab, page, perPage }],
    queryFn: () => listMyApprovals({ tab, page, perPage }),
  })

  const { data: pendingData } = useQuery({
    queryKey: ["my-approvals", { tab: "pending", page: 1, perPage: 1 }],
    queryFn: () => listMyApprovals({ tab: "pending", page: 1, perPage: 1 }),
    enabled: tab !== "pending",
  })
  const pendingCount = tab === "pending" ? (data?.meta.totalRecords ?? 0) : (pendingData?.meta.totalRecords ?? 0)

  function handleTabChange(value: unknown) {
    setTab(value as MyApprovalTab)
    setPage(1)
  }

  const columns: ColumnDef<MyApprovalItem, unknown>[] = [
    {
      accessorKey: "reference",
      header: "Reference",
      cell: ({ row }) => (
        <Link
          to={`/approvals/${row.original.subjectType}/${row.original.subjectId}`}
          className="font-semibold text-primary hover:text-primary/80 hover:underline"
        >
          {row.original.reference ?? "—"}
        </Link>
      ),
    },
    { accessorKey: "title", header: "Module" },
    { accessorKey: "memberName", header: "Member", cell: ({ row }) => row.original.memberName ?? "—" },
    { accessorKey: "currentStageLabel", header: "Current Stage", cell: ({ row }) => row.original.currentStageLabel ?? "—" },
    {
      id: "when",
      header: tab === "pending" ? "Submitted" : "Acted On",
      cell: ({ row }) => formatDateTime(row.original.submittedAt ?? row.original.actedAt ?? ""),
    },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge label={row.original.status} tone={statusTone(row.original.status)} /> },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          render={<Link to={`/approvals/${row.original.subjectType}/${row.original.subjectId}`} />}
        >
          <Eye className="size-3.5" /> View
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="My Approvals" description="Applications and registrations currently awaiting your action, and your recent decisions." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Pending My Action" value={String(pendingCount)} icon={ClipboardCheck} tone="warning" isLoading={isLoading} />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
          <Tabs value={tab} onValueChange={handleTabChange}>
            <TabsList>
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyTitle="Nothing here"
          emptyDescription={tab === "pending" ? "You have no approvals waiting for your action." : `No ${tab} items yet.`}
        />
        {data && <Pagination meta={data.meta} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1) }} />}
      </div>
    </div>
  )
}
