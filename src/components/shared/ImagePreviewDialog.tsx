import * as React from "react"
import { ChevronLeft, ChevronRight, Maximize2, ZoomIn, ZoomOut } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ImagePreviewItem {
  url: string
  name: string
}

interface ImagePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  images: ImagePreviewItem[]
  initialIndex?: number
}

const ZOOM_STEP = 0.5
const MIN_ZOOM = 1
const MAX_ZOOM = 3

export function ImagePreviewDialog({ open, onOpenChange, images, initialIndex = 0 }: ImagePreviewDialogProps) {
  const [index, setIndex] = React.useState(initialIndex)
  const [zoom, setZoom] = React.useState(1)

  React.useEffect(() => {
    if (open) {
      setIndex(initialIndex)
      setZoom(1)
    }
  }, [open, initialIndex])

  const current = images[index]
  const hasMultiple = images.length > 1

  function goPrev() {
    setZoom(1)
    setIndex((i) => (i - 1 + images.length) % images.length)
  }
  function goNext() {
    setZoom(1)
    setIndex((i) => (i + 1) % images.length)
  }

  if (!current) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-[calc(100%-2rem)] flex-col gap-3 sm:max-w-3xl">
        <DialogTitle className="truncate pr-8">{current.name}</DialogTitle>
        <div className="relative flex flex-1 items-center justify-center overflow-auto rounded-lg bg-muted/40">
          <img
            src={current.url}
            alt={current.name}
            className={cn("max-h-full max-w-full object-contain transition-transform duration-150", zoom > 1 && "cursor-move")}
            style={{ transform: `scale(${zoom})` }}
          />
          {hasMultiple && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 shadow-md"
                onClick={goPrev}
              >
                <ChevronLeft />
                <span className="sr-only">Previous image</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 shadow-md"
                onClick={goNext}
              >
                <ChevronRight />
                <span className="sr-only">Next image</span>
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="icon-sm" onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))} disabled={zoom <= MIN_ZOOM}>
              <ZoomOut />
              <span className="sr-only">Zoom out</span>
            </Button>
            <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
            <Button type="button" variant="outline" size="icon-sm" onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))} disabled={zoom >= MAX_ZOOM}>
              <ZoomIn />
              <span className="sr-only">Zoom in</span>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setZoom(1)}>
              <Maximize2 />
              Fit Screen
            </Button>
          </div>
          {hasMultiple && (
            <span className="text-xs text-muted-foreground">
              {index + 1} / {images.length}
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
