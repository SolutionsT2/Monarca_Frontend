/**
 * fileUrl.ts
 *
 * Normalizes file URLs coming from API records to ensure previews/downloads
 * always point to the backend static files host.
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/+$/, "");

/**
 * Resolves a stored file URL to a usable absolute URL.
 * - Supports absolute backend links.
 * - Rewrites accidental frontend-origin `/files/*` URLs to API origin.
 * - Recovers malformed values like `undefined/files/...`.
 */
export const resolveFileUrl = (rawUrl: string): string => {
  const value = (rawUrl || "").trim();
  if (!value) return "";

  if (value.startsWith("undefined/")) {
    return `${API_BASE_URL}/${value.replace(/^undefined\/+/, "")}`;
  }

  if (value.startsWith("//files/")) {
    return `${API_BASE_URL}/${value.replace(/^\/\/+/, "")}`;
  }

  if (value.startsWith("/files/")) {
    return `${API_BASE_URL}${value}`;
  }

  try {
    const parsed = new URL(value, window.location.origin);
    if (
      parsed.pathname.startsWith("/files/") &&
      parsed.origin === window.location.origin
    ) {
      return `${API_BASE_URL}${parsed.pathname}${parsed.search}`;
    }
    return parsed.toString();
  } catch {
    return `${API_BASE_URL}/${value.replace(/^\/+/, "")}`;
  }
};

/**
 * Modification History:
 * - 2026-04-29:
 */
