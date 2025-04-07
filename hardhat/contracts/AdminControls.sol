// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.28;

// import "@openzeppelin/contracts/access/AccessControl.sol";
// import "@openzeppelin/contracts/interfaces/IERC20.sol";
// import "./ExchangeManager.sol";

// contract AdminControls is AccessControl {
//     bytes32 public constant EXCHANGE_MANAGER_ROLE =
//         keccak256("EXCHANGE_MANAGER_ROLE");
//     ExchangeManager public exchangeManager;
//     address public usdcAddress;
//     address public supportedTokenAddress;

//     event ExchangeRateUpdated(
//         string tokenSymbol,
//         uint256 oldRate,
//         uint256 newRate,
//         bool isETHRate
//     );
//     event PausedStateChanged(bool isPaused);
//     event ETHTransferFailed();

//     constructor(
//         address payable _exchangeManager,
//         address _usdcAddress,
//         address _supportedTokenAddress,
//         address initialOwner
//     ) {
//         require(
//             _exchangeManager != address(0),
//             "Invalid ExchangeManager address"
//         );
//         require(initialOwner != address(0), "Invalid initial owner");
//         exchangeManager = ExchangeManager(_exchangeManager);
//         usdcAddress = _usdcAddress;
//         supportedTokenAddress = _supportedTokenAddress;

//         _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
//         _grantRole(EXCHANGE_MANAGER_ROLE, initialOwner);
//     }

//     function updateUSDCToETHRate(
//         uint256 newRate
//     ) external onlyRole(EXCHANGE_MANAGER_ROLE) {
//         require(newRate > 0, "Invalid rate");
//         uint256 oldRate = exchangeManager.usdcToEthRate();
//         // exchangeManager.setUsdcToEthRate(newRate); // Call setter
//         emit ExchangeRateUpdated("USDC", oldRate, newRate, true);
//     }

//     function updateUSDCToDAJURate(
//         uint256 newRate
//     ) external onlyRole(EXCHANGE_MANAGER_ROLE) {
//         require(newRate > 0, "Invalid rate");
//         uint256 oldRate = exchangeManager.usdcToDajuRate();
//         // exchangeManager.setUsdcToDajuRate(newRate); // Call setter
//         emit ExchangeRateUpdated("USDC", oldRate, newRate, false);
//     }

//     function updateSupportedTokenToETHRate(
//         uint256 newRate
//     ) external onlyRole(EXCHANGE_MANAGER_ROLE) {
//         require(newRate > 0, "Invalid rate");
//         uint256 oldRate = exchangeManager.supportedTokenToEthRate();
//         // exchangeManager.setSupportedTokenToEthRate(newRate); // Call setter
//         emit ExchangeRateUpdated("SupportedToken", oldRate, newRate, true);
//     }

//     function updateSupportedTokenToDAJURate(
//         uint256 newRate
//     ) external onlyRole(EXCHANGE_MANAGER_ROLE) {
//         require(newRate > 0, "Invalid rate");
//         uint256 oldRate = exchangeManager.supportedTokenToDajuRate();
//         // exchangeManager.setSupportedTokenToDajuRate(newRate); // Call setter
//         emit ExchangeRateUpdated("SupportedToken", oldRate, newRate, false);
//     }

//     function togglePause() external onlyRole(DEFAULT_ADMIN_ROLE) {
//         bool newPausedState = !exchangeManager.paused();
//         exchangeManager.setPaused(newPausedState); // Call setter
//         emit PausedStateChanged(newPausedState);
//     }

//     function withdrawETH(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
//         (bool success, ) = msg.sender.call{value: amount}("");
//         if (!success) revert ETHTransferFailed();
//     }

//     function withdrawUSDC(
//         uint256 amount
//     ) external onlyRole(DEFAULT_ADMIN_ROLE) {
//         IERC20 usdc = IERC20(usdcAddress);
//         if (!usdc.transfer(msg.sender, amount)) revert("Token transfer failed");
//     }

//     function withdrawSupportedToken(
//         uint256 amount
//     ) external onlyRole(DEFAULT_ADMIN_ROLE) {
//         IERC20 supportedToken = IERC20(supportedTokenAddress);
//         if (!supportedToken.transfer(msg.sender, amount))
//             revert("Token transfer failed");
//     }
// }
