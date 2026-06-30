import { supabase } from "./supabase";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export function jsonAuthHeaders(accessToken?: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

export async function getAccessToken(): Promise<string | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function parseApiError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.error === "string" && data.error) return data.error;
  } catch {
    // ignore JSON parse errors
  }
  return `Request failed (${response.status})`;
}
