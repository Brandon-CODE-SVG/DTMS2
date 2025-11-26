FROM maven:3.9-eclipse-temurin-17-alpine AS build

WORKDIR /app

# Copy pom.xml first to cache dependencies
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .

# Download dependencies first (separate layer for caching)
RUN ./mvnw dependency:go-offline -B

# Copy source code
COPY src src

# Package the application
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY --from=build /app/target/DTMS2-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]