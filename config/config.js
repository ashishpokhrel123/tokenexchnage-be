require("dotenv").config();

const config = {
  port: process.env.PORT || 7000,
  rpcUrl: process.env.RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
  contractAddress: process.env.CONTRACT_ADDRESS || "0xYourContractAddress",
  ownerPrivateKey: process.env.OWNER_PRIVATE_KEY || "0xYourPrivateKey",
  MOCKHSDC_CONTRACT_ADDRESS: process.env.MOCKHSDC_CONTRACT_ADDRESS || "0xYourUsdcContractAddress",
  ANOTHER_PRIVATE_KEY : process.env.ANOTHER_PRIVATE_KEY || "0xYourPrivateKey"
};

module.exports = config;