
const fs = require("fs");
const path = require("path");

function getContractAbi() {
  const contractPath = path.join("/home/ashish/Documents/dApps/te-be/hardhat/artifacts/contracts/DajuToken.sol/DajuToken.json");
  const contractData = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  return contractData.abi;
}

function getUSDCContractAbi() {
  const contractPath = path.join("/home/ashish/Documents/dApps/te-be/hardhat/artifacts/contracts/MockUSDC.sol/MockUSDC.json");
  const contractData = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  return contractData.abi;
}

function getExchangeManagerAbi() {
  const contractPath = path.join("/home/ashish/Documents/dApps/te-be/hardhat/artifacts/contracts/ExchangeManager.sol/ExchangeManager.json");
  const contractData = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  return contractData.abi;

}

module.exports = { getContractAbi, getUSDCContractAbi, getExchangeManagerAbi};