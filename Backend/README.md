# URL Shortener 🔗

A RESTful URL shortener service built with Spring Boot that converts long URLs into short, manageable links.

## Features

- **URL Shortening**: Generate short URLs using CRC32 hash algorithm
- **URL Redirection**: Redirect short URLs to original destinations
- **Analytics Tracking**: Track access count for each shortened URL
- **CRUD Operations**: Create, read, update, and delete shortened URLs

## Tech Stack

- **Framework**: Spring Boot 3.5.6
- **Language**: Java 25
- **Database**: MySQL
- **ORM**: Spring Data JPA / Hibernate

## API Endpoints

### Shorten URL
```http
POST /shorten
{
    "longUrl": "https://example.com/very-long-url"
}
```

### Redirect to Original URL
```http
GET /{shortUrl}
```
Returns HTTP 302 redirect to the original URL.


### Get URL Details
```http
GET /url/{hash}
```

### Update URL
```http
PUT /url/{hash}
{
    "longUrl": "https://updated-url.com"
}
```

### Delete URL
```http
DELETE /url/{hash}
```

## Prerequisites

Before running this application, ensure you have:

- Java 25 or higher
- Maven 3.6 or higher
- MySQL 8.0 or higher

## Setup and Installation

### 1. Clone the Repository
```bash
git clone https://github.com/MovinVinusandha/URL-Shortener.git
cd URL-Shortener
```

### 2. Database Setup
Create a MySQL database:
```sql
CREATE DATABASE url_shortener;
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
DB_URL=jdbc:mysql://localhost:3306/url_shortener?createDatabaseIfNotExist=true
DB_USERNAME=your_mysql_username
DB_PASSWORD=your_mysql_password
```

### 4. Run Database Migrations
```bash
mvn flyway:migrate
```

### 5. Build the Application
```bash
mvn clean compile
```

### 6. Run the Application
```bash
mvn spring-boot:run
```

The application will start on `http://localhost:8080`

## Usage Examples

### Shorten a URL
```bash
curl -X POST http://localhost:8080/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://www.example.com/very-long-url-that-needs-shortening"}'
```

Response:
```json
{
    "shortUrl": "http://localhost:8080/A1B2C3D4",
    "longUrl": "https://www.example.com/very-long-url-that-needs-shortening"
}
```

### Access the Short URL
Visit `http://localhost:8080/A1B2C3D4` in your browser to be redirected to the original URL.

### Get URL Statistics
```bash
curl http://localhost:8080/url/A1B2C3D4
```

Response:
```json
{
    "id": 1,
    "longUrl": "https://www.example.com/very-long-url-that-needs-shortening",
    "shortUrl": "http://localhost:8080/A1B2C3D4",
    "accessed_times": 5,
    "createdAt": "2025-09-30 16:48:08",
    "updatedAt": "2025-09-30 16:48:08"
}
```

## Configuration

### Application Properties
The application uses environment variables for configuration:

- `DB_URL`: Database connection URL
- `DB_USERNAME`: Database username
- `DB_PASSWORD`: Database password

### Flyway Configuration
Database migrations are automatically applied on startup. Manual migration:
```bash
mvn flyway:migrate
```

## Project Structure
```
src/
├── main/
│   ├── java/com/url_shortener/url_shortener/
│   │   ├── controller/         # REST controllers
│   │   ├── dtos/               # Data Transfer Objects
│   │   ├── entities/           # JPA entities
│   │   ├── exception/          # Custom exceptions
│   │   ├── mappers/            # MapStruct mappers
│   │   ├── repositories/       # Spring Data repositories
│   │   └── services/           # Business logic
│   └── resources/
│       ├── db/migration/       # Flyway migration scripts
│       └── application.yaml    # Application configuration
└── test/                       # Test classes
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

- **Developer**: MovinVinusandha
- **Repository**: [URL-Shortener](https://github.com/MovinVinusandha/URL-Shortener)