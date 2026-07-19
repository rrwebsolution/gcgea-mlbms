import * as React from "react"
import { createPortal } from "react-dom"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type RowSelectionState,
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
import { EmptyState } from "@/components/shared/EmptyState"
import { ErrorState } from "@/components/shared/ErrorState"
import { cn } from "@/lib/utils"

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
  enableRowSelection?: boolean
  rowSelection?: RowSelectionState
  onRowSelectionChange?: OnChangeFn<RowSelectionState>
  getRowId?: (row: TData) => string
  enableColumnVisibility?: boolean
  maxHeight?: string
  toolbar?: React.ReactNode
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
}: DataTableProps<TData>) {
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const rootRef = React.useRef<HTMLDivElement>(null)
  const [externalToolbar, setExternalToolbar] = React.useState<HTMLElement | null>(null)

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

  const selectionColumn: ColumnDef<TData, unknown> = React.useMemo(
    () => ({
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all rows"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 36,
    }),
    []
  )

  const tableColumns = enableRowSelection ? [selectionColumn, ...columns] : columns

  const table = useReactTable({
    data,
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

  const showToolbar = Boolean(toolbar) || (enableColumnVisibility && !externalToolbar)

  const columnVisibilityMenu = enableColumnVisibility ? (
    <DropdownMenu>
      <DropdownMenuTrigger 
        render={
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-auto h-8 shrink-0 gap-2 px-3 text-xs hover:bg-accent/80 active:scale-98 transition-all" 
          />
        }
      >
        <Columns3 className="size-3.5 text-muted-foreground" />
        Columns
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {table
          .getAllColumns()
          .filter((column) => column.getCanHide())
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null

  return (
    <div ref={rootRef} className="flex flex-col border border-border/60 bg-card overflow-hidden shadow-sm">
      {externalToolbar && columnVisibilityMenu && createPortal(columnVisibilityMenu, externalToolbar)}
      {showToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/10 px-4 py-2.5 transition-all">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{toolbar}</div>
          {columnVisibilityMenu}
        </div>
      )}
      <Table containerClassName={cn("overflow-y-auto", maxHeight)}>
        <TableHeader className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_var(--color-border)]">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort()
                const sortDir = header.column.getIsSorted()
                return (
                  <TableHead key={header.id} className="bg-card">
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        className="group flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 hover:text-foreground transition-colors"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sortDir === "asc" ? (
                          <ArrowUp className="size-3.5 text-primary" />
                        ) : sortDir === "desc" ? (
                          <ArrowDown className="size-3.5 text-primary" />
                        ) : (
                          <ArrowUpDown className="size-3.5 text-muted-foreground/40 group-hover:text-muted-foreground/80 transition-colors" />
                        )}
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90">
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
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                {tableColumns.map((_, ci) => (
                  <TableCell key={ci}>
                    <Skeleton className={cn("h-4 w-full", ci % 2 === 0 ? "max-w-[120px]" : "max-w-[80px]")} />
                  </TableCell>
                ))}
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
                className="transition-colors data-[state=selected]:bg-primary/5 hover:data-[state=selected]:bg-primary/10"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
