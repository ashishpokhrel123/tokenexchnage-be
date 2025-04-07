const { ethers } = require("hardhat");

async function main() {
  const [wallet] = await ethers.getSigners(); // 0xf39Fd6e51aad...
  console.log("Using wallet:", wallet.address);

  const usdc = await ethers.getContractAt("MockUSDC", "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318", wallet);
  const dajuToken = await ethers.getContractAt("DajuToken", "0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82", wallet);

  // Mint USDC
  await usdc.mint(wallet.address, ethers.parseUnits("1000", 6));
  console.log("USDC Balance:", ethers.formatUnits(await usdc.balanceOf(wallet.address), 6));

  // Approve
  await usdc.approve(dajuToken.target, ethers.parseUnits("100", 6));
  console.log("Allowance:", ethers.formatUnits(await usdc.allowance(wallet.address, dajuToken.target), 6));

  // Fund contract with ETH
  await wallet.sendTransaction({ to: dajuToken.target, value: ethers.parseEther("1") });
  console.log("Funded contract with 1 ETH");

  // Buy ETH
  await dajuToken.buyETHWithUSDC(ethers.parseUnits("100", 6));
  console.log("Buy successful");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });