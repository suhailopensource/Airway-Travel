#!/bin/bash

echo "🚀 Setting up Airway Management System..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=airway_user
DB_PASSWORD=airway_password
DB_DATABASE=airway_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# OpenSearch
OPENSEARCH_NODE=http://localhost:9200

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=24h

# Application
PORT=3000
NODE_ENV=development
EOF
    echo "✅ .env file created!"
else
    echo "✅ .env file already exists"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed!"
else
    echo "✅ Dependencies already installed"
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

echo ""
echo "🐳 Starting Docker containers..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy (this may take 30-60 seconds)..."
sleep 10

# Wait for PostgreSQL
echo "Waiting for PostgreSQL..."
until docker-compose exec -T postgres pg_isready -U airway_user > /dev/null 2>&1; do
    sleep 2
done
echo "✅ PostgreSQL is ready!"

# Wait for Redis
echo "Waiting for Redis..."
until docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; do
    sleep 2
done
echo "✅ Redis is ready!"

# Wait for OpenSearch
echo "Waiting for OpenSearch..."
until curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1; do
    sleep 3
done
echo "✅ OpenSearch is ready!"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start the application: npm run start:dev"
echo "2. Access Swagger docs: http://localhost:3000/api"
echo "3. Test with Postman using the examples in SETUP.md"
echo ""
echo "To stop Docker containers: docker-compose down"
echo "To view logs: docker-compose logs -f"

