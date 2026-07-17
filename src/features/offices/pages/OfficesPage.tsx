import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { PencilLine, Plus, Power, Users as UsersIcon } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/shared/PageHeader"
import { SearchInput } from "@/components/shared/SearchInput"
import { DataTable } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { PermissionButton } from "@/components/shared/PermissionButton"
import { PermissionGuard } from "@/components/shared/PermissionGuard"
import { ExportButtons } from "@/components/shared/ExportButtons"
import { Button } from "@/components/ui/button"
import { listOffices, createOffice, updateOffice, toggleOfficeStatus } from "@/services/offices.service"
import { OFFICE_STATUS_TONE } from "@/constants/status"
import { formatDateShort } from "@/utils/format"
import type { Office } from "@/types"
import { OfficeFormDialog } from "@/features/offices/components/OfficeFormDialog"

export default function OfficesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(10)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingOffice, setEditingOffice] = React.useState<Office | undefined>(undefined)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["offices", { search, page, perPage }],
    queryFn: () => listOffices({ search, page, perPage }),
  })

  const createMutation = useMutation({
    mutationFn: createOffice,
    onSuccess: () => {
      toast.success("Office added successfully.")
      queryClient.invalidateQueries({ queryKey: ["offices"] })
      queryClient.invalidateQueries({ queryKey: ["offices", "all"] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Partial<Office> }) => updateOffice(id, values),
    onSuccess: () => {
      toast.success("Office updated successfully.")
      queryClient.invalidateQueries({ queryKey: ["offices"] })
      queryClient.invalidateQueries({ queryKey: ["offices", "all"] })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: toggleOfficeStatus,
    onSuccess: (office) => {
      toast.success(`${office.name} marked as ${office.status}.`)
      queryClient.invalidateQueries({ queryKey: ["offices"] })
      queryClient.invalidateQueries({ queryKey: ["offices", "all"] })
    },
  })

  const columns: ColumnDef<Office, unknown>[] = [
    { accessorKey: "code", header: "Office Code", cell: ({ row }) => <span className="font-medium text-foreground">{row.original.code}</span> },
    { accessorKey: "name", header: "Office Name" },
    { accessorKey: "description", header: "Description", cell: ({ row }) => <span className="text-muted-foreground">{row.original.description || "—"}</span> },
    { accessorKey: "memberCount", header: "Members" },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge label={row.original.status} tone={OFFICE_STATUS_TONE[row.original.status]} /> },
    { accessorKey: "createdAt", header: "Date Created", cell: ({ row }) => formatDateShort(row.original.createdAt) },
    {
      id: "actions",
      header: "Actions",
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate(`/members?office=${encodeURIComponent(row.original.name)}`)} aria-label="View members">
            <UsersIcon />
          </Button>
          <PermissionGuard permission="offices.update">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setEditingOffice(row.original)
                setDialogOpen(true)
              }}
              aria-label="Edit office"
            >
              <PencilLine />
            </Button>
          </PermissionGuard>
          <PermissionGuard anyOf={["offices.activate", "offices.deactivate"]}>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => toggleMutation.mutate(row.original.id)}
              aria-label={row.original.status === "Active" ? "Deactivate office" : "Activate office"}
            >
              <Power />
            </Button>
          </PermissionGuard>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Office Management"
        description="Manage GCGEA member offices and departments."
        actions={
          <>
            <ExportButtons permission="offices.view" label="offices" />
            <PermissionButton permission="offices.create" onClick={() => { setEditingOffice(undefined); setDialogOpen(true) }}>
              <Plus />
              Add Office
            </PermissionButton>
          </>
        }
      />

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search by office name or code…" className="max-w-sm" />
        </div>
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyTitle="No offices found"
          emptyDescription="Try a different search term, or add a new office."
          enableColumnVisibility={false}
        />
        {data && <Pagination meta={data.meta} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1) }} />}
      </div>

      <OfficeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        office={editingOffice}
        onSubmit={async (values) => {
          if (editingOffice) {
            await updateMutation.mutateAsync({ id: editingOffice.id, values })
          } else {
            await createMutation.mutateAsync(values)
          }
        }}
      />
    </div>
  )
}
