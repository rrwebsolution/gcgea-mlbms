import axios from "axios"

/**
 * Central Axios instance for the future Laravel Sanctum API.
 * Not yet wired to a live backend — mock services in `src/services/*.service.ts`
 * currently serve data directly. Swap those implementations to call `http`
 * against the real endpoints once the Laravel API is available.
 */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent("gcgea:session-expired"))
    }
    return Promise.reject(error)
  }
)

export function simulateDelay<T>(data: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}
