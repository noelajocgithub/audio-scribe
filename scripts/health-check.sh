#!/bin/bash

echo "🏥 Audio Scribe Health Check"
echo "============================"
echo ""

# Check Docker Compose is running
if ! docker-compose ps &> /dev/null; then
    echo "❌ Docker Compose services are not running"
    exit 1
fi

echo "Checking service health..."
echo ""

# Check PostgreSQL
echo -n "🐘 PostgreSQL: "
if docker-compose exec -T postgres pg_isready -U postgres &> /dev/null; then
    echo "✅ Healthy"
else
    echo "❌ Unhealthy"
fi

# Check Redis
echo -n "📮 Redis: "
if docker-compose exec -T redis redis-cli ping &> /dev/null; then
    echo "✅ Healthy"
else
    echo "❌ Unhealthy"
fi

# Check MinIO
echo -n "🪣 MinIO: "
if curl -sf http://localhost:9000/minio/health/live &> /dev/null; then
    echo "✅ Healthy"
else
    echo "❌ Unhealthy"
fi

# Check API
echo -n "🔌 API: "
if curl -sf http://localhost:8000/api/health &> /dev/null; then
    echo "✅ Healthy"
else
    echo "❌ Unhealthy"
fi

# Check Frontend
echo -n "📱 Frontend: "
if curl -sf http://localhost:3000 &> /dev/null; then
    echo "✅ Healthy"
else
    echo "❌ Unhealthy"
fi

echo ""
echo "Container Status:"
docker-compose ps

echo ""
echo "Log tail (last 5 lines from each service):"
echo ""
docker-compose logs --tail=5
