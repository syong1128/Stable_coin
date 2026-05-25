require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const NODIT_API_KEY = process.env.NODIT_API_KEY || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    giwaSepolia: {
      // Nodit Node API URL 방식입니다.
      // 예: https://giwa-sepolia.nodit.io/실제API키
      url: NODIT_API_KEY
        ? `https://giwa-sepolia.nodit.io/${NODIT_API_KEY}`
        : "https://sepolia-rpc.giwa.io",
      chainId: 91342,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
    }
  }
};
