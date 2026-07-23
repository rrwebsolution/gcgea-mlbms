import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios"
import type { PaginatedResponse, PaginationParams } from "@/types"

/**
 * Centralized Axios client for the Laravel Sanctum API. Cookie/session based
 * (not bearer tokens) — see `getCsrfCookie` below — so every request carries
 * credentials and Laravel's CSRF cookie/header pair.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  withCredentials: true,
  // Axios only auto-attaches the XSRF-TOKEN cookie as a header on same-origin
  // requests by default; the frontend and API are on different ports (hence
  // different origins), so this must be explicit.
  withXSRFToken: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
})

const GLOBAL_SEARCH_PAGE_SIZE = 10_000

/**
 * Fetches list endpoints normally, but makes text searches global. Some API
 * endpoints apply their search after slicing the requested page, which means a
 * match on another page is invisible. During a search we request the complete
 * filtered set first, then paginate those matches on the client.
 */
export async function getPaginated<T>(url: string, params: PaginationParams = {}): Promise<PaginatedResponse<T>> {
  const search = typeof params.search === "string" ? params.search.trim() : ""

  if (!search) {
    const { data } = await api.get<PaginatedResponse<T>>(url, { params })
    return data
  }

  const requestedPage = Math.max(1, Number(params.page) || 1)
  const requestedPerPage = Math.max(1, Number(params.perPage) || 10)
  // Deliberately omit `search` here. This avoids endpoints that search only
  // inside the requested page instead of across the complete filtered query.
  const filterParams = { ...params }
  delete filterParams.search
  const { data: firstBatch } = await api.get<PaginatedResponse<T>>(url, {
    params: { ...filterParams, page: 1, perPage: GLOBAL_SEARCH_PAGE_SIZE },
  })

  const remainingBatches = firstBatch.meta.totalPages > 1
    ? await Promise.all(
        Array.from({ length: firstBatch.meta.totalPages - 1 }, (_, index) =>
          api.get<PaginatedResponse<T>>(url, {
            params: { ...filterParams, page: index + 2, perPage: GLOBAL_SEARCH_PAGE_SIZE },
          })
        )
      )
    : []

  const allRecords = [firstBatch.data, ...remainingBatches.map(({ data }) => data.data)].flat()
  const normalizedSearch = search.toLocaleLowerCase().replace(/\s+/g, " ")
  const compactSearch = normalizedSearch.replace(/[^\p{L}\p{N}]/gu, "")
  const matches = allRecords.filter((record) => {
    const searchableText = Object.values(record as Record<string, unknown>)
      .filter((value) => typeof value === "string" || typeof value === "number")
      .join(" ")
      .toLocaleLowerCase()
      .replace(/\s+/g, " ")
    return searchableText.includes(normalizedSearch) || (
      compactSearch.length > 0 && searchableText.replace(/[^\p{L}\p{N}]/gu, "").includes(compactSearch)
    )
  })

  const totalRecords = matches.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / requestedPerPage))
  const currentPage = Math.min(requestedPage, totalPages)
  const start = (currentPage - 1) * requestedPerPage

  return {
    data: matches.slice(start, start + requestedPerPage),
    meta: { currentPage, perPage: requestedPerPage, totalRecords, totalPages },
  }
}

/** Root origin (no trailing `/api`) — Sanctum's CSRF-cookie route lives outside the `/api` prefix. */
function apiRootOrigin(): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? "/api"
  return base.replace(/\/api\/?$/, "")
}

/** Fetches Laravel's XSRF-TOKEN cookie; call before login and whenever a 419 forces a refresh. */
export function getCsrfCookie(): Promise<unknown> {
  return axios.get(`${apiRootOrigin()}/sanctum/csrf-cookie`, { withCredentials: true })
}

export interface ApiValidationError extends Error {
  errors?: Record<string, string[]>
}

function friendlyError(message: string, errors?: Record<string, string[]>): ApiValidationError {
  const err = new Error(message) as ApiValidationError
  if (errors) err.errors = errors
  return err
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retriedAfterCsrfRefresh?: boolean
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
    const config = error.config as RetryableConfig | undefined

    if (!error.response) {
      return Promise.reject(friendlyError("Network error. Please check your connection and try again."))
    }

    const status = error.response.status
    const data = error.response.data
    const isLoginRequest = config?.url?.includes("/auth/login")

    if (status === 401) {
      if (!isLoginRequest) {
        window.dispatchEvent(new CustomEvent("gcgea:session-expired"))
      }
      return Promise.reject(friendlyError(data?.message ?? "Invalid username/email or password."))
    }

    if (status === 419) {
      if (config && !config._retriedAfterCsrfRefresh) {
        config._retriedAfterCsrfRefresh = true
        try {
          await getCsrfCookie()
          return api(config)
        } catch {
          // fall through to session-expired below
        }
      }
      window.dispatchEvent(new CustomEvent("gcgea:session-expired"))
      return Promise.reject(friendlyError("Your session has expired. Please log in again."))
    }

    if (status === 403) {
      return Promise.reject(friendlyError(data?.message ?? "You don't have permission to perform this action."))
    }

    if (status === 422) {
      return Promise.reject(friendlyError(data?.message ?? "The submitted data is invalid.", data?.errors))
    }

    if (status >= 500) {
      return Promise.reject(friendlyError("Something went wrong on our end. Please try again later."))
    }

    return Promise.reject(friendlyError(data?.message ?? "An unexpected error occurred."))
  }
)
