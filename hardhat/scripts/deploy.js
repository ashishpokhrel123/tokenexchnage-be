const { ethers } = require("hardhat");

async function main() {
  // Get deployer and network info
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("\n=== Deploying Contracts ===");
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Deployer address: ${deployer.address}`);

  // Deploy MockUSDC
  console.log("\nDeploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log(`MockUSDC deployed to: ${usdcAddress}`);

  // Mint initial USDC to deployer
  const initialUSDC = ethers.parseUnits("10000", 6);
  await usdc.mint(deployer.address, initialUSDC);
  console.log(`Minted ${ethers.formatUnits(initialUSDC, 6)} USDC to deployer`);

  // Deploy MockSupportedToken
  console.log("\nDeploying MockSupportedToken...");
  const MockSupportedToken = await ethers.getContractFactory("MockUSDC"); // Assuming MockUSDC is reused
  const supportedToken = await MockSupportedToken.deploy();
  await supportedToken.waitForDeployment();
  const supportedTokenAddress = await supportedToken.getAddress();
  console.log(`MockSupportedToken deployed to: ${supportedTokenAddress}`);

  // Mint initial SupportedToken to deployer
  const initialSupportedToken = ethers.parseUnits("10000", 6);
  await supportedToken.mint(deployer.address, initialSupportedToken);
  console.log(`Minted ${ethers.formatUnits(initialSupportedToken, 6)} SupportedToken to deployer`);

  // Define constants
  const TOKEN_CAP = ethers.parseUnits("10000000", 18);
  const USDC_TO_ETH_RATE = ethers.parseUnits("2000", 0); // 2000 USDC = 1 ETH
  const USDC_TO_DAJU_RATE = ethers.parseUnits("500000000000", 0); // 0.5 USDC = 1 DAJU, scaled by 10^12
  const SUPPORTED_TOKEN_TO_ETH_RATE = ethers.parseUnits("1000", 0); // 1000 SupportedToken = 1 ETH
  const SUPPORTED_TOKEN_TO_DAJU_RATE = ethers.parseUnits("250000000000", 0); // 0.25 SupportedToken = 1 DAJU, scaled by 10^12
  const SUPPORTED_TOKEN_DECIMALS = 6;
  const INITIAL_USDC_DEPOSIT = ethers.parseUnits("5000", 6); // 5,000 USDC
  const INITIAL_ETH_DEPOSIT = ethers.parseEther("10"); // 10 ETH

  // Deploy DajuToken
  console.log("\nDeploying DajuToken...");
  const DajuToken = await ethers.getContractFactory("DajuToken");
  const dajuToken = await DajuToken.deploy(deployer.address, TOKEN_CAP);
  await dajuToken.waitForDeployment();
  const dajuTokenAddress = await dajuToken.getAddress();
  console.log(`DajuToken deployed to: ${dajuTokenAddress}`);

  // Deploy ExchangeManager with initial ETH deposit only (no USDC in constructor)
  console.log("\nDeploying ExchangeManager with initial ETH reserve...");
  console.log(`- USDC to ETH rate: ${ethers.formatUnits(USDC_TO_ETH_RATE, 0)} USDC = 1 ETH`);
  console.log(`- USDC to DAJU rate: 0.5 USDC = 1 DAJU (scaled as ${ethers.formatUnits(USDC_TO_DAJU_RATE, 0)})`);
  console.log(`- SupportedToken to ETH rate: ${ethers.formatUnits(SUPPORTED_TOKEN_TO_ETH_RATE, 0)} SupportedToken = 1 ETH`);
  console.log(`- SupportedToken to DAJU rate: 0.25 SupportedToken = 1 DAJU (scaled as ${ethers.formatUnits(SUPPORTED_TOKEN_TO_DAJU_RATE, 0)})`);
  console.log(`- Initial ETH deposit: ${ethers.formatEther(INITIAL_ETH_DEPOSIT)} ETH`);

  const ExchangeManager = await ethers.getContractFactory("ExchangeManager");
  const exchangeManager = await ExchangeManager.deploy(
    dajuTokenAddress,
    usdcAddress,
    USDC_TO_ETH_RATE,
    USDC_TO_DAJU_RATE,
    supportedTokenAddress,
    SUPPORTED_TOKEN_TO_ETH_RATE,
    SUPPORTED_TOKEN_TO_DAJU_RATE,
    SUPPORTED_TOKEN_DECIMALS,
    0, // Set initialUsdcDeposit to 0 to avoid transferFrom in constructor
    { value: INITIAL_ETH_DEPOSIT } // Send ETH during deployment
  );
  await exchangeManager.waitForDeployment();
  const exchangeManagerAddress = await exchangeManager.getAddress();
  console.log(`ExchangeManager deployed to: ${exchangeManagerAddress}`);

  // Approve and deposit USDC post-deployment
  console.log(`\nApproving ${ethers.formatUnits(INITIAL_USDC_DEPOSIT, 6)} USDC for ExchangeManager...`);
  await usdc.approve(exchangeManagerAddress, INITIAL_USDC_DEPOSIT);
  console.log("USDC approved for ExchangeManager");

  console.log(`Depositing ${ethers.formatUnits(INITIAL_USDC_DEPOSIT, 6)} USDC to ExchangeManager...`);
  await exchangeManager.depositUSDC(INITIAL_USDC_DEPOSIT);
  console.log("USDC deposited to ExchangeManager");

  // Mint initial DAJU to ExchangeManager for liquidity
  const initialDajuReserve = ethers.parseUnits("1000000", 18);
  await dajuToken.mint(exchangeManagerAddress, initialDajuReserve);
  console.log(`Minted ${ethers.formatUnits(initialDajuReserve, 18)} DAJU to ExchangeManager`);

  // Approve ExchangeManager to spend DAJU on behalf of itself (if needed)
  await dajuToken.approve(exchangeManagerAddress, initialDajuReserve);
  console.log(`Approved ExchangeManager to spend ${ethers.formatUnits(initialDajuReserve, 18)} DAJU`);

  // Verify initial reserves
  const ethBalance = await exchangeManager.getETHBalance();
  const usdcBalance = await exchangeManager.getUSDCBalance();
  const dajuBalance = await exchangeManager.getDajuBalance();
  console.log(`\nExchangeManager reserves:`);
  console.log(`- ETH: ${ethers.formatEther(ethBalance)} ETH`);
  console.log(`- USDC: ${ethers.formatUnits(usdcBalance, 6)} USDC`);
  console.log(`- DAJU: ${ethers.formatUnits(dajuBalance, 18)} DAJU`);

  // Deployment summary
  console.log("\n=== Deployment Summary ===");
  console.log("Contracts deployed:");
  console.log(`- MockUSDC: ${usdcAddress}`);
  console.log(`- MockSupportedToken: ${supportedTokenAddress}`);
  console.log(`- DajuToken: ${dajuTokenAddress}`);
  console.log(`- ExchangeManager: ${exchangeManagerAddress}`);

  console.log("\nInitial setup:");
  console.log(`- USDC to ETH rate: ${ethers.formatUnits(USDC_TO_ETH_RATE, 0)} USDC = 1 ETH`);
  console.log(`- USDC to DAJU rate: 0.5 USDC = 1 DAJU (scaled as ${ethers.formatUnits(USDC_TO_DAJU_RATE, 0)})`);
  console.log(`- SupportedToken to ETH rate: ${ethers.formatUnits(SUPPORTED_TOKEN_TO_ETH_RATE, 0)} SupportedToken = 1 ETH`);
  console.log(`- SupportedToken to DAJU rate: 0.25 SupportedToken = 1 DAJU (scaled as ${ethers.formatUnits(SUPPORTED_TOKEN_TO_DAJU_RATE, 0)})`);
  console.log(`- ExchangeManager funded with ${ethers.formatEther(INITIAL_ETH_DEPOSIT)} ETH`);
  console.log(`- ExchangeManager funded with ${ethers.formatUnits(INITIAL_USDC_DEPOSIT, 6)} USDC`);
  console.log(`- ExchangeManager funded with ${ethers.formatUnits(initialDajuReserve, 18)} DAJU`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n!!! Deployment Failed !!!");
    console.error(error);
    process.exit(1);
  });