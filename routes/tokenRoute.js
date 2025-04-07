const express = require("express");
const controller = require("../controller/customToken.controller");
const { validateRequest } = require("../middleware/validation");
const { logRequest } = require("../middleware/logging");

const router = express.Router();

// API Response Formatter
const formatResponse = (success, data = null, error = null, meta = {}) => ({
  success,
  data,
  error: error ? { code: error.code, message: error.message, details: error.details || null } : null,
  meta: {
    timestamp: new Date().toISOString(),
    network: process.env.NETWORK || "development",
    ...meta,
  },
});

// ================== Token Routes ==================

/**
 * @swagger
 * /tokens:
 *   get:
 *     summary: Get token information and contract state
 *     responses:
 *       200:
 *         description: Token information
 *       500:
 *         description: Server error
 */
router.get("/tokens", logRequest, async (req, res) => {
  try {
    const result = await controller.getTokenInfo();
    if (!result.success) {
      throw new Error("Failed to retrieve token info");
    }

    res.status(200).json(formatResponse(true, result.data));
  } catch (error) {
    console.error("[TokenRoute] Fetch error:", error);
    res.status(500).json(
      formatResponse(false, null, {
        code: "TOKEN_FETCH_ERROR",
        message: "Failed to fetch token data",
        ...(process.env.NODE_ENV === "development" && { details: error.message }),
      })
    );
  }
});

// ================== Exchange Routes ==================

/**
 * @swagger
 * /exchange/usdc/eth:
 *   post:
 *     summary: Buy ETH with USDC
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: string
 *                 description: Amount of USDC to exchange
 *     responses:
 *       200:
 *         description: ETH purchase initiated
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Purchase failed
 */
router.post(
  "/exchange/usdc/eth",
  logRequest,
  validateRequest({ amount: { type: "string", required: true } }),
  async (req, res) => {
    try {
      const { amount } = req.body;
      const { txHash } = await controller.buyETHWithUSDC(amount);
      const ethReceived = await controller.calculateETHAmount(amount);

      res.status(200).json(
        formatResponse(true, { txHash, ethReceived }, null, {
          message: "ETH purchase initiated",
        })
      );
    } catch (error) {
      console.error("[ExchangeRoute] USDC to ETH error:", error);
      res.status(500).json(
        formatResponse(false, null, {
          code: "ETH_BUY_ERROR",
          message: "Failed to buy ETH with USDC",
          ...(process.env.NODE_ENV === "development" && { details: error.message }),
        })
      );
    }
  }
);

/**
 * @swagger
 * /exchange/eth/usdc:
 *   post:
 *     summary: Sell ETH for USDC
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: string
 *                 description: Amount of ETH to exchange
 *     responses:
 *       200:
 *         description: ETH sale initiated
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Sale failed
 */
router.post(
  "/exchange/eth/usdc",
  logRequest,
  validateRequest({ amount: { type: "string", required: true } }),
  async (req, res) => {
    try {
      const { amount } = req.body;
      const { txHash } = await controller.sellETHForUSDC(amount);
      const usdcReceived = await controller.calculateUSDCAmount(amount);

      res.status(200).json(
        formatResponse(true, { txHash, usdcReceived }, null, {
          message: "ETH sale initiated",
        })
      );
    } catch (error) {
      console.error("[ExchangeRoute] ETH to USDC error:", error);
      res.status(500).json(
        formatResponse(false, null, {
          code: "ETH_SELL_ERROR",
          message: "Failed to sell ETH for USDC",
          ...(process.env.NODE_ENV === "development" && { details: error.message }),
        })
      );
    }
  }
);

/**
 * @swagger
 * /exchange/supported/eth:
 *   post:
 *     summary: Buy ETH with SupportedToken
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: string
 *                 description: Amount of SupportedToken to exchange
 *     responses:
 *       200:
 *         description: ETH purchase initiated
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Purchase failed
 */
router.post(
  "/exchange/supported/eth",
  logRequest,
  validateRequest({ amount: { type: "string", required: true } }),
  async (req, res) => {
    try {
      const { amount } = req.body;
      const { txHash } = await controller.buyETHWithSupportedToken(amount);
      const ethReceived = await controller.calculateETHFromSupportedToken(amount);

      res.status(200).json(
        formatResponse(true, { txHash, ethReceived }, null, {
          message: "ETH purchase initiated with SupportedToken",
        })
      );
    } catch (error) {
      console.error("[ExchangeRoute] SupportedToken to ETH error:", error);
      res.status(500).json(
        formatResponse(false, null, {
          code: "SUPPORTED_BUY_ERROR",
          message: "Failed to buy ETH with SupportedToken",
          ...(process.env.NODE_ENV === "development" && { details: error.message }),
        })
      );
    }
  }
);

/**
 * @swagger
 * /exchange/eth/supported:
 *   post:
 *     summary: Sell ETH for SupportedToken
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: string
 *                 description: Amount of ETH to exchange
 *     responses:
 *       200:
 *         description: ETH sale initiated
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Sale failed
 */
router.post(
  "/exchange/eth/supported",
  logRequest,
  validateRequest({ amount: { type: "string", required: true } }),
  async (req, res) => {
    try {
      const { amount } = req.body;
      const { txHash } = await controller.sellETHForSupportedToken(amount);
      const supportedReceived = await controller.calculateSupportedTokenFromETH(amount);

      res.status(200).json(
        formatResponse(true, { txHash, supportedReceived }, null, {
          message: "ETH sale initiated for SupportedToken",
        })
      );
    } catch (error) {
      console.error("[ExchangeRoute] ETH to SupportedToken error:", error);
      res.status(500).json(
        formatResponse(false, null, {
          code: "SUPPORTED_SELL_ERROR",
          message: "Failed to sell ETH for SupportedToken",
          ...(process.env.NODE_ENV === "development" && { details: error.message }),
        })
      );
    }
  }
);

/**
 * @swagger
 * /exchange/usdc/daju:
 *   post:
 *     summary: Exchange USDC for DAJU
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: string
 *                 description: Amount of USDC to exchange
 *     responses:
 *       200:
 *         description: Exchange completed
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Exchange failed
 */
router.post(
  "/exchange/usdc/daju",
  logRequest,
  validateRequest({ amount: { type: "string", required: true } }),
  async (req, res) => {
    try {
      const { amount } = req.body;
      const { txHash } = await controller.exchangeUSDCForDAJU(amount);
      const dajuReceived = await controller.calculateDAJUAmount(amount);

      res.status(200).json(
        formatResponse(true, { txHash, dajuReceived }, null, {
          message: "USDC to DAJU exchange initiated",
        })
      );
    } catch (error) {
      console.error("[ExchangeRoute] USDC to DAJU error:", error);
      res.status(500).json(
        formatResponse(false, null, {
          code: "DAJU_BUY_ERROR",
          message: "Failed to exchange USDC for DAJU",
          ...(process.env.NODE_ENV === "development" && { details: error.message }),
        })
      );
    }
  }
);

/**
 * @swagger
 * /exchange/daju/usdc:
 *   post:
 *     summary: Exchange DAJU for USDC
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: string
 *                 description: Amount of DAJU to exchange
 *     responses:
 *       200:
 *         description: Exchange completed
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Exchange failed
 */
router.post(
  "/exchange/daju/usdc",
  logRequest,
  validateRequest({ amount: { type: "string", required: true } }),
  async (req, res) => {
    try {
      const { amount } = req.body;
      const { txHash } = await controller.exchangeDAJUForUSDC(amount);
      const usdcReceived = await controller.calculateUSDCFromDAJU(amount);

      res.status(200).json(
        formatResponse(true, { txHash, usdcReceived }, null, {
          message: "DAJU to USDC exchange initiated",
        })
      );
    } catch (error) {
      console.error("[ExchangeRoute] DAJU to USDC error:", error);
      res.status(500).json(
        formatResponse(false, null, {
          code: "DAJU_SELL_ERROR",
          message: "Failed to exchange DAJU for USDC",
          ...(process.env.NODE_ENV === "development" && { details: error.message }),
        })
      );
    }
  }
);

/**
 * @swagger
 * /exchange/supported/daju:
 *   post:
 *     summary: Exchange SupportedToken for DAJU
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: string
 *                 description: Amount of SupportedToken to exchange
 *     responses:
 *       200:
 *         description: Exchange completed
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Exchange failed
 */
router.post(
  "/exchange/supported/daju",
  logRequest,
  validateRequest({ amount: { type: "string", required: true } }),
  async (req, res) => {
    try {
      const { amount } = req.body;
      const { txHash } = await controller.exchangeSupportedTokenForDAJU(amount);
      const dajuReceived = await controller.calculateDAJUFromSupportedToken(amount);

      res.status(200).json(
        formatResponse(true, { txHash, dajuReceived }, null, {
          message: "SupportedToken to DAJU exchange initiated",
        })
      );
    } catch (error) {
      console.error("[ExchangeRoute] SupportedToken to DAJU error:", error);
      res.status(500).json(
        formatResponse(false, null, {
          code: "DAJU_BUY_SUPPORTED_ERROR",
          message: "Failed to exchange SupportedToken for DAJU",
          ...(process.env.NODE_ENV === "development" && { details: error.message }),
        })
      );
    }
  }
);

/**
 * @swagger
 * /exchange/daju/supported:
 *   post:
 *     summary: Exchange DAJU for SupportedToken
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: string
 *                 description: Amount of DAJU to exchange
 *     responses:
 *       200:
 * Ascynchoronous:
 *       200:
 *         description: Exchange completed
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Exchange failed
 */
router.post(
  "/exchange/daju/supported",
  logRequest,
  validateRequest({ amount: { type: "string", required: true } }),
  async (req, res) => {
    try {
      const { amount } = req.body;
      const { txHash } = await controller.exchangeDAJUForSupportedToken(amount);
      const supportedReceived = await controller.calculateSupportedTokenFromDAJU(amount);

      res.status(200).json(
        formatResponse(true, { txHash, supportedReceived }, null, {
          message: "DAJU to SupportedToken exchange initiated",
        })
      );
    } catch (error) {
      console.error("[ExchangeRoute] DAJU to SupportedToken error:", error);
      res.status(500).json(
        formatResponse(false, null, {
          code: "DAJU_SELL_SUPPORTED_ERROR",
          message: "Failed to exchange DAJU for SupportedToken",
          ...(process.env.NODE_ENV === "development" && { details: error.message }),
        })
      );
    }
  }
);

// ================== Calculation Routes ==================

/**
 * @swagger
 * /calculate/eth:
 *   get:
 *     summary: Calculate ETH output for token input
 *     parameters:
 *       - in: query
 *         name: tokenSymbol
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: amount
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Calculated ETH amount
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Calculation failed
 */
router.get(
  "/calculate/eth",
  logRequest,
  validateRequest(
    {
      tokenSymbol: { type: "string", required: true },
      amount: { type: "string", required: true },
    },
    "query"
  ),
  async (req, res) => {
    try {
      const { tokenSymbol, amount } = req.query;
      let result;
      switch (tokenSymbol.toUpperCase()) {
        case "USDC":
          result = await controller.calculateETHAmount(amount);
          break;
        case "SUPPORTED":
          result = await controller.calculateETHFromSupportedToken(amount);
          break;
        default:
          throw new Error("Unsupported token symbol");
      }

      res.status(200).json(formatResponse(true, { ethAmount: result }));
    } catch (error) {
      console.error("[CalculateRoute] ETH calculation error:", error);
      res.status(400).json(
        formatResponse(false, null, {
          code: "CALCULATION_ERROR",
          message: error.message,
        })
      );
    }
  }
);

/**
 * @swagger
 * /calculate/token:
 *   get:
 *     summary: Calculate token output for ETH input
 *     parameters:
 *       - in: query
 *         name: tokenSymbol
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: amount
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Calculated token amount
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Calculation failed
 */
router.get(
  "/calculate/token",
  logRequest,
  validateRequest(
    {
      tokenSymbol: { type: "string", required: true },
      amount: { type: "string", required: true },
    },
    "query"
  ),
  async (req, res) => {
    try {
      const { tokenSymbol, amount } = req.query;
      let result;
      switch (tokenSymbol.toUpperCase()) {
        case "USDC":
          result = await controller.calculateUSDCAmount(amount);
          break;
        case "SUPPORTED":
          result = await controller.calculateSupportedTokenFromETH(amount);
          break;
        default:
          throw new Error("Unsupported token symbol");
        }

      res.status(200).json(formatResponse(true, { tokenAmount: result }));
    } catch (error) {
      console.error("[CalculateRoute] Token calculation error:", error);
      res.status(400).json(
        formatResponse(false, null, {
          code: "CALCULATION_ERROR",
          message: error.message,
        })
      );
    }
  }
);

// ================== Admin Routes ==================

/**
 * @swagger
 * /admin/rates:
 *   put:
 *     summary: Update exchange rates (admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tokenSymbol:
 *                 type: string
 *               usdcToEthRate:
 *                 type: string
 *               usdcToDajuRate:
 *                 type: string
 *               supportedToEthRate:
 *                 type: string
 *               supportedToDajuRate:
 *                 type: string
 *     responses:
 *       200:
 *         description: Rates updated
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Update failed
 */
router.put(
  "/admin/rates",
  logRequest,
  validateRequest({
    tokenSymbol: { type: "string", required: true },
    usdcToEthRate: { type: "string", required: false },
    usdcToDajuRate: { type: "string", required: false },
    supportedToEthRate: { type: "string", required: false },
    supportedToDajuRate: { type: "string", required: false },
  }),
  async (req, res) => {
    try {
      const { tokenSymbol, usdcToEthRate, usdcToDajuRate, supportedToEthRate, supportedToDajuRate } = req.body;

      if (!usdcToEthRate && !usdcToDajuRate && !supportedToEthRate && !supportedToDajuRate) {
        throw new Error("At least one rate must be provided");
      }

      switch (tokenSymbol.toUpperCase()) {
        case "USDC":
          if (usdcToEthRate) await controller.updateUSDCToETHRate(usdcToEthRate);
          if (usdcToDajuRate) await controller.updateUSDCToDAJURate(usdcToDajuRate);
          break;
        case "SUPPORTED":
          if (supportedToEthRate) await controller.updateSupportedTokenToETHRate(supportedToEthRate);
          if (supportedToDajuRate) await controller.updateSupportedTokenToDAJURate(supportedToDajuRate);
          break;
        default:
          throw new Error("Unsupported token symbol");
      }

      res.status(200).json(
        formatResponse(true, null, null, {
          message: "Exchange rates updated successfully",
        })
      );
    } catch (error) {
      console.error("[AdminRoute] Rate update error:", error);
      res.status(400).json(
        formatResponse(false, null, {
          code: "RATE_UPDATE_ERROR",
          message: error.message,
        })
      );
    }
  }
);

/**
 * @swagger
 * /admin/pause:
 *   post:
 *     summary: Toggle contract pause state (admin only)
 *     responses:
 *       200:
 *         description: Pause state toggled
 *       500:
 *         description: Toggle failed
 */
router.post("/admin/pause", logRequest, async (req, res) => {
  try {
    const { txHash, newState } = await controller.togglePause();

    res.status(200).json(
      formatResponse(true, { newState }, null, {
        message: `Contract ${newState ? "paused" : "unpaused"}`,
        txHash,
      })
    );
  } catch (error) {
    console.error("[AdminRoute] Pause toggle error:", error);
    res.status(500).json(
      formatResponse(false, null, {
        code: "PAUSE_TOGGLE_ERROR",
        message: "Failed to toggle pause state",
        ...(process.env.NODE_ENV === "development" && { details: error.message }),
      })
    );
  }
});

/**
 * @swagger
 * /admin/withdraw:
 *   post:
 *     summary: Withdraw funds from contract (admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tokenSymbol:
 *                 type: string
 *               amount:
 *                 type: string
 *     responses:
 *       200:
 *         description: Withdrawal initiated
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Withdrawal failed
 */
router.post(
  "/admin/withdraw",
  logRequest,
  validateRequest({
    tokenSymbol: { type: "string", required: true },
    amount: { type: "string", required: true },
  }),
  async (req, res) => {
    try {
      const { tokenSymbol, amount } = req.body;
      let txHash;

      switch (tokenSymbol.toUpperCase()) {
        case "ETH":
          ({ txHash } = await controller.withdrawETH(amount));
          break;
        case "USDC":
          ({ txHash } = await controller.withdrawUSDC(amount));
          break;
        case "SUPPORTED":
          ({ txHash } = await controller.withdrawSupportedToken(amount));
          break;
        default:
          throw new Error("Unsupported token symbol");
      }

      res.status(200).json(
        formatResponse(true, { txHash }, null, {
          message: `Withdrawal of ${amount} ${tokenSymbol} initiated`,
        })
      );
    } catch (error) {
      console.error("[AdminRoute] Withdrawal error:", error);
      res.status(400).json(
        formatResponse(false, null, {
          code: "WITHDRAWAL_ERROR",
          message: error.message,
        })
      );
    }
  }
);

module.exports = router;