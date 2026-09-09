// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginPayload {
  identifier?: string;
  email?: string;
  password: string;
}

export interface RegisterPayload {
  username?: string;
  email: string;
  password: string;
}

export interface JwtResponse {
  token: string;
}

export interface User {
  id: number;
  publicId?: string;
  username?: string;
  email: string;
  role?: string;
  emailVerified?: boolean;
  hasPassword?: boolean;
  connectedOAuthProviders?: string[];
  createdAt: string;
}

export interface OAuthAccount {
  provider: string;
  providerEmail?: string;
  connectedAt: string;
}

export interface OAuthProvidersAvailability {
  google: boolean;
  github: boolean;
}

// ─── Folders ──────────────────────────────────────────────────────────────────

export interface Folder {
  id: number;
  name: string;
  slug?: string;
  linkCount?: number;
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export interface Tag {
  id: number;
  name: string;
  color?: string;
  linkCount?: number;
}

// ─── URLs ─────────────────────────────────────────────────────────────────────

/** Returned by POST /shorten */
export interface UrlSend {
  longUrl: string;
  shortUrl: string;
  createdAt: string;
  expiresAt?: string | null;
  isActive?: boolean;
  hasPassword?: boolean;
  tags?: Tag[];
  folderId?: number | null;
  folderName?: string | null;
}

/** Returned by GET /url/{hash} and GET /url/all */
export interface UrlDto {
  id: number;
  longUrl: string;
  shortUrl: string;
  accessed_times: number;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
  isActive?: boolean;
  hasPassword?: boolean;
  tags?: Tag[];
  folderId?: number | null;
  folderName?: string | null;
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
  expiresAt?: string | null;
  isActive?: boolean;
  hasPassword?: boolean;
  tags?: Tag[];
  folderId?: number | null;
  folderName?: string | null;
}
