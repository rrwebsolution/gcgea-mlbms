import * as React from "react"
import { useIsFetching } from "@tanstack/react-query"
import { createPortal } from "react-dom"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type RowSelectionState,
  type Row,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { SearchInput } from "@/components/shared/SearchInput"
import { IndeterminateBar } from "@/components/shared/loaders/IndeterminateBar"
import { cn } from "@/lib/utils"
import { usePageRefresh } from "@/contexts/PageRefreshContext"

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  sorting?: SortingState
  onSortingChange?: OnChangeFn<SortingState>
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean)
  rowSelection?: RowSelectionState
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
  getRowId?: (row: TData) => string
  enableColumnVisibility?: boolean
  maxHeight?: string
  toolbar?: React.ReactNode
  /** Rendered as a summary bar below the table (e.g. running totals) — not shown while loading, in error, or empty. */
  footer?: React.ReactNode
}

export function DataTable<TData>({
  columns,
  data,
  isLoading,
  isError,
  onRetry,
  emptyTitle = "No records found",
  emptyDescription = "Try adjusting your search or filters.",
  sorting: controlledSorting,
  onSortingChange: controlledOnSortingChange,
  enableRowSelection,
  rowSelection: controlledRowSelection,
  onRowSelectionChange: controlledOnRowSelectionChange,
  getRowId,
  enableColumnVisibility = true,
  maxHeight = "max-h-[calc(100vh-22rem)]",
  toolbar,
  footer,
}: DataTableProps<TData>) {
  const { isRefreshing } = usePageRefresh()
  const activeQueryCount = useIsFetching()
  // Most pages pass their loading state explicitly. This fallback prevents a
  // premature empty-state flash on query-backed tables that have not received
  // their first row yet.
  const showSkeleton = Boolean(isLoading || isRefreshing || (data.length === 0 && activeQueryCount > 0))
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const rootRef = React.useRef<HTMLDivElement>(null)
  const [externalToolbar, setExternalToolbar] = React.useState<HTMLElement | null>(null)
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = React.useState(false)
  const [internalSearch, setInternalSearch] = React.useState("")
  const [internalStatus, setInternalStatus] = React.useState("all")

  React.useLayoutEffect(() => {
    if (toolbar) {
      setExternalToolbar(null)
      return
    }

    const previous = rootRef.current?.previousElementSibling
    const isFilterBar = previous instanceof HTMLElement
      && previous.classList.contains("flex")
      && previous.classList.contains("border-b")

    setExternalToolbar(isFilterBar ? previous : null)
  }, [toolbar])

  const isSortingControlled = controlledSorting !== undefined && controlledOnSortingChange !== undefined
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([])
  const sorting = isSortingControlled ? controlledSorting! : internalSorting
  const onSortingChange = isSortingControlled ? controlledOnSortingChange! : setInternalSorting

  const isSelectionControlled = controlledRowSelection !== undefined && controlledOnRowSelectionChange !== undefined
  const [internalRowSelection, setInternalRowSelection] = React.useState<RowSelectionState>({})
  const rowSelection = isSelectionControlled ? controlledRowSelection! : internalRowSelection
  const onRowSelectionChange = isSelectionControlled ? controlledOnRowSelectionChange! : setInternalRowSelection

  const usesAutomaticFilters = !toolbar && !externalToolbar
  const availableStatuses = React.useMemo(() => Array.from(new Set(
    data.flatMap((row) => {
      if (typeof row !== "object" || row === null || !("status" in row)) return []
      const status = (row as Record<string, unknown>).status
      return typeof status === "string" && status ? [status] : []
    })
  )).sort(), [data])
  const filteredData = React.useMemo(() => {
    if (!usesAutomaticFilters) return data
    const search = internalSearch.trim().toLowerCase()
    return data.filter((row) => {
      const record = typeof row === "object" && row !== null ? row as Record<string, unknown> : {}
      const matchesSearch = !search || Object.values(record).some((value) =>
        value != null && typeof value !== "object" && String(value).toLowerCase().includes(search)
      )
      const matchesStatus = internalStatus === "all" || record.status === internalStatus
      return matchesSearch && matchesStatus
    })
  }, [data, internalSearch, internalStatus, usesAutomaticFilters])

  const selectionColumn: ColumnDef<TData, unknown> = React.useMemo(
    () => ({
      id: "select",
      header: ({ table }) => table.getRowModel().rows.some((row) => row.getCanSelect()) ? (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all rows"
          />
        ) : null,
      cell: ({ row }) => (
        row.getCanSelect() ? (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
          />
        ) : null
      ),
      enableSorting: false,
      enableHiding: false,
      size: 36,
    }),
    []
  )

  const tableColumns = enableRowSelection ? [selectionColumn, ...columns] : columns

  React.useLayoutEffect(() => {
    const container = rootRef.current?.querySelector<HTMLElement>('[data-slot="table-container"]')
    const tableElement = container?.querySelector<HTMLElement>('[data-slot="table"]')
    if (!container || !tableElement) return

    const updateOverflow = () => {
      setHasHorizontalOverflow(container.scrollWidth > container.clientWidth + 1)
    }

    updateOverflow()
    const resizeObserver = new ResizeObserver(updateOverflow)
    resizeObserver.observe(container)
    resizeObserver.observe(tableElement)
    return () => resizeObserver.disconnect()
  }, [data.length, tableColumns.length])

  const table = useReactTable({
    data: filteredData,
    columns: tableColumns,
    state: { sorting, rowSelection, columnVisibility },
    onSortingChange,
    onRowSelectionChange,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: isSortingControlled ? undefined : getSortedRowModel(),
    getRowId,
    manualSorting: isSortingControlled,
    enableRowSelection,
  })

  const hasHiddenColumns = Object.values(columnVisibility).some((isVisible) => isVisible === false)
  const showColumnVisibility = enableColumnVisibility && (hasHorizontalOverflow || hasHiddenColumns)
  const automaticToolbar = usesAutomaticFilters ? (
    <>
      <SearchInput
        value={internalSearch}
        onChange={setInternalSearch}
        placeholder="Search records…"
        className="w-full sm:max-w-xs"
      />
      {availableStatuses.length > 0 && (
        <Select value={internalStatus} onValueChange={(value) => setInternalStatus(value ?? "all")}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="all">All Statuses</SelectItem>
            {availableStatuses.map((status) => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </>
  ) : null
  const activeToolbar = toolbar ?? automaticToolbar
  const showToolbar = Boolean(activeToolbar) || (showColumnVisibility && !externalToolbar)

  const columnVisibilityMenu = showColumnVisibility ? (
    <DropdownMenu>
      <DropdownMenuTrigger 
        render={
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-auto h-8 shrink-0 gap-2 px-3 text-xs font-medium border-border bg-background hover:bg-muted hover:text-foreground active:scale-98 transition-all duration-200 shadow-sm" 
          />
        }
      >
        <Columns3 className="size-3.5 text-muted-foreground/70" />
        Columns
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl">
        {table
          .getAllColumns()
          .filter((column) => column.getCanHide())
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
              className="text-xs"
            >
              {typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null

  return (
    <div ref={rootRef} className="flex flex-col overflow-hidden shadow-sm ">
      {externalToolbar && columnVisibilityMenu && createPortal(columnVisibilityMenu, externalToolbar)}
      {showToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/15 px-5 py-3 transition-all duration-200">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{activeToolbar}</div>
          {columnVisibilityMenu}
        </div>
      )}
      {showSkeleton && <IndeterminateBar className="rounded-none" />}
      
      {/* Scrollable Container with Custom Webkit scrollbars */}
      <Table 
        containerClassName={cn(
          "overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/15 [&::-webkit-scrollbar-thumb]:rounded-full", 
          maxHeight
        )}
      >
        <TableHeader className="sticky top-0 z-10 border-b border-border bg-background">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent border-b border-border/50">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort()
                const sortDir = header.column.getIsSorted()
                return (
                  <TableHead key={header.id} className="h-10 px-4 text-left align-middle font-medium text-muted-foreground first:pl-5 last:pr-5 animate-none">
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        className="group -ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 hover:bg-muted/80 hover:text-foreground transition-all duration-200"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <span>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {sortDir === "asc" ? (
                          <ArrowUp className="size-3 text-primary animate-in fade-in zoom-in duration-200" />
                        ) : sortDir === "desc" ? (
                          <ArrowDown className="size-3 text-primary animate-in fade-in zoom-in duration-200" />
                        ) : (
                          <ArrowUpDown className="size-3 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors" />
                        )}
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 select-none">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </span>
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {showSkeleton ? (
            Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={`skeleton-${i}`} className="border-b border-border/45 last:border-0">
                {tableColumns.map((_, ci) => {
                  const widthClass = ci % 3 === 0 
                    ? "w-2/3" 
                    : ci % 3 === 1 
                    ? "w-11/12" 
                    : "w-1/2"
                  return (
                    <TableCell key={ci} className="py-4 px-4 first:pl-5 last:pr-5">
                      <Skeleton className={cn("h-4 rounded-md", widthClass)} />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          ) : isError ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={tableColumns.length} className="whitespace-normal py-12">
                <ErrorState onRetry={onRetry} />
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={tableColumns.length} className="whitespace-normal py-12">
                <EmptyState title={emptyTitle} description={emptyDescription} />
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow 
                key={row.id} 
                data-state={row.getIsSelected() ? "selected" : undefined}
                className="transition-all border-b border-border/40 last:border-0 data-[state=selected]:bg-primary/[0.03] hover:data-[state=selected]:bg-primary/[0.06] hover:bg-muted/30 duration-150"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-3.5 px-4 text-xs md:text-sm font-normal text-foreground/90 first:pl-5 last:pr-5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Styled Premium Table Footer */}
      {footer && !showSkeleton && !isError && table.getRowModel().rows.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-border/60 bg-muted/20 dark:bg-muted/10 px-5 py-3.5 text-xs font-semibold select-none text-muted-foreground/95 rounded-b-xl">
          {footer}
        </div>
      )}
    </div>
  )
}
