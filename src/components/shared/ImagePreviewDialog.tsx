import * as React from "react"
import { ChevronLeft, ChevronRight, Maximize2, ZoomIn, ZoomOut } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ImageWithSkeleton } from "@/components/shared/loaders/ImageWithSkeleton"
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
  const [zoomOrigin, setZoomOrigin] = React.useState("50% 50%")
  const [isDragging, setIsDragging] = React.useState(false)
  const viewportRef = React.useRef<HTMLDivElement>(null)
  const dragStartRef = React.useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })
  const draggedRef = React.useRef(false)

  React.useEffect(() => {
    if (open) {
      setIndex(initialIndex)
      setZoom(1)
      setZoomOrigin("50% 50%")
    }
  }, [open, initialIndex])

  const current = images[index]
  const hasMultiple = images.length > 1

  function goPrev() {
    setZoom(1)
    setZoomOrigin("50% 50%")
    setIndex((i) => (i - 1 + images.length) % images.length)
  }
  function goNext() {
    setZoom(1)
    setZoomOrigin("50% 50%")
    setIndex((i) => (i + 1) % images.length)
  }

  function focusAtPointer(event: React.MouseEvent<HTMLImageElement> | React.WheelEvent<HTMLImageElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - bounds.left) / bounds.width) * 100
    const y = ((event.clientY - bounds.top) / bounds.height) * 100
    setZoomOrigin(`${Math.max(0, Math.min(100, x))}% ${Math.max(0, Math.min(100, y))}%`)
  }

  function handleWheel(event: React.WheelEvent<HTMLImageElement>) {
    event.preventDefault()
    focusAtPointer(event)
    setZoom((currentZoom) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP))))
  }

  function handleImageClick(event: React.MouseEvent<HTMLImageElement>) {
    if (draggedRef.current) {
      draggedRef.current = false
      return
    }
    focusAtPointer(event)
    setZoom((currentZoom) => Math.min(MAX_ZOOM, currentZoom + ZOOM_STEP))
  }

  function handlePointerDown(event: React.PointerEvent<HTMLImageElement>) {
    if (zoom <= MIN_ZOOM || !viewportRef.current) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      scrollLeft: viewportRef.current.scrollLeft,
      scrollTop: viewportRef.current.scrollTop,
    }
    draggedRef.current = false
    setIsDragging(true)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLImageElement>) {
    if (!isDragging || !viewportRef.current) return
    const deltaX = event.clientX - dragStartRef.current.x
    const deltaY = event.clientY - dragStartRef.current.y
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) draggedRef.current = true
    viewportRef.current.scrollLeft = dragStartRef.current.scrollLeft - deltaX
    viewportRef.current.scrollTop = dragStartRef.current.scrollTop - deltaY
  }

  function handlePointerUp(event: React.PointerEvent<HTMLImageElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    setIsDragging(false)
  }

  if (!current) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-[calc(100%-2rem)] flex-col gap-3 sm:max-w-3xl">
        <DialogTitle className="truncate pr-8">{current.name}</DialogTitle>
        <div ref={viewportRef} className="relative flex flex-1 items-center justify-center overflow-auto rounded-lg bg-muted/40">
          <ImageWithSkeleton
            key={current.url}
            src={current.url}
            alt={current.name}
            containerClassName="h-full w-full flex items-center justify-center"
            className={cn("max-h-full max-w-full select-none object-contain transition-transform duration-150", isDragging ? "cursor-grabbing" : zoom > MIN_ZOOM ? "cursor-grab" : "cursor-zoom-in")}
            style={{ transform: `scale(${zoom})`, transformOrigin: zoomOrigin }}
            onWheel={handleWheel}
            onClick={handleImageClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            draggable={false}
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
            <Button type="button" variant="outline" size="sm" onClick={() => { setZoom(1); setZoomOrigin("50% 50%") }}>
              <Maximize2 />
              Fit Screen
            </Button>
          </div>
          <span className="hidden text-[11px] text-muted-foreground md:inline">Scroll to zoom · Click to focus · Hold and drag to pan</span>
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
