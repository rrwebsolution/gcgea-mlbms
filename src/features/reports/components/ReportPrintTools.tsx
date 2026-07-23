import * as React from "react"
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react"
import { useLocation } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"

function safeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "report"
}

export function ReportPrintTools() {
  const location = useLocation()
  const isReport = location.pathname.startsWith("/reports/") && location.pathname.split("/").length > 2
  const [exporting, setExporting] = React.useState<"pdf" | "excel" | null>(null)

  if (!isReport) return null

  function reportPayload() {
    const table = document.querySelector("main table")
    if (!table) {
      toast.error("Generate the report first before exporting to Excel.")
      return null
    }
    const headers = Array.from(table.querySelectorAll("thead th")).map((cell) => cell.textContent?.trim() ?? "")
    const rows = Array.from(table.querySelectorAll("tbody tr")).map((row) =>
      Array.from(row.querySelectorAll("td")).map((cell) =>
        (cell.querySelector<HTMLElement>("[data-report-value]")?.dataset.reportValue ?? cell.innerText)
          .split(/\r?\n/)
          .map((line) => line.replace(/[ \t]+/g, " ").trim())
          .filter(Boolean)
          .join("\n")
      )
    )
    const title = document.querySelector("main h1")?.textContent?.trim()
      ?? document.querySelector("main h2")?.textContent?.trim()
      ?? "GCGEA Report"
    const pathSegments = location.pathname.split("/").filter(Boolean)
    const categorySegment = pathSegments[1] ?? ""
    const reportCategory = categorySegment === "members"
      ? "member"
      : categorySegment === "contributions"
        ? "contribution"
        : categorySegment === "loans"
          ? "loan"
          : categorySegment === "benefits"
            ? "benefit"
            : "financial"
    return { title, headers, rows, reportCategory }
  }

  async function download(format: "pdf" | "excel") {
    const payload = reportPayload()
    if (!payload || payload.headers.length === 0) return
    setExporting(format)
    try {
      const response = await api.post(`/report-exports/${format}`, payload, { responseType: "blob" })
      const url = URL.createObjectURL(response.data)
      const link = document.createElement("a")
      link.href = url
      link.download = `${safeFileName(payload.title)}-${new Date().toISOString().slice(0, 10)}.${format === "pdf" ? "pdf" : "xlsx"}`
      link.click()
      URL.revokeObjectURL(url)
      toast.success(`${format === "pdf" ? "PDF" : "Excel"} report downloaded.`)
    } catch {
      toast.error(`Unable to export the report to ${format === "pdf" ? "PDF" : "Excel"}.`)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="report-export-tools fixed bottom-6 right-6 z-40 flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 p-1.5 shadow-xl shadow-foreground/5 backdrop-blur-md transition-all duration-300 hover:shadow-2xl">
      {/* PDF Export Trigger */}
      <Button 
        size="sm" 
        variant="ghost" 
        className="h-8 px-3.5 rounded-full text-xs font-medium flex items-center gap-2 text-foreground/80 hover:text-rose-600 hover:bg-rose-500/10 dark:hover:text-rose-400 dark:hover:bg-rose-500/5 transition-all duration-200 group"
        disabled={exporting !== null} 
        onClick={() => download("pdf")}
      >
        {exporting === "pdf" ? (
          <Loader2 className="size-3.5 animate-spin text-rose-500" />
        ) : (
          <FileText className="size-3.5 text-rose-500 transition-transform group-hover:-translate-y-[0.5px]" />
        )} 
        Download PDF
      </Button>

      {/* Subtle Separator */}
      <div className="h-4 w-[1px] bg-border/60" />

      {/* Excel Export Trigger */}
      <Button 
        size="sm" 
        variant="ghost" 
        className="h-8 px-3.5 rounded-full text-xs font-medium flex items-center gap-2 text-foreground/80 hover:text-emerald-600 hover:bg-emerald-500/10 dark:hover:text-emerald-400 dark:hover:bg-emerald-500/5 transition-all duration-200 group"
        disabled={exporting !== null} 
        onClick={() => download("excel")}
      >
        {exporting === "excel" ? (
          <Loader2 className="size-3.5 animate-spin text-emerald-500" />
        ) : (
          <FileSpreadsheet className="size-3.5 text-emerald-500 transition-transform group-hover:-translate-y-[0.5px]" />
        )} 
        Export Excel
      </Button>
    </div>
  )
}
