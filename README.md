# 🎮 Gomoku Game

A classic Gomoku (Five in a Row) game with MetaMask authentication, betting system, and multiplayer functionality. Built with NestJS backend and Next.js frontend.

## ✨ Features

- **MetaMask Authentication**: Secure wallet-based authentication using message signing
- **Betting System**: Players can bet tokens on games
- **Multiplayer**: Real-time gameplay between two players
- **Game Sharing**: Share game links with friends to join
- **Responsive UI**: Modern, mobile-friendly interface built with Tailwind CSS
- **Real-time Updates**: Live game state updates

## 🏗️ Architecture

- **Backend**: NestJS with TypeORM and SQLite
- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Database**: PostgreSQL with Docker support
- **Authentication**: JWT tokens with MetaMask signature verification
- **Real-time**: WebSocket support for live game updates

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- MetaMask browser extension
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gomoku-game
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Start development servers**
   ```bash
   npm run dev
   ```

This will start both backend (port 3001) and frontend (port 3000) servers.

### Manual Setup

If you prefer to run services separately:

**Backend:**
```bash
cd backend
npm install
npm run start:dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 🎯 How to Play

1. **Connect Wallet**: Click "Connect MetaMask" and sign the authentication message
2. **Create Game**: Set your bet amount and create a new game
3. **Share Link**: Copy the game link and share it with a friend
4. **Join Game**: Your friend can join using the link or browse waiting games
5. **Play**: Take turns placing stones on the 15x15 board
6. **Win**: First player to connect 5 stones in a row wins all the bet tokens!

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
JWT_SECRET=your-secret-key-here
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=gomoku
```

### Database

The application uses PostgreSQL with Docker. To get started:

1. **Start PostgreSQL**: `docker-compose up -d postgres`
2. **Update environment variables** in `backend/.env` if needed
3. **Install dependencies**: `npm run install:all`

The database will be automatically created and tables will be synchronized in development mode.

## 📁 Project Structure

```
gomoku-game/
├── backend/                 # NestJS backend
│   ├── src/
│   │   ├── auth/           # Authentication module
│   │   ├── game/           # Game logic module
│   │   ├── user/           # User management module
│   │   ├── config/         # Configuration files
│   │   └── main.ts         # Application entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/                # Next.js frontend
│   ├── app/                # App router pages
│   ├── components/         # React components
│   ├── package.json
│   └── tsconfig.json
├── package.json             # Root package.json
└── README.md
```

## 🛠️ Development

### Backend Development

- **Generate new module**: `nest generate module <name>`
- **Generate new controller**: `nest generate controller <name>`
- **Generate new service**: `nest generate service <name>`
- **Run tests**: `npm run test`
- **Build**: `npm run build`

### Frontend Development

- **Add new page**: Create file in `app/` directory
- **Add new component**: Create file in `components/` directory
- **Run linting**: `npm run lint`
- **Build**: `npm run build`

## 🔒 Security Features

- MetaMask signature verification
- JWT token authentication
- Input validation with class-validator
- SQL injection protection with TypeORM
- CORS configuration

## 🧪 Testing

```bash
# Backend tests
cd backend
npm run test

# Frontend tests (if configured)
cd frontend
npm run test
```

## 🚀 Deployment

### Backend Deployment

1. Build the application: `npm run build`
2. Set production environment variables
3. Use a process manager like PM2
4. Configure reverse proxy (Nginx/Apache)

### Frontend Deployment

1. Build the application: `npm run build`
2. Deploy to Vercel, Netlify, or any static hosting service
3. Update API endpoints for production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:

1. Check the console for error messages
2. Ensure MetaMask is installed and connected
3. Verify both backend and frontend are running
4. Check network connectivity and CORS settings

## 🔮 Future Enhancements

- [ ] Real-time WebSocket updates
- [ ] Tournament system
- [ ] Leaderboards
- [ ] Mobile app
- [ ] Blockchain integration for real tokens
- [ ] Spectator mode
- [ ] Game history and replays
