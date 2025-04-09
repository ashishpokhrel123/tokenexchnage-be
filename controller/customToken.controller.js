const { ethers } = require("ethers");
const config = require("../config/config");
const {
  getContractAbi,
  getExchangeManagerAbi,
  getUSDCContractAbi,
} = require("../helpers/contractHelper");
const { info, error, debug } = require("../utils/logger");
const {
  formatSuccessResponse,
  formatErrorResponse,
} = require("../utils/common/Response/responseUtils");
const { NonceManager } = require("../utils/common/NonceHelper/nonceUtils");

class TokenController {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.ownerPrivateKey, this.provider);
    this.nonceManager = new NonceManager(this.provider, this.wallet);
    this.decimals = {
      USDC: 6,
      DAJU: 18,
      SUPPORTED_TOKEN: config.SUPPORTED_TOKEN_DECIMALS || 6,
    };
    this._initializeContracts();
    debug("TokenController initialized", { rpcUrl: config.rpcUrl });
  }

  _initializeContracts() {
    this.dajuToken = new ethers.Contract(
      config.contractAddress,
      getContractAbi(),
      this.wallet
    );
    this.exchangeManager = new ethers.Contract(
      config.exchangeManagerAddress,
      getExchangeManagerAbi(),
      this.wallet
    );
    this.usdcContract = new ethers.Contract(
      config.MOCKHSDC_CONTRACT_ADDRESS,
      getUSDCContractAbi(),
      this.wallet
    );
  }

  async buyETHWithUSDC(amount) {
    try {
      debug("Starting buyETHWithUSDC", { amount });
      const usdcAmount = this._parseUnits(amount, this.decimals.USDC);
      const senderAddress = await this.wallet.getAddress();

      await this._verifyUSDCBalance(senderAddress, usdcAmount);
      await this._verifyETHReserves(usdcAmount);

      await this.nonceManager.executeTransaction((options) =>
        this.usdcContract.approve(
          this.exchangeManager.address,
          usdcAmount,
          options
        )
      );

      const receipt = await this.nonceManager.executeTransaction((options) =>
        this.exchangeManager.buyETHWithUSDC(usdcAmount, {
          ...options,
          gasLimit: 300000,
        })
      );

      const ethReceived = await this._calculateExpectedETH(usdcAmount);
      const actualEthReceived = await this._getActualETHReceived(
        senderAddress,
        receipt
      );

      const data = {
        transactionHash: receipt.hash,
        ethReceived: ethers.formatEther(ethReceived),
        actualEthReceived: ethers.formatEther(actualEthReceived),
      };

      info("Successfully bought ETH with USDC", {
        amount,
        ethReceived: data.ethReceived,
        txHash: receipt.hash,
      });
      return formatSuccessResponse(data, "Successfully bought ETH with USDC");
    } catch (err) {
      error("Failed to buy ETH with USDC", { amount, error: err.message });
      return formatErrorResponse(`Failed to buy ETH: ${err.message}`, 500);
    }
  }

  async sellETHForUSDC(amount) {
    try {
      debug("Starting sellETHForUSDC", { amount });
      if (!amount || isNaN(amount)) {
        return formatErrorResponse("Invalid ETH amount provided", 400);
      }

      const ethAmount = this._parseEther(amount);
      const usdcBalance = await this.exchangeManager.getUSDCBalance();
      if (usdcBalance === 0n) {
        return formatErrorResponse("Contract has no USDC reserves", 400);
      }

      const receipt = await this.nonceManager.executeTransaction((options) =>
        this.exchangeManager.sellETHForUSDC({ ...options, value: ethAmount })
      );

      const usdcReceived = await this._calculateExpectedUSDC(ethAmount);
      const data = {
        transactionHash: receipt.hash,
        usdcReceived: ethers.formatUnits(usdcReceived, this.decimals.USDC),
      };

      info("Successfully sold ETH for USDC", {
        amount,
        usdcReceived: data.usdcReceived,
        txHash: receipt.hash,
      });
      return formatSuccessResponse(data, "Successfully sold ETH for USDC");
    } catch (err) {
      error("Failed to sell ETH for USDC", { amount, error: err.message });
      return formatErrorResponse(`Failed to sell ETH: ${err.message}`, 500);
    }
  }

  async exchangeUSDCForDAJU(amount) {
    try {
      debug("Starting exchangeUSDCForDAJU", { amount });

      // 1. Validate input and parse amount
      if (!amount || isNaN(amount)) {
        throw new Error("Invalid amount provided");
      }
      const usdcAmount = this._parseUnits(amount, this.decimals.USDC);

      // 2. Get sender address and verify contracts
      const senderAddress = await this.wallet.getAddress();
      await this._verifyUSDCBalance(senderAddress, usdcAmount);
      if (!this.usdcContract?.target || !this.exchangeManager?.target) {
        throw new Error("Contracts not properly initialized");
      }

      // 3. Log important addresses for debugging
      debug("Contract addresses", {
        usdcContract: this.usdcContract.target,
        exchangeManager: this.exchangeManager.target,
        senderAddress,
      });

      // 4. Verify USDC balance
      await this._verifyUSDCBalance(senderAddress, usdcAmount);

      

      // 5. Approve USDC spending (with additional checks)
      const allowance = await this.usdcContract.allowance(
        senderAddress,
        this.exchangeManager.target
      );

      if (allowance < usdcAmount) {
        debug("Approving USDC spending...", {
          required: usdcAmount.toString(),
          currentAllowance: allowance.toString(),
        });

        const approveTx = await this.nonceManager.executeTransaction(
          (options) =>
            this.usdcContract.approve(
              this.exchangeManager.target,
              usdcAmount,
              options
            )
        );
        await approveTx.wait();
        debug("Approval successful", { txHash: approveTx.hash });
      }

      // 6. Execute the exchange
      const receipt = await this.nonceManager.executeTransaction((options) =>
        this.exchangeManager.exchangeUSDCForDAJU(usdcAmount, {
          ...options,
          gasLimit: 300000,
        })
      );

      // 7. Verify the transaction
      const txReceipt = await this.provider.getTransactionReceipt(receipt.hash);
      if (txReceipt.status !== 1) {
        throw new Error("Transaction failed");
      }

      // 8. Return success response
      const data = {
        transactionHash: receipt.hash,
        usdcAmount: amount,
        dajuAmount:
          (usdcAmount * 10n ** 18n) /
          ((await this.exchangeManager.usdcToDajuRate()) *
            10n ** BigInt(this.decimals.USDC)),
      };

      info("Successfully exchanged USDC for DAJU", {
        amount,
        txHash: receipt.hash,
        dajuAmount: data.dajuAmount.toString(),
      });

      return formatSuccessResponse(
        data,
        "Successfully exchanged USDC for DAJU"
      );
    } catch (err) {
      error("Failed to exchange USDC for DAJU", {
        amount,
        error: err.message,
        stack: err.stack,
        contractAddresses: {
          usdc: this.usdcContract?.target,
          exchangeManager: this.exchangeManager?.target,
        },
      });
      return formatErrorResponse(
        `Failed to exchange USDC for DAJU: ${err.message}`,
        500
      );
    }
  }

  async exchangeDAJUForUSDC(amount) {
    try {
      debug("Starting exchangeDAJUForUSDC", { amount });
      const dajuAmount = this._parseUnits(amount, this.decimals.DAJU);
      const senderAddress = await this.wallet.getAddress();

      const dajuBalance = await this.dajuToken.balanceOf(senderAddress);
      if (dajuBalance < dajuAmount)
        throw new Error("Insufficient DAJU balance");

      await this.nonceManager.executeTransaction((options) =>
        this.dajuToken.approve(
          this.exchangeManager.address,
          dajuAmount,
          options
        )
      );

      const receipt = await this.nonceManager.executeTransaction((options) =>
        this.exchangeManager.exchangeDAJUForUSDC(dajuAmount, {
          ...options,
          gasLimit: 300000,
        })
      );

      const data = { transactionHash: receipt.hash };
      info("Successfully exchanged DAJU for USDC", {
        amount,
        txHash: receipt.hash,
      });
      return formatSuccessResponse(
        data,
        "Successfully exchanged DAJU for USDC"
      );
    } catch (err) {
      error("Failed to exchange DAJU for USDC", { amount, error: err.message });
      return formatErrorResponse(
        `Failed to exchange DAJU for USDC: ${err.message}`,
        500
      );
    }
  }

  async calculateETHAmount(usdcAmount) {
    try {
      debug("Calculating ETH amount", { usdcAmount });
      const parsedAmount = this._parseUnits(usdcAmount, this.decimals.USDC);
      const ethAmount = await this._calculateExpectedETH(parsedAmount);
      const data = { ethAmount: ethers.formatEther(ethAmount) };
      info("ETH amount calculated", { usdcAmount, ethAmount: data.ethAmount });
      return formatSuccessResponse(data, "ETH amount calculated successfully");
    } catch (err) {
      error("Failed to calculate ETH amount", {
        usdcAmount,
        error: err.message,
      });
      return formatErrorResponse(
        `Failed to calculate ETH amount: ${err.message}`,
        500
      );
    }
  }

  async calculateUSDCAmount(ethAmount) {
    try {
      debug("Calculating USDC amount", { ethAmount });
      const parsedAmount = this._parseEther(ethAmount);
      const usdcAmount = await this._calculateExpectedUSDC(parsedAmount);
      const data = {
        usdcAmount: ethers.formatUnits(usdcAmount, this.decimals.USDC),
      };
      info("USDC amount calculated", {
        ethAmount,
        usdcAmount: data.usdcAmount,
      });
      return formatSuccessResponse(data, "USDC amount calculated successfully");
    } catch (err) {
      error("Failed to calculate USDC amount", {
        ethAmount,
        error: err.message,
      });
      return formatErrorResponse(
        `Failed to calculate USDC amount: ${err.message}`,
        500
      );
    }
  }

  // Private helper methods
  _parseEther(amount) {
    if (!amount || isNaN(amount)) throw new Error("Invalid ETH amount");
    return ethers.parseEther(amount.toString());
  }

  _parseUnits(amount, decimals) {
    if (!amount || isNaN(amount)) throw new Error(`Invalid amount`);
    return ethers.parseUnits(amount.toString(), decimals);
  }

  async _verifyUSDCBalance(address, requiredAmount) {
    const balance = await this.usdcContract.balanceOf(address);
    debug("Verifying USDC balance", {
      address,
      required: ethers.formatUnits(requiredAmount, this.decimals.USDC),
      actual: ethers.formatUnits(balance, this.decimals.USDC),
    });
    if (balance < requiredAmount) {
      throw new Error(
        `Insufficient USDC balance: ${ethers.formatUnits(
          balance,
          this.decimals.USDC
        )} available`
      );
    }
  }

  async _verifyETHReserves(usdcAmount) {
    const ethReserve = await this.exchangeManager.getETHBalance();
    const requiredEth = await this._calculateExpectedETH(usdcAmount);
    debug("Verifying ETH reserves", {
      available: ethers.formatEther(ethReserve),
      required: ethers.formatEther(requiredEth),
    });
    if (ethReserve < requiredEth) {
      throw new Error(
        `Insufficient ETH reserves: ${ethers.formatEther(ethReserve)} available`
      );
    }
  }

  async _calculateExpectedETH(usdcAmount) {
    const rate = await this.exchangeManager.usdcToEthRate();
    return (
      (usdcAmount * 10n ** 18n) / (rate * 10n ** BigInt(this.decimals.USDC))
    );
  }

  async _calculateExpectedUSDC(ethAmount) {
    const rate = await this.exchangeManager.usdcToEthRate();
    return (ethAmount * rate * 10n ** BigInt(this.decimals.USDC)) / 10n ** 18n;
  }

  async _getActualETHReceived(address, receipt) {
    const balanceBefore = await this.provider.getBalance(
      address,
      receipt.blockNumber - 1
    );
    const balanceAfter = await this.provider.getBalance(
      address,
      receipt.blockNumber
    );
    return balanceAfter - balanceBefore;
  }
}

const tokenController = new TokenController();

module.exports = {
  buyETHWithUSDC: tokenController.buyETHWithUSDC.bind(tokenController),
  sellETHForUSDC: tokenController.sellETHForUSDC.bind(tokenController),
  exchangeUSDCForDAJU:
    tokenController.exchangeUSDCForDAJU.bind(tokenController),
  exchangeDAJUForUSDC:
    tokenController.exchangeDAJUForUSDC.bind(tokenController),
  calculateETHAmount: tokenController.calculateETHAmount.bind(tokenController),
  calculateUSDCAmount:
    tokenController.calculateUSDCAmount.bind(tokenController),
};
