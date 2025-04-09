const express = require("express");
const controller = require("../controller/customToken.controller");
const { validateRequest } = require("../middleware/validation");
const { logRequest } = require("../middleware/logging");

const router = express.Router();

// Error Handler Middleware
const handleAsyncRoute = (routeName) => async (req, res) => {
  try {
    const handler = async () => {
      switch (routeName) {
        // Token Routes
        case "getTokenInfo":
          return await controller.getTokenInfo();

        // Exchange Routes
        case "buyETHWithUSDC": {
          const { amount } = req.body;
          return await controller.buyETHWithUSDC(amount);
        }
        case "sellETHForUSDC": {
          const { amount } = req.body;
          return await controller.sellETHForUSDC(amount);
        }
        case "exchangeUSDCForDAJU": {
          const { amount } = req.body;
          return await controller.exchangeUSDCForDAJU(amount);
        }
        case "exchangeDAJUForUSDC": {
          const { amount } = req.body;
          return await controller.exchangeDAJUForUSDC(amount);
        }
        // Add other routes as needed when controller methods are implemented
        default:
          throw new Error("Route not implemented");
      }
    };

    const result = await handler();
    if (result.status === "error") {
      return res.status(result.statusCode || 500).json(result);
    }
    res.status(200).json(result);
  } catch (error) {
    console.error(`[${routeName}] Error:`, error);
    res.status(500).json({
      status: "error",
      message: `Internal server error: ${error.message}`,
      statusCode: 500,
    });
  }
};

// ================== Token Routes ==================
router.get("/tokens", logRequest, handleAsyncRoute("getTokenInfo"));

// ================== Exchange Routes ==================
router.post(
  "/exchange/usdc/eth",
  logRequest,
  validateRequest({ amount: { type: "string", required: true } }),
  handleAsyncRoute("buyETHWithUSDC")
);

router.post(
  "/exchange/eth/usdc",
  logRequest,
  validateRequest({ amount: { type: "string", required: true } }),
  handleAsyncRoute("sellETHForUSDC")
);

router.post(
  "/exchange/usdc/daju",
  logRequest,
  validateRequest({ amount: { type: "string", required: true } }),
  handleAsyncRoute("exchangeUSDCForDAJU")
);

router.post(
  "/exchange/daju/usdc",
  logRequest,
  validateRequest({ amount: { type: "string", required: true } }),
  handleAsyncRoute("exchangeDAJUForUSDC")
);

// Note: The following routes are commented out as they reference controller methods
// that aren't implemented in the provided TokenController:
/*
router.post(
  "/exchange/supported/eth",
  logRequest,
  validateRequest({ amount: { type: "string", required: true } }),
  handleAsyncRoute("buyETHWithSupportedToken")
);

router.post(
  "/exchange/eth/supported",
  logRequest,
  validateRequest({ amount: { type: "string", required: true } }),
  handleAsyncRoute("sellETHForSupportedToken")
);

router.post(
  "/exchange/supported/daju",
  logRequest,
  validateRequest({ amount: { type: "string", required: true } }),
  handleAsyncRoute("exchangeSupportedTokenForDAJU")
);

router.post(
  "/exchange/daju/supported",
  logRequest,
  validateRequest({ amount: { type: "string", required: true } }),
  handleAsyncRoute("exchangeDAJUForSupportedToken")
);

// ================== Calculation Routes ==================
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
  handleAsyncRoute("calculateETH")
);

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
  handleAsyncRoute("calculateToken")
);

// ================== Admin Routes ==================
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
  handleAsyncRoute("updateRates")
);

router.post("/admin/pause", logRequest, handleAsyncRoute("togglePause"));

router.post(
  "/admin/withdraw",
  logRequest,
  validateRequest({
    tokenSymbol: { type: "string", required: true },
    amount: { type: "string", required: true },
  }),
  handleAsyncRoute("withdraw")
);
*/

module.exports = router;