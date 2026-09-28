# Build the Spring Boot jar. The compiled Angular app is committed under
# src/main/resources/static/, so the jar serves the UI from classpath:/static/.
#
# Build context = the backend/ directory (this file's directory). In Render:
# Root Directory = backend, Dockerfile Path = ./Dockerfile.

# ---- Build stage ----
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY . .
RUN mvn -B clean package -DskipTests

# ---- Run stage ----
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar"]
