// Import required libraries
const { ethers } = require("hardhat");

async function main() {
    // Get the deployer account and network information
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    console.log("\n=== Deploying DajuToken ===");
    console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`Deployer address: ${deployer.address}`);
    // console.log(`Deployer balance: ${ethers.formatEther(await deployer.getBalance())} ETH`);

    // Deployment parameters
    const initialOwner = deployer.address; // Can be changed to a multisig or other address
    const cap = ethers.parseUnits("1000000", 18); // 1 million tokens with 18 decimals

    console.log("\nDeployment Parameters:");
    console.log(`- Initial Owner: ${initialOwner}`);
    console.log(`- Token Cap: ${ethers.formatEther(cap)} DAJU`);

    // Deploy the contract
    console.log("\nDeploying DajuToken...");
    const DajuToken = await ethers.getContractFactory("DajuToken");
    const dajuToken = await DajuToken.deploy(initialOwner, cap);

    // Wait for deployment to complete
    await dajuToken.waitForDeployment();

    console.log("\n=== Deployment Successful ===");
    console.log(`DajuToken deployed to: ${await dajuToken.getAddress()}`);

    // Useful for verification
    console.log("\nConstructor Arguments:");
    console.log(`- Initial Owner: ${initialOwner}`);
    console.log(`- Cap: ${cap.toString()}`);
}

// Execute and handle errors
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n!!! Deployment Failed !!!");
        console.error(error);
        process.exit(1);
    });