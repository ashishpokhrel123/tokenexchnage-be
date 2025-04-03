
const fs = require("fs");
const path = require("path");

function getContractAbi() {
  const contractPath = path.join("/home/ashish/Documents/dApps/te-be/artifacts/contracts/DajuToken.sol/DajuToken.json");
  const contractData = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  return contractData.abi;
}

module.exports = { getContractAbi };