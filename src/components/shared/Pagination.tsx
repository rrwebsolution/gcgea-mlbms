import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CommandSelect } from "@/components/shared/CommandSelect"
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
    <div className="flex flex-col-reverse items-center justify-between gap-4 border-t border-border/60 bg-muted/5 px-6 py-3.5 sm:flex-row transition-all duration-200">
      
      {/* Left Slot: Page-size Select + Record range indicator */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="font-medium">
          Showing <span className="font-bold text-foreground">{start}</span>–<span className="font-bold text-foreground">{end}</span> of <span className="font-bold text-foreground">{totalRecords}</span>
        </span>
        <CommandSelect
          size="sm"
          className="ml-1 h-7 w-[100px] text-xs bg-background border-border/80 hover:bg-accent/80 active:scale-98 transition-all"
          value={String(perPage)}
          onValueChange={(v) => onPerPageChange(Number(v))}
          options={perPageOptions.map((option) => ({ value: String(option), label: `${option} / page` }))}
          hideSearch
        />
      </div>

      {/* Right Slot: Navigation Controls */}
      <div className="flex items-center gap-1.5">
        <Button 
          variant="outline" 
          size="icon-sm" 
          className="size-7 hover:bg-accent/80 active:scale-95 transition-all duration-200 disabled:opacity-40"
          disabled={currentPage <= 1} 
          onClick={() => onPageChange(1)} 
          aria-label="First page"
        >
          <ChevronsLeft className="size-3.5" />
        </Button>
        <Button 
          variant="outline" 
          size="icon-sm" 
          className="size-7 hover:bg-accent/80 active:scale-95 transition-all duration-200 disabled:opacity-40"
          disabled={currentPage <= 1} 
          onClick={() => onPageChange(currentPage - 1)} 
          aria-label="Previous page"
        >
          <ChevronLeft className="size-3.5" />
        </Button>
        
        <span className="px-3 text-xs font-semibold text-muted-foreground/80">
          Page <span className="text-foreground font-bold">{currentPage}</span> of <span className="text-foreground font-bold">{totalPages}</span>
        </span>

        <Button 
          variant="outline" 
          size="icon-sm" 
          className="size-7 hover:bg-accent/80 active:scale-95 transition-all duration-200 disabled:opacity-40"
          disabled={currentPage >= totalPages} 
          onClick={() => onPageChange(currentPage + 1)} 
          aria-label="Next page"
        >
          <ChevronRight className="size-3.5" />
        </Button>
        <Button 
          variant="outline" 
          size="icon-sm" 
          className="size-7 hover:bg-accent/80 active:scale-95 transition-all duration-200 disabled:opacity-40"
          disabled={currentPage >= totalPages} 
          onClick={() => onPageChange(totalPages)} 
          aria-label="Last page"
        >
          <ChevronsRight className="size-3.5" />
        </Button>
      </div>

    </div>
  )
}