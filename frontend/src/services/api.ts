import axios, { type AxiosRequestConfig } from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let csrfToken = "";
let csrfRequest: Promise<string> | undefined;

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  csrfRequest ??= api.get<{ csrfToken: string }>("/auth/csrf").then(({ data }) => {
    csrfToken = data.csrfToken;
    return csrfToken;
  }).finally(() => {
    csrfRequest = undefined;
  });
  return csrfRequest;
}

api.interceptors.request.use(async (config) => {
  if (["post", "put", "patch", "delete"].includes((config.method || "get").toLowerCase())) {
    config.headers.set("X-CSRF-Token", await getCsrfToken());
  }
  return config;
});

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const { data } = await api.request<T>(config);
  return data;
}

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error || error.message || "The request could not be completed.";
  }
  return error instanceof Error ? error.message : "The request could not be completed.";
}

export default api; 
