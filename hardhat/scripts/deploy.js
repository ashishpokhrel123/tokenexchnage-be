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
  const MockSupportedToken = await ethers.getContractFactory("MockUSDC"); 
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
  const USDC_TO_ETH_RATE = ethers.parseUnits("2000", 12); 
  const USDC_TO_DAJU_RATE = ethers.parseUnits("0.5", 12); 
  const SUPPORTED_TOKEN_TO_ETH_RATE = ethers.parseUnits("1000", 12); 
  const SUPPORTED_TOKEN_TO_DAJU_RATE = ethers.parseUnits("0.25", 12); 
  const SUPPORTED_TOKEN_DECIMALS = 6; 

  // Deploy DajuToken
  console.log("\nDeploying DajuToken...");
  const DajuToken = await ethers.getContractFactory("DajuToken");
  const dajuToken = await DajuToken.deploy(deployer.address, TOKEN_CAP);
  await dajuToken.waitForDeployment();
  const dajuTokenAddress = await dajuToken.getAddress();
  console.log(`DajuToken deployed to: ${dajuTokenAddress}`);

  // Deploy ExchangeManager with initial rates
  console.log("\nDeploying ExchangeManager with initial rates...");
  console.log(`- USDC to ETH rate: ${ethers.formatUnits(USDC_TO_ETH_RATE, 12)} USDC = 1 ETH`);
  console.log(`- USDC to DAJU rate: ${ethers.formatUnits(USDC_TO_DAJU_RATE, 12)} USDC = 1 DAJU`);
  console.log(`- SupportedToken to ETH rate: ${ethers.formatUnits(SUPPORTED_TOKEN_TO_ETH_RATE, 12)} SupportedToken = 1 ETH`);
  console.log(`- SupportedToken to DAJU rate: ${ethers.formatUnits(SUPPORTED_TOKEN_TO_DAJU_RATE, 12)} SupportedToken = 1 DAJU`);

  const ExchangeManager = await ethers.getContractFactory("ExchangeManager");
  const exchangeManager = await ExchangeManager.deploy(
    dajuTokenAddress,            
    usdcAddress,                
    USDC_TO_ETH_RATE,            
    USDC_TO_DAJU_RATE,           
    supportedTokenAddress,       
    SUPPORTED_TOKEN_TO_ETH_RATE, 
    SUPPORTED_TOKEN_TO_DAJU_RATE,
    SUPPORTED_TOKEN_DECIMALS    
  );
  await exchangeManager.waitForDeployment();
  const exchangeManagerAddress = await exchangeManager.getAddress();
  console.log(`ExchangeManager deployed to: ${exchangeManagerAddress}`);

  // // Deploy AdminControls
  // console.log("\nDeploying AdminControls...");
  // const AdminControls = await ethers.getContractFactory("AdminControls");
  // const adminControls = await AdminControls.deploy(
  //   exchangeManagerAddress,     
  //   usdcAddress,                 
  //   supportedTokenAddress,       
  //   deployer.address             
  // );
  // await adminControls.waitForDeployment();
  // const adminControlsAddress = await adminControls.getAddress();
  // console.log(`AdminControls deployed to: ${adminControlsAddress}`);

  // Fund ExchangeManager with initial reserves
  const initialUSDCReserve = ethers.parseUnits("5000", 6); // 5,000 USDC
  await usdc.transfer(exchangeManagerAddress, initialUSDCReserve);
  console.log(`Funded ExchangeManager with ${ethers.formatUnits(initialUSDCReserve, 6)} USDC`);

  const initialSupportedTokenReserve = ethers.parseUnits("5000", 6); 
  await supportedToken.transfer(exchangeManagerAddress, initialSupportedTokenReserve);
  console.log(`Funded ExchangeManager with ${ethers.formatUnits(initialSupportedTokenReserve, 6)} SupportedToken`);

  // Mint initial DAJU to ExchangeManager for liquidity
  const initialDajuReserve = ethers.parseUnits("1000000", 18); 
  await dajuToken.mint(exchangeManagerAddress, initialDajuReserve);
  console.log(`Minted ${ethers.formatUnits(initialDajuReserve, 18)} DAJU to ExchangeManager`);

  // Approve ExchangeManager to spend DAJU on behalf of itself (if needed)
  await dajuToken.approve(exchangeManagerAddress, initialDajuReserve);
  console.log(`Approved ExchangeManager to spend ${ethers.formatUnits(initialDajuReserve, 18)} DAJU`);

  // Deployment summary
  console.log("\n=== Deployment Summary ===");
  console.log("Contracts deployed:");
  console.log(`- MockUSDC: ${usdcAddress}`);
  console.log(`- MockSupportedToken: ${supportedTokenAddress}`);
  console.log(`- DajuToken: ${dajuTokenAddress}`);
  console.log(`- ExchangeManager: ${exchangeManagerAddress}`);
  // console.log(`- AdminControls: ${adminControlsAddress}`);

  console.log("\nInitial setup:");
  console.log(`- USDC to ETH rate: ${ethers.formatUnits(USDC_TO_ETH_RATE, 12)} USDC = 1 ETH`);
  console.log(`- USDC to DAJU rate: ${ethers.formatUnits(USDC_TO_DAJU_RATE, 12)} USDC = 1 DAJU`);
  console.log(`- SupportedToken to ETH rate: ${ethers.formatUnits(SUPPORTED_TOKEN_TO_ETH_RATE, 12)} SupportedToken = 1 ETH`);
  console.log(`- SupportedToken to DAJU rate: ${ethers.formatUnits(SUPPORTED_TOKEN_TO_DAJU_RATE, 12)} SupportedToken = 1 DAJU`);
  console.log(`- ExchangeManager funded with ${ethers.formatUnits(initialUSDCReserve, 6)} USDC`);
  console.log(`- ExchangeManager funded with ${ethers.formatUnits(initialSupportedTokenReserve, 6)} SupportedToken`);
  console.log(`- ExchangeManager funded with ${ethers.formatUnits(initialDajuReserve, 18)} DAJU`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n!!! Deployment Failed !!!");
    console.error(error);
    process.exit(1);
  });