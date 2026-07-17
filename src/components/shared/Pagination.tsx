import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { PaginationMeta } from "@/types"

interface PaginationProps {
  meta: PaginationMeta
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
  perPageOptions?: number[]
}

export function Pagination({ meta, onPageChange, onPerPageChange, perPageOptions = [10, 25, 50, 100] }: PaginationProps) {
  const { currentPage, perPage, totalRecords, totalPages } = meta
  const start = totalRecords === 0 ? 0 : (currentPage - 1) * perPage + 1
  const end = Math.min(currentPage * perPage, totalRecords)

  return (
    <div className="flex flex-col-reverse items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          Showing {start}–{end} of {totalRecords}
        </span>
        <Select value={String(perPage)} onValueChange={(v) => onPerPageChange(Number(v))}>
          <SelectTrigger size="sm" className="ml-2 h-7">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {perPageOptions.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon-sm" disabled={currentPage <= 1} onClick={() => onPageChange(1)} aria-label="First page">
          <ChevronsLeft />
        </Button>
        <Button variant="outline" size="icon-sm" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)} aria-label="Previous page">
          <ChevronLeft />
        </Button>
        <span className="px-2 text-sm text-foreground">
          Page {currentPage} of {totalPages}
        </span>
        <Button variant="outline" size="icon-sm" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)} aria-label="Next page">
          <ChevronRight />
        </Button>
        <Button variant="outline" size="icon-sm" disabled={currentPage >= totalPages} onClick={() => onPageChange(totalPages)} aria-label="Last page">
          <ChevronsRight />
        </Button>
      </div>
    </div>
  )
}
