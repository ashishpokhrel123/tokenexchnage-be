const { ethers } = require("ethers");
const config = require("../config/config");
const { getContractAbi, getUSDCContractAbi } = require("../helpers/contractHelper");

const tokenAbi = getContractAbi();
const usdcAbi = getUSDCContractAbi();
console.log(config.rpcUrl);
const provider = new ethers.JsonRpcProvider(config.rpcUrl);
const wallet = new ethers.Wallet(config.ownerPrivateKey, provider);
const otherWallet = new ethers.Wallet(config.ANOTHER_PRIVATE_KEY, provider);
const contract = new ethers.Contract(config.contractAddress, tokenAbi, wallet);
const usdcContract = new ethers.Contract(config.MOCKHSDC_CONTRACT_ADDRESS, usdcAbi, wallet );

/**
 * Fetches supported tokens and their exchange rates
 * @returns {} Supported tokens and rates
 */
async function fetchSupportedTokens() {
  try {
    const supportedTokens = await contract.getSupportedTokens();
    
    // Fetch additional token data in parallel
    const tokenDetails = await Promise.all(
      supportedTokens.map(symbol => contract.getTokenInfo(symbol))
    );

    return {
      supportedTokens,
      tokenDetails: tokenDetails.map(detail => ({
        rate: detail.rate.toString(),
        address: detail.tokenAddress,
        decimals: detail.decimals
      }))
    };
   
  } catch (error) {
    console.log("Error fetching supported tokens:", error);
    throw error;
  }
}



/**
 * Performs a token exchange
 * @param {string} user - User address initiating the exchange
 * @param {string} tokenSymbol - Token symbol to exchange
 * @param {string | number} amount - Amount to exchange (as a string or number)
 * @param {boolean} isBuying - True if buying, false if selling
 * @returns {Promise<void>}
 */
async function exchange(account, tokenSymbol, amount, isBuying) {
  try {
   
    const amountBigInt = ethers.parseUnits(amount.toString(), 18); 

    console.log(amountBigInt, "amountBigInt")

    const tx = await contract.exchange(tokenSymbol, amountBigInt, isBuying);
    await tx.wait();

    console.log(`Exchange successful: ${amount} ${tokenSymbol} ${isBuying ? "bought" : "sold"}`);
  } catch (error) {
    console.error("Exchange failed:", error.message);
    throw error;
  }
}


/**
 * Calculates the exchange output amount
 * @param {string} tokenSymbol Token symbol to calculate for
 * @param {bigint} amount Input amount
 * @param {boolean} isBuying True if buying, false if selling
 * @returns {Promise<bigint>} Calculated output amount
 */
async function calculateExchange(tokenSymbol, amount, isBuying) {
  try {
    const outputAmount = await contract.calculateExchange(
      tokenSymbol,
      amount,
      isBuying
    );
    return outputAmount;
  } catch (error) {
    await logAudit("CalculateExchangeFailed", error, null, {
      tokenSymbol,
      amount: amount.toString(),
      isBuying,
    });
    throw error;
  }
}

/**
 * Adds a new supported token (admin only)
 * @param {string} user User address (should have EXCHANGE_MANAGER_ROLE)
 * @param {string} tokenSymbol Token symbol
 * @param {string} tokenAddress Token contract address
 * @param {bigint} initialRate Initial exchange rate
 * @param {number} decimals Token decimals
 * @returns {Promise<void>}
 */
async function addSupportedToken(
  user,
  tokenSymbol,
  tokenAddress,
  initialRate,
  decimals
) {
  try {
    const tx = await contract.addSupportedToken(
      tokenSymbol,
      tokenAddress,
      initialRate,
      decimals
    );
    await tx.wait();
    await logAudit("AddSupportedToken", null, user, {
      tokenSymbol,
      tokenAddress,
      initialRate: initialRate.toString(),
    });
  } catch (error) {
    await logAudit("AddSupportedTokenFailed", error, user, {
      tokenSymbol,
      tokenAddress,
    });
    throw error;
  }
}

/**
 * Updates exchange rate (admin only)
 * @param {string} user User address (should have EXCHANGE_MANAGER_ROLE)
 * @param {string} tokenSymbol Token symbol
 * @param {bigint} newRate New exchange rate
 * @returns {Promise<void>}
 */
async function updateExchangeRate(user, tokenSymbol, newRate) {
  try {
    const tx = await contract.updateExchangeRate(tokenSymbol, newRate);
    await tx.wait();
    await logAudit("UpdateExchangeRate", null, user, {
      tokenSymbol,
      newRate: newRate.toString(),
    });
  } catch (error) {
    await logAudit("UpdateExchangeRateFailed", error, user, { tokenSymbol });
    throw error;
  }
}

/**
 * Fetches the contract owner
 * @returns {Promise<string>} Owner address
 */
async function getOwner() {
  try {
    const owner = await contract.owner();
    await logAudit("GetOwner", null, wallet.address, { owner });
    return owner;
  } catch (error) {
    await logAudit("GetOwnerFailed", error);
    throw error;
  }
}

/**
 * Listens to contract events
 * @param {Function} callback Function to handle events
 */
function listenToEvents(callback) {
  contract.on(
    "ExchangeCompleted",
    async (user, tokenSymbol, inputAmount, outputAmount, isBuying) => {
      await handleEvent(
        "ExchangeCompleted",
        { user, tokenSymbol, inputAmount, outputAmount, isBuying },
        callback
      );
    }
  );

  contract.on("ExchangeRateUpdated", async (tokenSymbol, oldRate, newRate) => {
    await handleEvent(
      "ExchangeRateUpdated",
      { tokenSymbol, oldRate, newRate },
      callback
    );
  });

  contract.on(
    "TokenSupported",
    async (tokenSymbol, tokenAddress, initialRate) => {
      await handleEvent(
        "TokenSupported",
        { tokenSymbol, tokenAddress, initialRate },
        callback
      );
    }
  );
}

/**
 * Handles contract events and logs them
 * @param {string} eventName Event name
 * @param {Object} eventData Event data
 * @param {Function} callback Callback function
 */
async function handleEvent(eventName, eventData, callback) {
  const formattedData = {
    event: eventName,
    ...Object.fromEntries(
      Object.entries(eventData).map(([key, value]) => [
        key,
        typeof value === "bigint" ? Number(value) : value,
      ])
    ),
  };
  callback(formattedData);
  await logAudit("ContractEvent", null, wallet.address, formattedData);
}

/**
 * Helper function to log audit events
 * @param {string} eventType Event type
 * @param {Error|null} error Error object if any
 * @param {string} userAddress User address
 * @param {Object} details Additional details
 */
async function logAudit(
  eventType,
  error,
  userAddress = wallet.address,
  details = {}
) {
  const logDetails = error ? { error: error.message, ...details } : details;
  await AuditLogRepository.save({
    eventType,
    address: userAddress,
    details: logDetails,
  });
}

module.exports = {
  fetchSupportedTokens,
  exchange,
  calculateExchange,
  addSupportedToken,
  updateExchangeRate,
  getOwner,
  listenToEvents,
};
