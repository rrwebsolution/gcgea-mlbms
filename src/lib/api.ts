import axios, { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"
import type { PaginatedResponse, PaginationParams } from "@/types"
import { notifySystemDataChanged } from "@/lib/query-client"

declare module "axios" {
  interface AxiosRequestConfig {
    /** Skip the app-wide "data changed, refetch every active query" broadcast for this write — for background autosave of an in-progress draft, which shouldn't cause every other open screen (or this one) to visibly reload. */
    silent?: boolean
  }
}

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

/**
 * Share identical GET requests that are already in flight. This protects
 * direct service calls as well as React Query calls, so mounting multiple
 * consumers at the same time still produces only one backend request.
 */
const defaultAdapter = axios.getAdapter(api.defaults.adapter)
const inFlightGets = new Map<string, Promise<AxiosResponse>>()
const recentlyCompletedGets = new Map<string, { response: AxiosResponse; expiresAt: number }>()
const GET_DEDUPE_GRACE_MS = 250

function stableSerialize(value: unknown): string {
  if (value == null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, nested]) => `${JSON.stringify(key)}:${stableSerialize(nested)}`)
    .join(",")}}`
}

const deduplicatingAdapter: AxiosAdapter = (config) => {
  if (config.method?.toLowerCase() !== "get") {
    // A successful write may change any previously read representation. Never
    // serve a grace-window response across a mutation boundary.
    recentlyCompletedGets.clear()
    return defaultAdapter(config)
  }

  const key = `${config.baseURL ?? ""}${config.url ?? ""}?${stableSerialize(config.params ?? {})}|${config.responseType ?? "json"}`
  const existing = inFlightGets.get(key)
  if (existing) return existing

  const completed = recentlyCompletedGets.get(key)
  if (completed) {
    if (completed.expiresAt > Date.now()) return Promise.resolve(completed.response)
    recentlyCompletedGets.delete(key)
  }

  const request = defaultAdapter(config)
  inFlightGets.set(key, request)
  const cleanup = (response?: AxiosResponse) => {
    if (inFlightGets.get(key) === request) inFlightGets.delete(key)
    if (response) {
      recentlyCompletedGets.set(key, { response, expiresAt: Date.now() + GET_DEDUPE_GRACE_MS })
      window.setTimeout(() => {
        const cached = recentlyCompletedGets.get(key)
        if (cached && cached.expiresAt <= Date.now()) recentlyCompletedGets.delete(key)
      }, GET_DEDUPE_GRACE_MS)
    }
  }
  void request.then((response) => cleanup(response), () => cleanup())
  return request
}

api.defaults.adapter = deduplicatingAdapter

export async function getPaginated<T>(url: string, params: PaginationParams = {}): Promise<PaginatedResponse<T>> {
  // Filtering and pagination are server-side. Never download the full table
  // merely to search a paginated list—the Laravel endpoints apply their
  // search filters before paginate(), so only the requested page is returned.
  const { data } = await api.get<PaginatedResponse<T>>(url, { params })
  return data
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

function dataDomainForUrl(url?: string): string {
  const firstSegment = (url ?? "").replace(/^https?:\/\/[^/]+/i, "").replace(/^\/?api\/?/, "").split(/[/?]/)[0]
  const aliases: Record<string, string> = {
    contribution: "contributions",
    deductions: "payroll",
    "payroll-deductions": "payroll",
    "loan-payments": "loans",
    "loan-types": "settings",
    "loan-settings": "settings",
    "benefit-types": "settings",
    "deduction-types": "settings",
    "system-settings": "settings",
    permissions: "roles",
    "approval-workflow": "approvals",
  }
  return aliases[firstSegment] ?? (firstSegment || "system")
}

api.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toLowerCase()
    if (method && ["post", "put", "patch", "delete"].includes(method) && !response.config.silent) {
      notifySystemDataChanged(dataDomainForUrl(response.config.url))
    }
    return response
  },
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

    if (status === 503 && data?.message) {
      return Promise.reject(friendlyError(data.message))
    }

    if (status >= 500) {
      return Promise.reject(friendlyError("Something went wrong on our end. Please try again later."))
    }

    return Promise.reject(friendlyError(data?.message ?? "An unexpected error occurred."))
  }
)
