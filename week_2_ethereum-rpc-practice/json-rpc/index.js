require("dotenv").config();
const https = require("https");

const INFURA_API_KEY = process.env.INFURA_API_KEY;

if (!INFURA_API_KEY) {
  console.error("INFURA_API_KEY가 .env 파일에 없습니다.");
  process.exit(1);
}

function infuraRPC(method, params) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      id: 1,
    });

    const options = {
      hostname: "mainnet.infura.io",
      path: `/v3/${INFURA_API_KEY}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let body = "";

      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        try {
          const json = JSON.parse(body);

          if (json.error) {
            reject(new Error(json.error.message));
            return;
          }

          resolve(json.result);
        } catch (error) {
          reject(new Error("응답 JSON 파싱 실패"));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function main() {
  try {
    const latestBlockHex = await infuraRPC("eth_blockNumber", []);
    const latestBlockNumber = parseInt(latestBlockHex, 16);

    const block = await infuraRPC("eth_getBlockByNumber", [latestBlockHex, false]);
    const transactionCount = block.transactions.length;

    console.log("=== JSON-RPC Version ===");
    console.log("Latest Block Number:", latestBlockNumber);
    console.log("Transaction Count:", transactionCount);
  } catch (error) {
    console.error("에러:", error.message);
  }
}

main();
