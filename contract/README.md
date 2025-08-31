# Gomoku Smart Contracts

This directory contains the smart contracts for the Gomoku game ecosystem.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Add your configuration to `.env`:
   - Private key for deployment
   - RPC URLs for different networks
   - Etherscan API key for verification

## Available Scripts

- `npm run compile` - Compile smart contracts
- `npm run test` - Run tests
- `npm run test:coverage` - Run tests with coverage report
- `npm run node` - Start a local Hardhat node
- `npm run deploy:localhost` - Deploy to local network
- `npm run deploy:sepolia` - Deploy to Sepolia testnet
- `npm run clean` - Clean artifacts and cache
- `npm run verify` - Verify contracts on Etherscan

## Contracts

### GomokuToken.sol
- ERC20 token for the game ecosystem
- Symbol: GMKU
- Initial supply: 1,000,000 tokens
- Features: Mintable (by owner), Burnable

## Testing

Run the test suite:
```bash
npm test
```

Run with coverage:
```bash
npm run test:coverage
```

## Deployment

1. Start local node:
```bash
npm run node
```

2. Deploy to localhost:
```bash
npm run deploy:localhost
```

3. Deploy to Sepolia:
```bash
npm run deploy:sepolia
```

## Security

- Never commit your `.env` file
- Always audit contracts before mainnet deployment
- Use multi-sig wallets for production deployments
- Consider using a timelock for admin functions

## License

MIT