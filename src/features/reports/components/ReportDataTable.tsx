import * as React from "react"
import { DataTable, type DataTableProps } from "@/components/shared/DataTable"
import { Pagination } from "@/components/shared/Pagination"
import { paginate } from "@/utils/paginate"

type ReportDataTableProps<TData> = DataTableProps<TData> & {
  initialPageSize?: number
}

export function ReportDataTable<TData>({ data, initialPageSize = 25, ...props }: ReportDataTableProps<TData>) {
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(initialPageSize)
  const { data: pagedRows, meta } = React.useMemo(() => paginate(data, page, perPage), [data, page, perPage])

  React.useEffect(() => {
    if (page > meta.totalPages) setPage(Math.max(1, meta.totalPages))
  }, [page, meta.totalPages])

  return (
    <>
      <DataTable {...props} data={pagedRows} />
      {!props.isLoading && !props.isError && data.length > 0 && (
        <Pagination
          meta={meta}
          onPageChange={setPage}
          onPerPageChange={(value) => {
            setPerPage(value)
            setPage(1)
          }}
        />
      )}
    </>
  )
}
