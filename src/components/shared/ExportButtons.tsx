import { FileSpreadsheet, FileText } from "lucide-react"
import { toast } from "sonner"
import { PermissionButton } from "@/components/shared/PermissionButton"
import type { PermissionCode } from "@/types"

interface ExportButtonsProps {
  permission?: PermissionCode
  label?: string
  onExportExcel?: () => void
  onExportPdf?: () => void
}

export function ExportButtons({ permission, label = "record(s)", onExportExcel, onExportPdf }: ExportButtonsProps) {
  return (
    <>
      <PermissionButton
        permission={permission}
        variant="outline"
        size="sm"
        onClick={onExportExcel ?? (() => toast.success(`Exporting ${label} to Excel…`))}
      >
        <FileSpreadsheet />
        Export Excel
      </PermissionButton>
      <PermissionButton
        permission={permission}
        variant="outline"
        size="sm"
        onClick={onExportPdf ?? (() => toast.success(`Exporting ${label} to PDF…`))}
      >
        <FileText />
        Export PDF
      </PermissionButton>
    </>
  )
}
