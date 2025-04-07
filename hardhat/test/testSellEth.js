const { ethers } = require("hardhat");

async function main() {
  const [wallet] = await ethers.getSigners();
  console.log("Using wallet:", wallet.address);

  const usdc = await ethers.getContractAt("MockUSDC", "0x809d550fca64d94Bd9F66E60752A544199cfAC3D", wallet);
  const dajuToken = await ethers.getContractAt("DajuToken", "0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575", wallet);

  console.log("DajuToken Address:", dajuToken.target);
  console.log("USDC Address in DajuToken:", await dajuToken.usdcAddress());

  // Check balances and rates before the transaction
  const contractUsdcBalance = await usdc.balanceOf(dajuToken.target);
  console.log("Contract USDC Balance:", ethers.formatUnits(contractUsdcBalance, 6));

  const rate = await dajuToken.usdcToEthRate();
  console.log("USDC to ETH Rate:", ethers.formatUnits(rate, 6));

  const ethToSell = ethers.parseEther("0.05");
  const requiredUsdc = await dajuToken.calculateUSDCAmount(ethToSell);
  console.log("Required USDC Amount:", ethers.formatUnits(requiredUsdc, 6));

  // If contract doesn't have enough USDC, mint more
  if (contractUsdcBalance < requiredUsdc) {
    const additionalUsdcNeeded = requiredUsdc - contractUsdcBalance;
    console.log(`Minting additional ${ethers.formatUnits(additionalUsdcNeeded, 6)} USDC to contract`);
    await usdc.mint(dajuToken.target, additionalUsdcNeeded);
  }

  const ethBalanceBefore = await ethers.provider.getBalance(wallet.address);
  console.log("Wallet ETH Balance Before:", ethers.formatEther(ethBalanceBefore));

  try {
    const tx = await dajuToken.sellETHForUSDC({ value: ethToSell });
    await tx.wait();
    console.log(`Sold ${ethers.formatEther(ethToSell)} ETH for USDC`);
  } catch (error) {
    console.error("Sell failed:", error);
    if (error.data) console.error("Revert data:", error.data);
    throw error;
  }

  const ethBalanceAfter = await ethers.provider.getBalance(wallet.address);
  const usdcBalanceAfter = await usdc.balanceOf(wallet.address);
  console.log("Wallet ETH Balance After:", ethers.formatEther(ethBalanceAfter));
  console.log("Wallet USDC Balance After:", ethers.formatUnits(usdcBalanceAfter, 6));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });