# --- Stage 1: Build the Application ---
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Copy Maven wrapper files
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .

# FIX: Grant execution permissions to the wrapper script
RUN chmod +x mvnw

# Download dependencies in advance to leverage Docker caching
RUN ./mvnw dependency:go-offline -B

# Copy source code and build the executable JAR file
COPY src ./src
RUN ./mvnw clean package -DskipTests

# --- Stage 2: Production Runtime ---
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]