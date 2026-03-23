require("dotenv").config();
const { ethers } = require("ethers");

const INFURA_API_KEY = process.env.INFURA_API_KEY;

if (!INFURA_API_KEY) {
  console.error("INFURA_API_KEY가 .env 파일에 없습니다.");
  process.exit(1);
}

async function main() {
  try {
    const provider = new ethers.JsonRpcProvider(
      `https://mainnet.infura.io/v3/${INFURA_API_KEY}`
    );

    const latestBlockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(latestBlockNumber);

    console.log("=== ethers.js Version ===");
    console.log("Latest Block Number:", latestBlockNumber);
    console.log("Transaction Count:", block.transactions.length);
  } catch (error) {
    console.error("에러:", error.message);
  }
}

main();
