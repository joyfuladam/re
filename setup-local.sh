#!/bin/bash

echo "🚀 River & Ember - Local Setup Script"
echo "======================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo ""
    echo "Please install Node.js 18+ first:"
    echo "  macOS: brew install node"
    echo "  Or download from: https://nodejs.org/"
    echo ""
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current: $(node --version)"
    exit 1
fi

echo "✓ Node.js $(node --version) installed"
echo "✓ npm $(npm --version) installed"
echo ""

# Check Docker
if command -v docker &> /dev/null; then
    if docker info &> /dev/null; then
        echo "✓ Docker is running"
        
        # Check if database container exists
        if docker ps -a | grep -q river-ember-db; then
            echo "✓ Database container exists"
            if docker ps | grep -q river-ember-db; then
                echo "✓ Database container is running"
            else
                echo "⚠️  Starting database container..."
                docker start river-ember-db
                sleep 2
            fi
        else
            echo "📦 Creating database container..."
            docker run -d --name river-ember-db \
                -e POSTGRES_PASSWORD=password \
                -e POSTGRES_DB=river_ember \
                -p 5432:5432 \
                postgres:15
            echo "✓ Database container created and started"
            sleep 3
        fi
    else
        echo "⚠️  Docker is installed but not running"
        echo "   Please start Docker Desktop and run this script again"
        exit 1
    fi
else
    echo "⚠️  Docker not found - you'll need to set up PostgreSQL manually"
    echo "   Or install Docker: https://www.docker.com/products/docker-desktop"
fi

echo ""

# Check .env file
if [ ! -f .env ]; then
    echo "❌ .env file not found"
    echo "   Creating .env from template..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✓ .env file created (please update DATABASE_URL if needed)"
    else
        echo "   Please create .env file manually"
    fi
else
    echo "✓ .env file exists"
fi

echo ""

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies (this may take a few minutes)..."
    npm install
    echo "✓ Dependencies installed"
else
    echo "✓ Dependencies already installed"
fi

echo ""

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate
echo "✓ Prisma client generated"

echo ""

# Push database schema
echo "🗄️  Setting up database schema..."
npx prisma db push
echo "✓ Database schema created"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Start the development server: npm run dev"
echo "  2. Open http://localhost:3000 in your browser"
echo "  3. Register a new account"
echo ""
echo "Useful commands:"
echo "  npm run dev          - Start development server"
echo "  npm run db:studio    - Open database GUI"
echo "  docker start river-ember-db  - Start database (if stopped)"
echo "  docker stop river-ember-db   - Stop database"
echo ""

