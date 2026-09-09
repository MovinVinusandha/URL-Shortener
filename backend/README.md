# Backend API - trim

Enterprise-grade Spring Boot 3 REST API powering URL redirection, analytics processing, user management, and organization hierarchies.

## Key Features

- **UTC Everywhere Timezone Standard**: Global UTC timezone enforcement at the JVM level (`TimeZone.setDefault("UTC")`) with ISO-8601 UTC timestamp serialization (`yyyy-MM-dd'T'HH:mm:ss.SSSX`) across all database entities, DTOs, and API responses.
- **Scheduled Expiration Sweeper**: Automated background worker (`@Scheduled(fixedRate = 60000)`) that queries active URLs past their `expiresAt` threshold, deactivates them (`isActive = false`), and evicts stale cache keys from Redis.
- **Transactional Account Hard-Delete**: Comprehensive `@Transactional` cascade process that completely purges click events, short URLs, tag associations, custom tags, folders, and user credentials upon account deletion.
- **Asynchronous Click Analytics**: Non-blocking click processing leveraging Spring thread pools and the Yauaa library for background User-Agent parsing (device, operating system, browser) and IP geo-location logging without delaying HTTP 302 redirects.
- **Redis Caching & Invalidation**: High-speed Redis cache layer for short URL resolution with aggressive cache eviction upon URL updates, password modifications, expiration, or deletion.
- **Flyway Database Migrations**: Version-controlled SQL migration scripts managing schema evolution and relational constraints across 12 migrations (V1 to V12).
- **Stateless JWT Security**: Dual-token architecture issuing short-lived access tokens (5 minutes) and securing long-lived refresh tokens (7 days) in HTTP-only, Secure cookies.
- **Interactive OpenAPI / Swagger Documentation**: Built-in interactive API documentation via SpringDoc OpenAPI (`/swagger-ui/index.html`).

## Setup

### Prerequisites
- Java 21 (JDK)
- Maven 3.8+
- MySQL 8.0+
- Redis 7.0+

### Steps to Run Locally
1. Ensure MySQL and Redis services are running locally.
2. Create the target database in MySQL:
```sql
CREATE DATABASE url_shortener;
```
3. Configure environment variables in `.env` or your shell environment (refer to the Configuration section).
4. Run the application using the Maven wrapper:
```bash
./mvnw spring-boot:run
```
The API server will initialize on `http://localhost:8080`.

## Configuration

The following environment variables configure the backend across development and production profiles:

| Variable | Description | Default | Example |
| :--- | :--- | :--- | :--- |
| `APP_SELF_HOSTED` | Enable self-hosted single-admin mode (skips DNS MX validation) | `false` | `true` |
| `ALLOW_REGISTRATION` | Permit public visitor registration on the instance | `true` | `false` |
| `REQUIRE_EMAIL_VERIFICATION` | Enforce email verification token before allowing login | `true` | `false` |
| `SPRING_DATASOURCE_URL` | JDBC connection URL for MySQL | `jdbc:mysql://localhost:3306/url_shortener` | `jdbc:mysql://localhost:3306/url_shortener` |
| `SPRING_DATASOURCE_USERNAME` | MySQL database username | `root` | `root` |
| `SPRING_DATASOURCE_PASSWORD` | MySQL database password | `root` | `secure_db_password` |
| `REDIS_HOST` | Hostname of the Redis cache instance | `localhost` | `localhost` |
| `REDIS_PORT` | Port of the Redis cache instance | `6379` | `6379` |
| `JWT_SECRET` | 256-bit secret key for HMAC-SHA token signing | - | `your_256_bit_secret_key_here` |
| `ROOT_USER_EMAIL` | Initial ROOT administrator account email | `admin@example.com` | `admin@trim.com` |
| `ROOT_USER_PASSWORD` | Initial ROOT administrator account password | `root` | `secure_admin_password` |
| `ROOT_DOMAIN_URL` | Base URL used to assemble full short link URLs | `http://localhost:8080` | `https://trim.com` |
| `APP_DOMAIN_URL` | Allowed origins for Spring Security CORS headers | `http://localhost:5173,http://localhost` | `https://app.trim.com` |
| `APP_DASHBOARD_URL` | Frontend URL for password unlock and expired link prompts | `http://app.localhost` | `https://app.trim.com` |
| `FRONTEND_URL` | General frontend application root URL | `http://localhost` | `https://trim.com` |
| `SPRING_MAIL_HOST` | SMTP server host (leave empty for console fallback) | - | `smtp.gmail.com` |
| `OAUTH_GOOGLE_CLIENT_ID` | Google OAuth client ID (leave empty if unconfigured) | - | `google-client-id` |
| `OAUTH_GITHUB_CLIENT_ID` | GitHub OAuth client ID (leave empty if unconfigured) | - | `github-client-id` |

## API Endpoints

### System & Documentation

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` / `/api/health` | No | System health status and application version check. |
| `GET` | `/swagger-ui/index.html` | No | Interactive Swagger UI API documentation. |
| `GET` | `/v3/api-docs` | No | OpenAPI 3.0 specification JSON schema. |

### Authentication

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/auth/config` | No | Retrieve public instance authentication capabilities (registration status, OAuth providers, SMTP readiness). |
| `POST` | `/auth/login` | No | Authenticate credentials and receive an Access Token and Refresh Token cookie. |
| `POST` | `/auth/refresh` | Cookie | Issue a new Access Token using the valid `refreshToken` cookie. |
| `GET` | `/auth/me` | Yes | Retrieve the profile details of the currently authenticated user. |

### URLs & Redirection

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/shorten` | Yes | Create a new short URL with optional alias, password, expiration, folder, and tags. |
| `GET` | `/{hash}` | No | Resolve short link, enforce expiration/password checks, and redirect with HTTP 302. |
| `POST` | `/unlock/{hash}` | No | Validate password for a protected link and return the destination URL. |
| `GET` | `/url/{hash}` | Yes* | Retrieve metadata and live click counts for a specific short URL. |
| `PUT` | `/url/{hash}` | Yes* | Update destination URL, alias, expiration, folder, or tags and evict cache. |
| `DELETE` | `/url/{hash}` | Yes* | Delete short URL and evict its cached entry from Redis. |
| `GET` | `/url/{hash}/qr` | Yes* | Generate and return a PNG QR code image for a specific short link. |
| `GET` | `/url/all` | Yes (ROOT) | Retrieve the global list of all URLs across all system users. |
| `GET` | `/public/qr/preview` | No | Generate a live preview PNG QR code image for an arbitrary URL string. |

### Analytics

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/analytics/{hash}` | Yes* | Retrieve 30-day time-series, browser, device, OS, and geographic stats for a URL. |
| `GET` | `/analytics` | Yes | Retrieve aggregated analytics across all URLs owned by the authenticated user. |
| `GET` | `/analytics/folder/{folderId}` | Yes | Retrieve aggregated analytics for all URLs grouped within a specific folder. |
| `GET` | `/analytics/usage` | Yes | Retrieve account-wide usage summary (total links, active links, total clicks). |

### Folders

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/folders` | Yes | Retrieve all folders owned by the authenticated user with link counts. |
| `POST` | `/folders` | Yes | Create a new organizational folder. |
| `PUT` | `/folders/{id}` | Yes | Update the name of an existing folder. |
| `DELETE` | `/folders/{id}` | Yes | Delete a folder and remove folder associations from containing links. |

### Tags

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/tags` | Yes | Retrieve all tags created by the authenticated user. |
| `POST` | `/tags` | Yes | Create a new custom colored tag. |
| `PUT` | `/tags/{id}` | Yes | Update tag name or color code. |
| `DELETE` | `/tags/{id}` | Yes | Delete a tag and remove its associations across all assigned links. |

### User Account & Profile

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `PUT` | `/users/me` | Yes | Update authenticated user profile information (name, email). |
| `PUT` | `/users/me/password` | Yes | Change authenticated user password after verifying current password. |
| `DELETE` | `/users/me` | Yes | Transactionally hard-delete user account and all associated URLs and analytics. |
| `POST` | `/user` | No / Admin | Register a standard user account. |
| `GET` | `/user/all` | Yes (ROOT) | Retrieve a paginated list of all registered users. |
| `PUT` | `/user/{publicId}` | Yes (ROOT/Owner) | Update user profile by public UUID. |
| `DELETE` | `/user/{publicId}` | Yes (ROOT) | Delete user account by public UUID. |
| `POST` | `/admin/addNew` | Yes (ROOT) | Provision a new administrative user account. |

*\* Requires ownership of the resource or ROOT administrator role.*

## Testing

Execute unit and integration tests:
```bash
./mvnw test
```