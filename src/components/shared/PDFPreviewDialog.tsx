import { Download, ExternalLink } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface PDFPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
  name: string
}

/**
 * Uses the browser's built-in PDF viewer (page navigation + zoom come from
 * that native chrome) instead of adding a pdf.js dependency for this.
 */
export function PDFPreviewDialog({ open, onOpenChange, url, name }: PDFPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-[calc(100%-2rem)] flex-col gap-3 sm:max-w-4xl">
        <div className="flex items-center justify-between gap-2 pr-8">
          <DialogTitle className="truncate">{name}</DialogTitle>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button type="button" variant="outline" size="sm" render={<a href={url} target="_blank" rel="noreferrer" />}>
              <ExternalLink />
              Open in New Tab
            </Button>
            <Button type="button" variant="outline" size="sm" render={<a href={url} download={name} />}>
              <Download />
              Download
            </Button>
          </div>
        </div>
        <iframe title={name} src={url} className="min-h-0 flex-1 rounded-lg border border-border bg-muted/40" />
      </DialogContent>
    </Dialog>
  )
}
