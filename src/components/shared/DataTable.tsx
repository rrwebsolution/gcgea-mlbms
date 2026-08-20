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

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    /** Pins this column to the given edge while the table scrolls horizontally. */
    sticky?: "left" | "right"
  }
}

export interface DataTableProps<TData> {
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
  /** Rendered as a summary bar below the table (e.g. running totals). */
  footer?: React.ReactNode
  /** Final full-width row inside tbody, immediately below the data rows. */
  bodyEnd?: React.ReactNode
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
  bodyEnd,
}: DataTableProps<TData>) {
  const { isRefreshing } = usePageRefresh()
  const initialQueryCount = useIsFetching({
    predicate: (query) => query.state.data === undefined,
  })
  // Loading always wins over the empty state. The fallback covers query-backed
  // tables whose page forgot to forward its initial isLoading flag.
  const showSkeleton = Boolean(isLoading || isRefreshing || (data.length === 0 && initialQueryCount > 0))
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
    const isFilterBar =
      previous instanceof HTMLElement &&
      previous.classList.contains("flex") &&
      previous.classList.contains("border-b")

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
  const availableStatuses = React.useMemo(
    () =>
      Array.from(
        new Set(
          data.flatMap((row) => {
            if (typeof row !== "object" || row === null || !("status" in row)) return []
            const status = (row as Record<string, unknown>).status
            return typeof status === "string" && status ? [status] : []
          })
        )
      ).sort(),
    [data]
  )

  const filteredData = React.useMemo(() => {
    if (!usesAutomaticFilters) return data
    const search = internalSearch.trim().toLowerCase()
    return data.filter((row) => {
      const record = typeof row === "object" && row !== null ? (row as Record<string, unknown>) : {}
      const matchesSearch =
        !search ||
        Object.values(record).some(
          (value) =>
            value != null &&
            typeof value !== "object" &&
            String(value).toLowerCase().includes(search)
        )
      const matchesStatus = internalStatus === "all" || record.status === internalStatus
      return matchesSearch && matchesStatus
    })
  }, [data, internalSearch, internalStatus, usesAutomaticFilters])

  const selectionColumn: ColumnDef<TData, unknown> = React.useMemo(
    () => ({
      id: "select",
      header: ({ table }) =>
        table.getRowModel().rows.some((row) => row.getCanSelect()) ? (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all rows"
            className="translate-y-[1px]"
          />
        ) : null,
      cell: ({ row }) =>
        row.getCanSelect() ? (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
            className="translate-y-[1px]"
          />
        ) : null,
      enableSorting: false,
      enableHiding: false,
      size: 40,
    }),
    []
  )

  const hasSelectableRows = React.useMemo(() => {
    if (!enableRowSelection) return false
    if (typeof enableRowSelection !== "function") return true
    return filteredData.some((item) => (enableRowSelection as (row: Row<TData>) => boolean)({ original: item } as Row<TData>))
  }, [enableRowSelection, filteredData])

  const tableColumns = hasSelectableRows ? [selectionColumn, ...columns] : columns

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

  // Sticky column offsets calculation
  const headCellRefs = React.useRef<Map<string, HTMLTableCellElement>>(new Map())
  const [stickyOffsets, setStickyOffsets] = React.useState<Record<string, number>>({})
  const visibleLeafColumnIds = table.getVisibleLeafColumns().map((c) => c.id).join(",")

  React.useLayoutEffect(() => {
    const container = rootRef.current?.querySelector<HTMLElement>('[data-slot="table-container"]')
    const tableElement = container?.querySelector<HTMLElement>('[data-slot="table"]')
    if (!container || !tableElement) return

    const updateOverflow = () => {
      setHasHorizontalOverflow(container.scrollWidth > container.clientWidth + 1)

      const leaves = table.getVisibleLeafColumns()
      const offsets: Record<string, number> = {}
      let leftAcc = 0
      for (const col of leaves) {
        if (col.columnDef.meta?.sticky !== "left") continue
        offsets[col.id] = leftAcc
        leftAcc += headCellRefs.current.get(col.id)?.offsetWidth ?? 0
      }
      let rightAcc = 0
      for (let i = leaves.length - 1; i >= 0; i--) {
        const col = leaves[i]
        if (col.columnDef.meta?.sticky !== "right") continue
        offsets[col.id] = rightAcc
        rightAcc += headCellRefs.current.get(col.id)?.offsetWidth ?? 0
      }
      setStickyOffsets(offsets)
    }

    updateOverflow()
    const resizeObserver = new ResizeObserver(updateOverflow)
    resizeObserver.observe(container)
    resizeObserver.observe(tableElement)
    return () => resizeObserver.disconnect()
  }, [data.length, tableColumns.length, visibleLeafColumnIds])

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
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
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
        render={(
          <Button
          variant="outline"
          size="sm"
          className="ml-auto h-8 shrink-0 gap-2 rounded-lg border-border/70 bg-background/80 px-3 text-xs font-semibold shadow-2xs backdrop-blur-sm transition-all duration-200 hover:bg-muted active:scale-95"
          />
        )}
      >
          <Columns3 className="size-3.5 text-muted-foreground" />
          <span>Columns</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5 shadow-md">
        <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Toggle Columns
        </div>
        {table
          .getAllColumns()
          .filter((column) => column.getCanHide())
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
              className="rounded-lg text-xs"
            >
              {typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null

  return (
    <div
      ref={rootRef}
      className="relative flex flex-col overflow-hidden"
      aria-busy={showSkeleton}
    >
      {externalToolbar && columnVisibilityMenu && createPortal(columnVisibilityMenu, externalToolbar)}

      {showToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 bg-muted/10 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{activeToolbar}</div>
          {columnVisibilityMenu}
        </div>
      )}

      {showSkeleton && <IndeterminateBar className="rounded-none" />}

      {/* Scrollable Table Viewport */}
      <Table
        containerClassName={cn(
          "data-table-scrollbar overflow-y-auto print:max-h-none print:overflow-visible",
          maxHeight
        )}
      >
        <TableHeader className="sticky top-0 z-10 border-b border-border/60 bg-background/95 backdrop-blur-md">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-none hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort()
                const sortDir = header.column.getIsSorted()
                const sticky = header.column.columnDef.meta?.sticky

                return (
                  <TableHead
                    key={header.id}
                    ref={(el) => {
                      if (el) headCellRefs.current.set(header.column.id, el)
                      else headCellRefs.current.delete(header.column.id)
                    }}
                    style={
                      sticky
                        ? { position: "sticky", [sticky]: stickyOffsets[header.column.id] ?? 0, zIndex: 20 }
                        : undefined
                    }
                    className={cn(
                      "h-11 px-4 text-left align-middle font-medium first:pl-5 last:pr-5",
                      sticky && "bg-background/95 backdrop-blur-md",
                      sticky === "left" && "shadow-[2px_0_8px_-2px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_8px_-2px_rgba(0,0,0,0.3)]",
                      sticky === "right" && "shadow-[-2px_0_8px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-2px_0_8px_-2px_rgba(0,0,0,0.3)]"
                    )}
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        className={cn(
                          "group/sort -ml-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 outline-none",
                          "focus-visible:ring-2 focus-visible:ring-primary/20",
                          sortDir
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground/80 hover:bg-muted hover:text-foreground"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                        {sortDir === "asc" ? (
                          <ArrowUp className="size-3 text-primary animate-in fade-in zoom-in duration-200" />
                        ) : sortDir === "desc" ? (
                          <ArrowDown className="size-3 text-primary animate-in fade-in zoom-in duration-200" />
                        ) : (
                          <ArrowUpDown className="size-3 text-muted-foreground/30 transition-colors group-hover/sort:text-foreground/70" />
                        )}
                      </button>
                    ) : (
                      <span className="select-none text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
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
              <TableRow key={`skeleton-${i}`} className="border-b border-border/30 last:border-0">
                {tableColumns.map((_, ci) => {
                  const widthClass = ci % 3 === 0 ? "w-2/3" : ci % 3 === 1 ? "w-11/12" : "w-1/2"
                  return (
                    <TableCell key={ci} className="py-3.5 px-4 first:pl-5 last:pr-5">
                      <Skeleton className={cn("h-4 rounded-md bg-muted/60", widthClass)} />
                    </TableCell>
                  )
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
            <>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className={cn(
                    "border-b border-border/35 transition-colors duration-150 last:border-0",
                    "hover:bg-muted/30",
                    "data-[state=selected]:bg-primary/[0.04] hover:data-[state=selected]:bg-primary/[0.07]"
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const sticky = cell.column.columnDef.meta?.sticky
                    return (
                      <TableCell
                        key={cell.id}
                        style={
                          sticky
                            ? { position: "sticky", [sticky]: stickyOffsets[cell.column.id] ?? 0, zIndex: 1 }
                            : undefined
                        }
                        className={cn(
                          "py-3.5 px-4 text-xs md:text-sm text-foreground/90 first:pl-5 last:pr-5",
                          sticky && "bg-background",
                          sticky === "left" && "shadow-[2px_0_8px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_8px_-2px_rgba(0,0,0,0.25)]",
                          sticky === "right" && "shadow-[-2px_0_8px_-2px_rgba(0,0,0,0.06)] dark:shadow-[-2px_0_8px_-2px_rgba(0,0,0,0.25)]"
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
              {bodyEnd && (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={tableColumns.length}
                    className="whitespace-normal border-t border-border/40 bg-muted/20 px-5 py-3"
                  >
                    {bodyEnd}
                  </TableCell>
                </TableRow>
              )}
            </>
          )}
        </TableBody>
      </Table>

      {/* Styled Summary Footer */}
      {footer && !showSkeleton && !isError && table.getRowModel().rows.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-border/50 bg-muted/20 px-5 py-3.5 text-xs font-semibold text-muted-foreground select-none">
          {footer}
        </div>
      )}
    </div>
  )
}
