# Ethereum RPC Practice

This project compares two ways of retrieving Ethereum blockchain data through Infura:

1. Raw JSON-RPC
2. ethers.js

Both programs fetch:
- the latest Ethereum block number
- the transaction count in that latest block

## Project Structure

```bash
ethereum-rpc-practice/
├── json-rpc/
│   └── index.js
├── ethers/
│   └── index.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Install Dependencies

```bash
npm install
```

## Setup .env File

Create a `.env` file in the project root and add your Infura API key:

```env
INFURA_API_KEY=your_real_infura_api_key
```

## Run the JSON-RPC Version

```bash
npm run json-rpc
```

## Run the ethers.js Version

```bash
npm run ethers
```

## Notes

- Do not upload your real `.env` file to GitHub.
- Only upload `.env.example`.
