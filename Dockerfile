# Build the Spring Boot jar. The compiled Angular app is committed under
# backend/src/main/resources/static/, so the jar serves the UI from
# classpath:/static/ — no separate frontend build step is needed here.
#
# Build context = repository root (this directory). In Render: Root Directory
# blank (repo root), Dockerfile Path = Dockerfile.

# ---- Build stage ----
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY backend/ ./
RUN mvn -B clean package -DskipTests

# ---- Run stage ----
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
# On small containers (e.g. Render free tier, 512 MB) the JVM's default max heap
# is only ~25% of RAM, which OOMs once real data is loaded. Use more of the
# container's memory for the heap. MaxRAMPercentage adapts to the instance size.
ENTRYPOINT ["java","-XX:MaxRAMPercentage=70.0","-jar","app.jar"]
