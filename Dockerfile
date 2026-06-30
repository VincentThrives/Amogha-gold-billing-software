# Multi-stage build: Angular frontend → bundled into the Spring Boot jar → run on a JRE.

# 1) Build the Angular app
FROM node:20-alpine AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2) Build the Spring Boot jar (with the Angular dist baked into static resources)
FROM maven:3.9-eclipse-temurin-21 AS api
WORKDIR /app
COPY backend/pom.xml ./
RUN mvn -B -ntp dependency:go-offline
COPY backend/ ./
# place the built frontend where Spring serves static content from the classpath
COPY --from=web /web/dist/amogha-billing/browser/ ./src/main/resources/static/
RUN mvn -B -ntp -DskipTests clean package

# 3) Runtime
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=api /app/target/amogha-billing.jar ./app.jar
ENV STATIC_DIR=classpath:/static
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
