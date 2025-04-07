const { ethers } = require("ethers");
const config = require("../config/config");
const {
  getContractAbi,
  getExchangeManagerAbi,
  getUSDCContractAbi,
} = require("../helpers/contractHelper");
const { info, error, debug } = require("../utils/logger");

// Initialize Provider and Wallet
const provider = new ethers.JsonRpcProvider(config.rpcUrl);
const wallet = new ethers.Wallet(config.ownerPrivateKey, provider);

// Initialize Contracts
const dajuTokenContract = new ethers.Contract(
  config.contractAddress, 
  getContractAbi(),
  wallet
);

const exchangeManagerContract = new ethers.Contract(
  config.exchangeManagerAddress, // New config field for ExchangeManager address
  getExchangeManagerAbi(),
  wallet
);

const usdcContract = new ethers.Contract(
  config.MOCKHSDC_CONTRACT_ADDRESS,
  getUSDCContractAbi(),
  wallet
);

class TokenController {
  constructor() {
    this.dajuToken = dajuTokenContract;
    this.exchangeManager = exchangeManagerContract;
    this.usdcContract = usdcContract;
    this.provider = provider;
    this.decimals = {
      USDC: 6,
      DAJU: 18,
      SUPPORTED_TOKEN: config.SUPPORTED_TOKEN_DECIMALS || 6,
    };
  }

  /** Private Utility Methods **/

  _validateAmount(amount, paramName) {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      const errorMsg = `Invalid ${paramName}: must be a positive number`;
      error(errorMsg, { amount });
      throw new Error(errorMsg);
    }
  }

  _parseEtherAmount(amount, paramName) {
    this._validateAmount(amount, paramName);
    return ethers.parseEther(amount);
  }

  async _executeTx(contract, methodName, args = [], options = {}, successMessage) {
    info(`Executing transaction: ${successMessage}`, { args });
    try {
      const method = contract[methodName];
      const tx = await method(...args, options);
      const receipt = await tx.wait();
      info(`${successMessage} - Transaction completed`, {
        txHash: receipt.hash,
      });
      return { txHash: receipt.hash };
    } catch (err) {
      error(`Transaction failed: ${successMessage}`, { error: err.message });
      throw err;
    }
  }

  async _checkUSDCReserves(ethAmount) {
    const rate = BigInt(await this.exchangeManager.usdcToEthRate());
    const usdcRequired = (ethAmount * rate) / BigInt(1e12); // Adjust scaling as per contract
    const usdcBalance = await this.exchangeManager.getUSDCBalance();
    if (usdcBalance < usdcRequired) {
      const errorMsg =
        `Insufficient USDC reserves: ${ethers.formatUnits(
          usdcRequired,
          this.decimals.USDC
        )} USDC required, ` +
        `${ethers.formatUnits(usdcBalance, this.decimals.USDC)} available`;
      error(errorMsg, { usdcRequired, usdcBalance });
      throw new Error(errorMsg);
    }
    debug(`USDC reserves check passed`, {
      available: ethers.formatUnits(usdcBalance, this.decimals.USDC),
    });
  }

  _enhanceError(err, message) {
    const enhancedError = `${message}: ${err.message}`;
    error(enhancedError, { originalError: err.message });
    return new Error(enhancedError);
  }

  /** Public Methods **/

  async getTokenInfo() {
    info("Fetching token info");
    try {
      const [
        name,
        symbol,
        cap,
        totalSupply,
        paused,
        usdcAddress,
        usdcToEthRate,
        usdcToDajuRate,
      ] = await Promise.all([
        this.dajuToken.name(),
        this.dajuToken.symbol(),
        this.dajuToken.CAP(),
        this.dajuToken.totalSupply(),
        this.exchangeManager.paused(),
        this.exchangeManager.usdcAddress(),
        this.exchangeManager.usdcToEthRate(),
        this.exchangeManager.usdcToDajuRate(),
      ]);

      const [ethBalance, usdcBalance] = await Promise.all([
        this.provider.getBalance(this.exchangeManager.target),
        this.exchangeManager.getUSDCBalance(),
      ]);

      const result = {
        success: true,
        data: {
          token: {
            name,
            symbol,
            cap: ethers.formatEther(cap),
            totalSupply: ethers.formatEther(totalSupply),
          },
          rates: {
            usdcToEth: ethers.formatUnits(usdcToEthRate, 12), // Adjust scaling based on contract
            usdcToDaju: ethers.formatUnits(usdcToDajuRate, 12),
          },
          balances: {
            eth: ethers.formatEther(ethBalance),
            usdc: ethers.formatUnits(usdcBalance, this.decimals.USDC),
          },
          addresses: {
            dajuToken: config.dajuTokenAddress,
            exchangeManager: config.exchangeManagerAddress,
            usdc: usdcAddress,
          },
          state: { paused },
        },
      };

      info(`Token info fetched successfully`, { name, symbol });
      return result;
    } catch (err) {
      throw this._enhanceError(err, "Failed to fetch token info");
    }
  }

  async buyETHWithUSDC(amount) {
    info(`Initiating buyETHWithUSDC`, { amount });
    try {
      this._validateAmount(amount, "USDC amount");
      const amountBigInt = ethers.parseUnits(amount, this.decimals.USDC);

      const contractUsdcAddress = await this.exchangeManager.usdcAddress();
      if (
        this.usdcContract.target.toLowerCase() !==
        contractUsdcAddress.toLowerCase()
      ) {
        const errorMsg = "USDC address mismatch";
        error(errorMsg, {
          expected: contractUsdcAddress,
          actual: this.usdcContract.target,
        });
        throw new Error(errorMsg);
      }

      await this._executeTx(
        this.usdcContract,
        "approve",
        [this.exchangeManager.target, amountBigInt],
        {},
        `Approved ${amount} USDC for buying ETH`
      );

      const ethBalance = await this.provider.getBalance(this.exchangeManager.target);
      const ethRequired =
        (amountBigInt * BigInt(1e18)) /
        (BigInt(await this.exchangeManager.usdcToEthRate()) * BigInt(1e6)); // Adjust scaling

      if (ethBalance < ethRequired) {
        const errorMsg = `Insufficient ETH reserves: ${ethers.formatEther(
          ethRequired
        )} ETH required`;
        error(errorMsg, { available: ethers.formatEther(ethBalance) });
        throw new Error(errorMsg);
      }

      return await this._executeTx(
        this.exchangeManager,
        "buyETHWithUSDC",
        [amountBigInt],
        {},
        `Bought ETH with ${amount} USDC`
      );
    } catch (err) {
      throw this._enhanceError(err, "Failed to buy ETH with USDC");
    }
  }

  async sellETHForUSDC(amount) {
    info(`Initiating sellETHForUSDC`, { amount });
    try {
      const ethAmount = this._parseEtherAmount(amount, "ETH amount");
      const usdcBalance = await this.exchangeManager.getUSDCBalance();
      if (usdcBalance === BigInt(0)) {
        const warningMsg = "Contract has no USDC reserves available";
        error(warningMsg);
        throw new Error(warningMsg);
      }
      await this._checkUSDCReserves(ethAmount);

      return await this._executeTx(
        this.exchangeManager,
        "sellETHForUSDC",
        [],
        { value: ethAmount },
        `Sold ${amount} ETH for USDC`
      );
    } catch (err) {
      throw this._enhanceError(err, "Failed to sell ETH for USDC");
    }
  }

  async exchangeUSDCForDAJU(amount) {
    info(`Initiating exchangeUSDCForDAJU`, { amount });
    try {
      this._validateAmount(amount, "USDC amount");
      const amountBigInt = ethers.parseUnits(amount, this.decimals.USDC);

      await this._executeTx(
        this.usdcContract,
        "approve",
        [this.exchangeManager.target, amountBigInt],
        {},
        `Approved ${amount} USDC for DAJU exchange`
      );

      return await this._executeTx(
        this.exchangeManager,
        "exchangeUSDCForDAJU",
        [amountBigInt],
        {},
        `Exchanged ${amount} USDC for DAJU`
      );
    } catch (err) {
      throw this._enhanceError(err, "Failed to exchange USDC for DAJU");
    }
  }

  async exchangeDAJUForUSDC(amount) {
    info(`Initiating exchangeDAJUForUSDC`, { amount });
    try {
      this._validateAmount(amount, "DAJU amount");
      const amountBigInt = ethers.parseUnits(amount, this.decimals.DAJU);

      // Approve ExchangeManager to spend DAJU from wallet
      await this._executeTx(
        this.dajuToken,
        "approve",
        [this.exchangeManager.target, amountBigInt],
        {},
        `Approved ${amount} DAJU for USDC exchange`
      );

      return await this._executeTx(
        this.exchangeManager,
        "exchangeDAJUForUSDC",
        [amountBigInt],
        {},
        `Exchanged ${amount} DAJU for USDC`
      );
    } catch (err) {
      throw this._enhanceError(err, "Failed to exchange DAJU for USDC");
    }
  }

  async calculateETHAmount(usdcAmount) {
    info(`Calculating ETH amount`, { usdcAmount });
    try {
      this._validateAmount(usdcAmount, "USDC amount");
      const amountBigInt = ethers.parseUnits(usdcAmount, this.decimals.USDC);
      const ethAmount = await this.exchangeManager.calculateETHAmount(amountBigInt);
      const result = ethers.formatEther(ethAmount);
      debug(`ETH amount calculated`, { result });
      return result;
    } catch (err) {
      throw this._enhanceError(err, "Failed to calculate ETH amount");
    }
  }

  async calculateUSDCAmount(ethAmount) {
    info(`Calculating USDC amount`, { ethAmount });
    try {
      this._validateAmount(ethAmount, "ETH amount");
      const amountBigInt = ethers.parseEther(ethAmount);
      const usdcAmount = await this.exchangeManager.calculateUSDCAmount(amountBigInt);
      const result = ethers.formatUnits(usdcAmount, this.decimals.USDC);
      debug(`USDC amount calculated`, { result });
      return result;
    } catch (err) {
      throw this._enhanceError(err, "Failed to calculate USDC amount");
    }
  }
}

const controllerInstance = new TokenController();

module.exports = {
  getTokenInfo: controllerInstance.getTokenInfo.bind(controllerInstance),
  buyETHWithUSDC: controllerInstance.buyETHWithUSDC.bind(controllerInstance),
  sellETHForUSDC: controllerInstance.sellETHForUSDC.bind(controllerInstance),
  exchangeUSDCForDAJU: controllerInstance.exchangeUSDCForDAJU.bind(controllerInstance),
  exchangeDAJUForUSDC: controllerInstance.exchangeDAJUForUSDC.bind(controllerInstance),
  calculateETHAmount: controllerInstance.calculateETHAmount.bind(controllerInstance),
  calculateUSDCAmount: controllerInstance.calculateUSDCAmount.bind(controllerInstance),
};