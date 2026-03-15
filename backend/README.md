# Backend API - URL Shortener

## Key Features
- Hibernate/Flyway for database entity management and migrations.
- Async Click Tracking ensuring immediate HTTP 302 redirects without blocking for analytics collection.
- Redis Cache Eviction strategy for aggressive invalidation on URL update or deletion.
- Yauaa User-Agent parsing for robust and granular device, browser, and OS analytics.

## Setup
### Prerequisites
- Java 21
- Maven
- Local instances of MySQL and Redis.

### Steps to Run Locally
1. Ensure your local MySQL server is running and a database named `url_shortener` is created.
2. Ensure your local Redis server is running on port `6379`.
3. Set the required configuration environment variables (see Configuration section below) in your IDE or shell.
4. Execute the following command from the `backend` directory to start the application:
```bash
./mvnw spring-boot:run
```
The API will be available at `http://localhost:8080`.

## Configuration
The following environment variables are required to run the application locally using the `dev` profile (found in `src/main/resources/application-dev.yaml`).

| Variable | Description | Example |
| :--- | :--- | :--- |
| `SPRING_DATASOURCE_URL` | JDBC URL for MySQL connection | `jdbc:mysql://localhost:3306/url_shortener` |
| `SPRING_DATASOURCE_USERNAME` | Database username | `root` |
| `SPRING_DATASOURCE_PASSWORD` | Database password | `root` |
| `REDIS_HOST` | Redis hostname | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | 256-bit secure secret for signing JWTs | `your_secret_key` |

## API

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | No | Authenticate with email/password to retrieve a JWT token. |
| `GET` | `/auth/me` | Yes | Retrieve the currently authenticated user's profile. |
| `POST` | `/shorten` | Yes | Generate a new short URL from a provided long URL. |
| `GET` | `/{hash}` | No | Redirect to the destination `longUrl` and asynchronously track the click. |
| `GET` | `/url/{hash}` | Yes* | Retrieve the details and live click counts of a specific short URL. |
| `PUT` | `/url/{hash}` | Yes* | Update the destination `longUrl` of an existing short URL and evict the cache. |
| `DELETE` | `/url/{hash}` | Yes* | Delete a short URL and evict it from the cache. |
| `GET` | `/url/all` | Yes (ROOT) | Retrieve the global list of all URLs in the system. |
| `GET` | `/analytics/{hash}` | Yes* | Retrieve detailed 30-day time-series and categorical click analytics. |

*\* Requires the user to own the URL or possess the `ROOT` admin role.*