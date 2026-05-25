const hre = require("hardhat");

async function main() {
  const [deployer, merchantFallback] = await hre.ethers.getSigners();

  const merchant = process.env.MERCHANT_ADDRESS || merchantFallback.address;
  const feeRate = 100; // 1%

  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  console.log("Merchant:", merchant);

  const StableCoin = await hre.ethers.getContractFactory("MyKRWStableCoin");
  const stableCoin = await StableCoin.deploy(deployer.address);
  await stableCoin.waitForDeployment();

  const stableCoinAddress = await stableCoin.getAddress();
  console.log("MyKRWStableCoin:", stableCoinAddress);

  const Payment = await hre.ethers.getContractFactory("StableCafePayment");
  const payment = await Payment.deploy(deployer.address, merchant, feeRate);
  await payment.waitForDeployment();

  const paymentAddress = await payment.getAddress();
  console.log("StableCafePayment:", paymentAddress);

  const mintLimit = hre.ethers.parseUnits("1000000", 6);
  const initialMint = hre.ethers.parseUnits("10000", 6);

  await (await stableCoin.configureMinter(deployer.address, mintLimit)).wait();
  await (await stableCoin.mint(deployer.address, initialMint)).wait();
  await (await payment.addWhitelistedToken(stableCoinAddress)).wait();

  console.log("Initial mint to deployer:", hre.ethers.formatUnits(initialMint, 6), "mKRW");
  console.log("Token whitelisted in payment contract.");

  console.log("\n.env 또는 frontend/app.js에 아래 주소를 넣으세요.");
  console.log(`STABLECOIN_ADDRESS=${stableCoinAddress}`);
  console.log(`PAYMENT_ADDRESS=${paymentAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
