#!/bin/bash

echo "Setting up Gomoku Game Project..."
echo

echo "Starting PostgreSQL database..."
docker-compose up -d postgres
echo "Waiting for database to be ready..."
sleep 10

echo "Installing root dependencies..."
npm install

echo
echo "Installing backend dependencies..."
cd backend
npm install
cp env.example .env
echo "Backend dependencies installed!"

echo
echo "Installing frontend dependencies..."
cd ../frontend
npm install
echo "Frontend dependencies installed!"

echo
echo "Setup complete!"
echo
echo "To start the project:"
echo "1. Make sure MetaMask is installed in your browser"
echo "2. Run: npm run dev"
echo "3. Backend will run on http://localhost:3001"
echo "4. Frontend will run on http://localhost:3000"
echo
echo "Note: You may need to edit backend/.env file with your own JWT_SECRET"
