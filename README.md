# URL Shortener

  ![Spring](https://img.shields.io/badge/spring-%236DB33F.svg?style=for-the-badge&logo=spring&logoColor=white)
  ![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
  ![MySQL](https://img.shields.io/badge/mysql-4479A1.svg?style=for-the-badge&logo=mysql&logoColor=white)
  ![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)
  ![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

  <strong>URL shortener with advanced analytics, built with Spring Boot and React.</strong>

## Table of Contents
- [URL Shortener](#url-shortener)
  - [Table of Contents](#table-of-contents)
  - [Key Features](#key-features)
  - [Setup](#setup)
    - [Prerequisites](#prerequisites)
  - [Docker](#docker)
  - [Configuration](#configuration)
  - [Architecture Overview](#architecture-overview)

## Key Features
- Redis caching for extremely low-latency redirects.
- Async Geo/Device tracking leveraging Yauaa for background user-agent parsing without blocking HTTP redirects.
- JWT Auth for stateless security and protected dashboards.

## Setup
### Prerequisites
- Docker
- Docker Compose

## Docker
To spin up the entire application stack, run the following command from the project root:
```bash
docker compose up -d --build
```
This command builds the backend and frontend containers, starts MySQL and Redis, and connects them through Docker networks. The API will be exposed on port `8080`, and the Frontend on port `80`.

## Configuration
Before running the application, copy `.env.example` to `.env` and provide your secure values.

| Variable | Description | Default | Example |
| :--- | :--- | :--- | :--- |
| `MYSQL_ROOT_PASSWORD` | Root password for MySQL container | `root` | `my_secure_root_pwd` |
| `MYSQL_DATABASE` | Name of the database to create on boot | `url_shortener` | `url_shortener` |
| `SPRING_DATASOURCE_USERNAME` | Username the backend uses to connect | `root` | `db_user` |
| `SPRING_DATASOURCE_PASSWORD` | Password the backend uses to connect | `root` | `db_password` |
| `JWT_SECRET` | Secret key used to sign and verify JWTs | - | `your_secret_key_256_bits` |
| `ROOT_USER_EMAIL` | Email for the initial ROOT system admin | `admin@example.com` | `admin@example.com` |
| `ROOT_USER_PASSWORD`| Password for the initial ROOT system admin| `root` | `secure_admin_password` |
| `REDIS_HOST` | Hostname of the Redis server | `redis` | `redis` |
| `REDIS_PORT` | Port of the Redis server | `6379` | `6379` |

## Architecture Overview
The application uses Docker Compose to enforce robust container network isolation. It implements a two-tier network architecture:
- `db_network`: A backend-only bridged network securing communication between the Spring Boot application, MySQL, and Redis. The databases are isolated and do not expose ports directly to the host machine.
- `web_network`: A frontend-to-backend bridged network that strictly manages traffic between the Vite/Nginx frontend and the Spring Boot backend.

## Used Technology
- Backend: Spring Boot, Spring Security, Spring Data JPA, Flyway, Redis, JWT.
- Frontend: React, TypeScript, Vite, Tailwind CSS, Axios.
- Database and infrastructure: MySQL, Docker, Docker Compose, Nginx.

## Project Structure
```text
URL-Shortener/
├── backend/
│   ├── src/
│   │   ├── main/
│   │   └── test/
│   ├── pom.xml
│   └── Dockerfile
├── frontend/
│   ├── src/
│   ├── public/
│   └── Dockerfile
├── docker-compose.yml
├── README.md
└── LICENSE
```

This is the top-level layout of the project. The backend contains the Spring Boot API and database migrations, while the frontend contains the React app and UI assets.

## Licence
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for the full text.
