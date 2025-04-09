const { ethers } = require("ethers");
const config = require("./config/config");
const { getContractAbi, getExchangeManagerAbi } = require("./helpers/contractHelper");

async function fundExchangeManager() {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(config.ownerPrivateKey, provider);

    const dajuToken = new ethers.Contract(config.contractAddress, getContractAbi(), wallet);
    const exchangeManager = new ethers.Contract(config.exchangeManagerAddress, getExchangeManagerAbi(), wallet);

    const dajuAmount = ethers.parseEther("10"); // 10 DAJU

    try {
        // Check current balances
        const walletDajuBalance = await dajuToken.balanceOf(wallet.address);
        const contractDajuBalance = await dajuToken.balanceOf(exchangeManager.address);
        console.log("Wallet DAJU Balance:", ethers.formatEther(walletDajuBalance));
        console.log("ExchangeManager DAJU Balance:", ethers.formatEther(contractDajuBalance));

        // Check MINTER_ROLE
        const minterRole = await dajuToken.MINTER_ROLE();
        const hasMinterRole = await dajuToken.hasRole(minterRole, wallet.address);
        console.log("Wallet has MINTER_ROLE:", hasMinterRole);

        if (!hasMinterRole) {
            throw new Error("Wallet does not have MINTER_ROLE. Grant it via DEFAULT_ADMIN_ROLE.");
        }

        // Mint DAJU tokens
        console.log("Minting 10 DAJU to wallet...");
        const mintTx = await dajuToken.mint(wallet.address, dajuAmount);
        await mintTx.wait();
        console.log("Minted, tx hash:", mintTx.hash);

        // Approve ExchangeManager
        console.log("Approving ExchangeManager to spend 10 DAJU...");
        const approveTx = await dajuToken.approve(exchangeManager.address, dajuAmount);
        await approveTx.wait();
        console.log("Approved, tx hash:", approveTx.hash);

        // Deposit DAJU
        console.log("Depositing 10 DAJU into ExchangeManager...");
        const depositTx = await exchangeManager.depositDAJU(dajuAmount);
        await depositTx.wait();
        console.log("Deposited, tx hash:", depositTx.hash);

        // Verify new balance
        const newContractBalance = await dajuToken.balanceOf(exchangeManager.address);
        console.log("New ExchangeManager DAJU Balance:", ethers.formatEther(newContractBalance));
    } catch (err) {
        console.error("Error:", err.message);
    }
}

fundExchangeManager().then(() => console.log("Funding complete")).catch(err => console.error("Failed:", err));