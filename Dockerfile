FROM maven:3.9-eclipse-temurin-17-alpine AS build

WORKDIR /app

COPY . .

RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY --from=build /app/target/DTMS2-0.0.1-SNAPSHOT.jar app.jar

# List contents to verify files are included
RUN jar tf app.jar | grep application.properties

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]