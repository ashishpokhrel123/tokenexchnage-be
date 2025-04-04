const { ethers } = require("hardhat");

async function main() {
  // Get the deployer account and network information
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

  // Mint some extra USDC to deployer (optional)
  const usdcMintAmount = ethers.parseUnits("10000", 6); // 10,000 USDC
  await usdc.mint(deployer.address, usdcMintAmount);
  console.log(`Minted ${ethers.formatUnits(usdcMintAmount, 6)} USDC to deployer`);

  // Deploy DajuToken
  console.log("\nDeploying DajuToken...");
  const initialOwner = deployer.address;
  const cap = ethers.parseUnits("10000000", 18); // 10 million tokens with 18 decimals
  const DajuToken = await ethers.getContractFactory("DajuToken");
  const dajuToken = await DajuToken.deploy(initialOwner, cap);
  await dajuToken.waitForDeployment();
  const dajuTokenAddress = await dajuToken.getAddress();
  console.log(`DajuToken deployed to: ${dajuTokenAddress}`);

  // Update USDC address in DajuToken (since constructor uses a placeholder)
  console.log("\nUpdating USDC address in DajuToken...");
  await dajuToken.setTokenAddress("USDC", usdcAddress);
  console.log(`Set USDC address to: ${usdcAddress}`);

  // Mint some extra DAJU to deployer (optional)
  const dajuMintAmount = ethers.parseUnits("1000", 18); // Mint 1000 DAJU tokens to deployer
  await dajuToken.mint(deployer.address, dajuMintAmount);
  console.log(`Minted ${ethers.formatEther(dajuMintAmount)} DAJU to deployer`);

  console.log("\n=== Deployment Successful ===");
  console.log("\nDeployed Contract Addresses:");
  console.log(`- MockUSDC: ${usdcAddress}`);
  console.log(`- DajuToken: ${dajuTokenAddress}`);

  console.log("\nConstructor Arguments:");
  console.log(`- MockUSDC: None (simple deployment)`);
  console.log(`- DajuToken:`);
  console.log(`  - Initial Owner: ${initialOwner}`);
  console.log(`  - Cap: ${ethers.formatEther(cap)} DAJU`);

  console.log("\nAdditional Setup:");
  console.log(`- USDC Address in DajuToken: ${usdcAddress}`);
}

// Execute and handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n!!! Deployment Failed !!!");
    console.error(error);
    process.exit(1);
  });
