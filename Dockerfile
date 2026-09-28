# Multi-stage build: compile the Angular frontend, bake it into the Spring Boot
# jar's static resources (classpath:/static), and run the jar. The API serves the
# built SPA from the same origin.
#
# IMPORTANT: the Docker build context must be the repository root (this directory),
# so that both `frontend/` and `backend/` are visible to the COPY steps below.
# In Render: Root Directory = (blank / repo root), Dockerfile Path = Dockerfile.

# ---- Stage 1: build the Angular frontend ----
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build          # production build -> dist/amogha-billing/browser

# ---- Stage 2: build the Spring Boot jar with the frontend baked in ----
FROM maven:3.9.9-eclipse-temurin-21 AS backend
WORKDIR /app
COPY backend/ ./
# Bake the compiled SPA into the jar's static resources (served from classpath:/static/).
COPY --from=frontend /app/frontend/dist/amogha-billing/browser/ src/main/resources/static/
RUN mvn -B clean package -DskipTests

# ---- Stage 3: runtime ----
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=backend /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar"]
