import type { ApiErrorResponse, AuthSession } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: ApiErrorResponse
  ) {
    super(message);
  }
}

export function getApiUrl(): string {
  return API_URL;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;

  if (!isFormData && options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Network request failed";
    throw new ApiError(`Cannot reach backend API at ${API_URL}. ${message}`, 0);
  });

  if (!response.ok) {
    const details = await parseError(response);
    const message = Array.isArray(details.message)
      ? details.message.join(", ")
      : details.message ?? details.error ?? "Request failed";
    throw new ApiError(message, response.status, details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function downloadText(path: string, token: string): Promise<string> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const details = await parseError(response);
    throw new ApiError(details.error ?? "Download failed", response.status, details);
  }

  return response.text();
}

export function login(email: string, password: string): Promise<AuthSession> {
  return apiRequest<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function registerApplicant(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}): Promise<unknown> {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

async function parseError(response: Response): Promise<ApiErrorResponse> {
  try {
    return (await response.json()) as ApiErrorResponse;
  } catch {
    return {
      error: response.statusText,
      statusCode: response.status
    };
  }
}
