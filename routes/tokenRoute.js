// routes/index.js
const express = require("express");
const controller = require("../controller/customToken.controller");

const router = express.Router();

router.get("/tokens", async (req, res) => {
  try {
     const tokenData = await controller.fetchSupportedTokens();
    
    // Process token information
    const tokens = await Promise.all(tokenData.supportedTokens.map(async (symbol) => {
      // Get detailed token info from contract
      const tokenInfo = await contract.getTokenInfo(symbol);
      
      return {
        symbol,
        rate: tokenInfo.rate.toString(),
        address: tokenInfo.tokenAddress,
        decimals: tokenInfo.decimals,
        // Add additional metadata if needed
      };
    }));

    res.status(200).json({
      success: true,
      data: {
        tokens,
        count: tokens.length,
        // Add contract metadata
        contractAddress: contract.address,
        network: process.env.NETWORK || 'localhost',
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Token fetch error:", error);

    const errorResponse = {
      success: false,
      error: {
        message: "Failed to fetch token data",
        code: "TOKEN_DATA_ERROR",
        ...(process.env.NODE_ENV === "development" && {
          details: error.message,
          stack: error.stack,
        }),
      },
      timestamp: new Date().toISOString(),
    };

    res.status(error.statusCode || 500).json(errorResponse);
  }
});

router.post("/exchange", async (req, res, next) => {
  try {
    const { tokenSymbol, amount, isBuying } = req.body;
    const user = req.headers["user-address"] || "anonymous";
    console.log(tokenSymbol, amount, isBuying)
    if (!tokenSymbol || !amount ||  isBuying !== true) {
      throw new Error("Missing required parameters");
    }

    await controller.exchange(user, tokenSymbol, amount, isBuying);
    res.json({
      success: true,
      message: "Exchange completed successfully",
    });
  } catch (error) {
    next(error);
  }
});

router.get("/exchange/calculate", async (req, res, next) => {
  try {
    const { tokenSymbol, amount, isBuying } = req.query;

    if (!tokenSymbol || !amount || !isBuying) {
      throw new Error("Missing required query parameters");
    }

    const result = await controller.calculateExchange(
      tokenSymbol,
      BigInt(amount),
      isBuying === "true"
    );
    res.json({
      success: true,
      data: { outputAmount: result.toString() },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/tokens/add", async (req, res, next) => {
  try {
    const { tokenSymbol, tokenAddress, initialRate, decimals } = req.body;
    const user = req.headers["user-address"] || "anonymous";

    if (!tokenSymbol || !tokenAddress || !initialRate || !decimals) {
      throw new Error("Missing required parameters");
    }

    await controller.addSupportedToken(
      user,
      tokenSymbol,
      tokenAddress,
      BigInt(initialRate),
      Number(decimals)
    );
    res.json({
      success: true,
      message: "Token added successfully",
    });
  } catch (error) {
    next(error);
  }
});

router.put("/tokens/rate", async (req, res, next) => {
  try {
    const { tokenSymbol, newRate } = req.body;
    const user = req.headers["user-address"] || "anonymous";

    if (!tokenSymbol || !newRate) {
      throw new Error("Missing required parameters");
    }

    await controller.updateExchangeRate(user, tokenSymbol, BigInt(newRate));
    res.json({
      success: true,
      message: "Exchange rate updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

router.get("/owner", async (req, res, next) => {
  try {
    const owner = await controller.getOwner();
    res.json({
      success: true,
      data: { owner },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
