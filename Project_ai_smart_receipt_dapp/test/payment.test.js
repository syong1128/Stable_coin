const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GIWA Stablecoin Payment DApp", function () {
  it("mints stablecoin and pays through approve + pay", async function () {
    const [owner, merchant, customer] = await ethers.getSigners();

    const StableCoin = await ethers.getContractFactory("MyKRWStableCoin");
    const token = await StableCoin.deploy(owner.address);
    await token.waitForDeployment();

    const Payment = await ethers.getContractFactory("StableCafePayment");
    const payment = await Payment.deploy(owner.address, merchant.address, 100);
    await payment.waitForDeployment();

    const tokenAddress = await token.getAddress();
    const paymentAddress = await payment.getAddress();

    await token.configureMinter(owner.address, ethers.parseUnits("1000000", 6));
    await token.mint(customer.address, ethers.parseUnits("1000", 6));
    await payment.addWhitelistedToken(tokenAddress);

    const amount = ethers.parseUnits("100", 6);

    await token.connect(customer).approve(paymentAddress, amount);
    await payment.connect(customer).pay(tokenAddress, amount);

    expect(await token.balanceOf(merchant.address)).to.equal(ethers.parseUnits("99", 6));
    expect(await token.balanceOf(paymentAddress)).to.equal(ethers.parseUnits("1", 6));
  });
});
