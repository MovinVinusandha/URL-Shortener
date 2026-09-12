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

export interface PublicAuthConfig {
  isSelfHosted: boolean;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  googleOAuthEnabled: boolean;
  githubOAuthEnabled: boolean;
  smtpConfigured: boolean;
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

// ─── Click Events (Stream & Realtime) ─────────────────────────────────────────

export interface ClickEventDto {
  id: number;
  urlId: number;
  shortUrlHash: string;
  originalUrl: string;
  timestamp: string;

  device?: string;
  browser?: string;
  os?: string;

  country?: string;
  city?: string;
  region?: string;
  continent?: string;
  latitude?: number | null;
  longitude?: number | null;

  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;

  referer?: string;
  ipAddress?: string;
}

export interface PaginatedEvents {
  content: ClickEventDto[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// ─── Admin Types ─────────────────────────────────────────────────────────────

export interface SystemHealth {
  redisStatus: string;
  redisMemory: string;
  sweeperStatus: string;
  lastSweeperRun: string;
  activeWorkerThreads: number;
}

export interface TopDomain {
  domain: string;
  count: number;
}

export interface AdminOverviewStats {
  totalLinks: number;
  activeLinks: number;
  expiredLinks: number;
  quarantinedLinks: number;
  totalClicks: number;
  clicksLast24Hours: number;
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  systemHealth: SystemHealth;
  topDomains: TopDomain[];
}

export interface AdminLink {
  id: number;
  shortUrl: string;
  fullShortUrl: string;
  longUrl: string;
  createdAt: string;
  expiresAt?: string | null;
  isActive: boolean;
  isQuarantined: boolean;
  quarantineReason?: string | null;
  isPasswordProtected: boolean;
  totalClicks: number;
  userEmail: string;
  username: string;
  userPublicId?: string | null;
}

export interface PaginatedAdminLinks {
  content: AdminLink[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface AdminLinkTriageSummary {
  needsAttentionCount: number;
  spikeCount: number;
  quarantinedCount: number;
  createdLast24hCount: number;
  totalLinks: number;
}

export interface AdminUser {
  id: number;
  publicId: string;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'ROOT';
  emailVerified: boolean;
  isSuspended: boolean;
  suspendedReason?: string | null;
  linkCount: number;
  totalClicks: number;
  createdAt: string;
}

export interface PaginatedAdminUsers {
  content: AdminUser[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface BlacklistedDomainItem {
  id: number;
  domainPattern: string;
  reason?: string | null;
  createdAt: string;
}

export interface SystemSettingItem {
  settingKey: string;
  settingValue: string;
  description?: string | null;
  updatedAt?: string | null;
}

export interface SecurityIncident {
  id: number;
  incidentType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  targetUrl?: string;
  shortUrl?: string;
  clientIp?: string;
  userEmail?: string;
  details?: string;
  isResolved: boolean;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

export interface PaginatedIncidents {
  content: SecurityIncident[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface BlockedIpItem {
  id: number;
  ipAddress: string;
  reason?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface ThreatScanResult {
  safe: boolean;
  riskScore: number;
  threatType: string;
  detectedThreats: string[];
  engine: string;
  scanDurationMs: number;
}

export interface AdminAuditLogItem {
  id: number;
  actorId?: number | null;
  actorEmail: string;
  actorRole: string;
  actorIp?: string | null;
  action: string;
  targetType: string;
  targetIdentifier?: string | null;
  details?: string | null;
  metadataJson?: string | null;
  prevHash: string;
  entryHash: string;
  createdAt: string;
}

export interface PaginatedAuditLogs {
  content: AdminAuditLogItem[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface AuditChainVerification {
  valid: boolean;
  totalVerified: number;
  genesisHash: string;
  latestHash: string;
  tamperedEntryId?: number | null;
  failureReason?: string | null;
  verifiedAt: string;
}

export interface EnvironmentVaultItem {
  key: string;
  category: 'SYSTEM' | 'DATABASE' | 'ROUTING' | 'SECURITY' | 'MAIL' | 'OAUTH' | 'CONFIG';
  value: string;
  isSecret: boolean;
  source: 'ENV' | 'DYNAMIC_OVERRIDE' | 'ENV_AND_OVERRIDE';
  description?: string | null;
}

export interface SmtpTestResult {
  success: boolean;
  latencyMs: number;
  host: string;
  port: number;
  fromEmail?: string | null;
  message: string;
}



