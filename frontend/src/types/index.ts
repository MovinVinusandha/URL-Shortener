// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface JwtResponse {
  token: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

// ─── URLs ─────────────────────────────────────────────────────────────────────

/** Returned by POST /shorten */
export interface UrlSend {
  longUrl: string;
  shortUrl: string;
  createdAt: string;
}

/** Returned by GET /url/{hash} and GET /url/all */
export interface UrlDto {
  id: number;
  longUrl: string;
  shortUrl: string;
  accessed_times: number;
  createdAt: string;
  updatedAt: string;
}

/** Returned by PUT /url/{hash} */
export interface UrlUpdateDto {
  longUrl: string;
  shortUrl: string;
  createdAt: string;
  updatedAt: string;
}

/** Unified type used in the dashboard state (merges UrlSend + UrlDto) */
export interface UrlEntry {
  longUrl: string;
  shortUrl: string;
  accessed_times?: number;
  createdAt: string;
  updatedAt?: string;
}
