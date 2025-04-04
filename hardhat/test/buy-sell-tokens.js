const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("DajuToken", function () {
  let owner, user, manager, dajuToken, mockUSDC;

  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  const DAJU_CAP = ethers.parseEther("10000000");
  const USDC_RATE = ethers.parseEther("1.20");
  const TEST_USDC_AMOUNT = ethers.parseUnits("120", 6);

  async function deployContractsFixture() {
    [owner, user, manager] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();

    const DajuToken = await ethers.getContractFactory("DajuToken");
    dajuToken = await DajuToken.deploy(owner.address, DAJU_CAP);
    await dajuToken.waitForDeployment();

    await mockUSDC.transfer(user.address, ethers.parseUnits("1000", 6));

    return { owner, user, manager, dajuToken, mockUSDC };
  }

  before(async function () {
    ({ owner, user, manager, dajuToken, mockUSDC } = await loadFixture(deployContractsFixture));
  });

  describe("Deployment", function () {
    it("should set correct name and symbol", async function () {
      expect(await dajuToken.name()).to.equal("DajuToken");
      expect(await dajuToken.symbol()).to.equal("DAJU");
    });

    it("should mint initial supply to owner", async function () {
      const balance = await dajuToken.balanceOf(owner.address);
      expect(balance).to.equal(INITIAL_SUPPLY);
    });

    it("should set the correct cap", async function () {
      expect(await dajuToken.CAP()).to.equal(DAJU_CAP);
    });
  });

  describe("Token Management", function () {
    it("should allow minting by MINTER_ROLE", async function () {
      const amount = ethers.parseEther("1000");
      await dajuToken.connect(owner).mint(user.address, amount);
      expect(await dajuToken.balanceOf(user.address)).to.equal(amount);
    });

    it("should not allow minting beyond cap", async function () {
      const remaining = DAJU_CAP - await dajuToken.totalSupply();
      const excess = remaining + 1n;
      await expect(dajuToken.connect(owner).mint(user.address, excess)).to.be.revertedWith("Cap exceeded");
    });

    it("should allow burning tokens", async function () {
      const amount = ethers.parseEther("100");
      const before = await dajuToken.balanceOf(owner.address);
      await dajuToken.connect(owner).burn(amount);
      expect(await dajuToken.balanceOf(owner.address)).to.equal(before - amount);
    });
  });

 describe("DajuToken Exchange", function () {
  let owner, user, dajuToken, mockUSDC;
  const USDC_AMOUNT = ethers.parseUnits("120", 6);
  const EXPECTED_DAJU = ethers.parseEther("100");

  before(async function () {
    [owner, user] = await ethers.getSigners();
    
    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();

    // Deploy DajuToken
    const DajuToken = await ethers.getContractFactory("DajuToken");
    dajuToken = await DajuToken.deploy(owner.address, ethers.parseEther("10000000"));
    await dajuToken.waitForDeployment();

    
    await mockUSDC.transfer(user.address, ethers.parseUnits("1000", 6));
    await dajuToken.transfer(await dajuToken.getAddress(), ethers.parseEther("1000"));
    await mockUSDC.transfer(await dajuToken.getAddress(), ethers.parseUnits("1000", 6));
    
    await dajuToken.connect(owner).setTokenAddress("USDC", await mockUSDC.getAddress());
  });

  describe("Buy Operation", function () {
    it("should execute buy", async function () {
      await mockUSDC.connect(user).approve(await dajuToken.getAddress(), USDC_AMOUNT);

      await expect(dajuToken.connect(user).exchange("USDC", USDC_AMOUNT, true))
        .to.emit(dajuToken, "ExchangeCompleted")
        .withArgs(user.address, "USDC", USDC_AMOUNT, EXPECTED_DAJU, true);
    });

    it("should update balances correctly after buy", async function () {
      const initialUSDC = await mockUSDC.balanceOf(user.address);
      const initialDAJU = await dajuToken.balanceOf(user.address);
      const contractDAJUBefore = await dajuToken.balanceOf(await dajuToken.getAddress());

      await mockUSDC.connect(user).approve(await dajuToken.getAddress(), USDC_AMOUNT);
      await dajuToken.connect(user).exchange("USDC", USDC_AMOUNT, true);

      const finalUSDC = await mockUSDC.balanceOf(user.address);
      const finalDAJU = await dajuToken.balanceOf(user.address);
      const contractDAJUAfter = await dajuToken.balanceOf(await dajuToken.getAddress());

      expect(finalUSDC).to.equal(initialUSDC - USDC_AMOUNT);
      expect(finalDAJU).to.equal(initialDAJU + EXPECTED_DAJU);
      expect(contractDAJUAfter).to.equal(contractDAJUBefore - EXPECTED_DAJU);
    });
  });

  describe("Sell Operation", function () {
    const SELL_AMOUNT = ethers.parseEther("50");
    const EXPECTED_USDC = ethers.parseUnits("60", 6);

    beforeEach(async function () {
     
      await mockUSDC.connect(user).approve(await dajuToken.getAddress(), USDC_AMOUNT);
      await dajuToken.connect(user).exchange("USDC", USDC_AMOUNT, true);
      
     
      await dajuToken.connect(user).approve(await dajuToken.getAddress(), SELL_AMOUNT);
    });

    it("should execute sell", async function () {
      await expect(dajuToken.connect(user).exchange("USDC", SELL_AMOUNT, false))
        .to.emit(dajuToken, "ExchangeCompleted")
        .withArgs(user.address, "USDC", SELL_AMOUNT, EXPECTED_USDC, false);
    });

    it("should update balances correctly after sell", async function () {
      const beforeUSDC = await mockUSDC.balanceOf(user.address);
      const beforeDAJU = await dajuToken.balanceOf(user.address);
      const contractUSDCBefore = await mockUSDC.balanceOf(await dajuToken.getAddress());

      await dajuToken.connect(user).exchange("USDC", SELL_AMOUNT, false);

      const afterUSDC = await mockUSDC.balanceOf(user.address);
      const afterDAJU = await dajuToken.balanceOf(user.address);
      const contractUSDCAfter = await mockUSDC.balanceOf(await dajuToken.getAddress());

      expect(afterUSDC).to.equal(beforeUSDC + EXPECTED_USDC);
      expect(afterDAJU).to.equal(beforeDAJU - SELL_AMOUNT);
      expect(contractUSDCAfter).to.equal(contractUSDCBefore - EXPECTED_USDC);
    });
  });
});
});