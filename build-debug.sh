#!/bin/bash
echo "=== Starting Build Process ==="
echo "Current directory: $(pwd)"
echo "Listing files:"
ls -la
echo "=== Maven Build ==="
mvn clean package -DskipTests
echo "=== Checking Target Directory ==="
ls -la target/
echo "=== JAR Files ==="
find target/ -name "*.jar" -type f
echo "=== Build Complete ==="