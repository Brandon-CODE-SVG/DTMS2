FROM maven:3.9.4-eclipse-temurin-17-alpine AS build
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests

EXPOSE 8080

CMD ["java", "-jar", "/app/target/DTMS2-0.0.1-SNAPSHOT.jar", "--spring.profiles.active=prod"]