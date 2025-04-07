// // SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
// import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
// import "@openzeppelin/contracts/access/AccessControl.sol";
// import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
// import "@openzeppelin/contracts/interfaces/IERC20.sol";

// contract DajuToken is
//     ERC20,
//     Ownable,
//     ERC20Permit,
//     ERC20Burnable,
//     AccessControl,
//     ReentrancyGuard
// {
//     bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
//     bytes32 public constant EXCHANGE_MANAGER_ROLE =
//         keccak256("EXCHANGE_MANAGER_ROLE");
//     uint256 public immutable CAP;

//     bool public paused;
//     address public usdcAddress;
//     address public supportedTokenAddress;
//     uint256 public usdcToEthRate; // How many USDC equal 1 ETH (scaled by 10^12)
//     uint256 public usdcToDajuRate; // How many USDC equal 1 DAJU (scaled by 10^12)
//     uint256 public supportedTokenToEthRate; // How many SupportedToken equal 1 ETH
//     uint256 public supportedTokenToDajuRate; // How many SupportedToken equal 1 DAJU
//     uint8 public constant USDC_DECIMALS = 6;
//     uint8 public supportedTokenDecimals;

//     // Events
//     event TokensMinted(address indexed to, uint256 amount);
//     event TokensBurned(address indexed from, uint256 amount);
//     event ExchangeCompleted(
//         address indexed user,
//         string tokenSymbol,
//         uint256 inputAmount,
//         uint256 outputAmount,
//         bool isBuy
//     );
//     event ExchangeRateUpdated(
//         string tokenSymbol,
//         uint256 oldRate,
//         uint256 newRate,
//         bool isETHRate
//     );
//     event PausedStateChanged(bool isPaused);
//     event ETHReceived(address from, uint256 amount);
//     event BuyETHWithUSDC(
//         address indexed user,
//         uint256 usdcAmount,
//         uint256 ethAmount
//     );
//     event SellETHForUSDC(
//         address indexed user,
//         uint256 ethAmount,
//         uint256 usdcAmount
//     );
//     event BuyETHWithSupportedToken(
//         address indexed user,
//         uint256 tokenAmount,
//         uint256 ethAmount
//     );
//     event SellETHForSupportedToken(
//         address indexed user,
//         uint256 ethAmount,
//         uint256 tokenAmount
//     );
//     event USDCDeposited(address indexed from, uint256 amount); // New event for USDC deposits

//     // Custom Errors
//     error ZeroAmount();
//     error InvalidExchangeAmount();
//     error InsufficientTokenBalance();
//     error InsufficientAllowance();
//     error TokenTransferFailed();
//     error InsufficientContractBalance();
//     error InsufficientDajuBalance();
//     error InsufficientTokenReserves(uint256 required, uint256 available);
//     error IncorrectETHAmountSent();
//     error ETHTransferFailed();

//     modifier whenNotPaused() {
//         require(!paused, "Contract paused");
//         _;
//     }

//     constructor(
//         address initialOwner,
//         uint256 cap,
//         address _usdcAddress,
//         uint256 _usdcToEthRate,
//         uint256 _usdcToDajuRate,
//         address _supportedTokenAddress,
//         uint256 _supportedTokenToEthRate,
//         uint256 _supportedTokenToDajuRate,
//         uint8 _supportedTokenDecimals
//     )
//         ERC20("DajuToken", "DAJU")
//         Ownable(initialOwner)
//         ERC20Permit("DajuToken")
//     {
//         require(initialOwner != address(0), "Invalid initial owner");
//         require(cap > 0, "Cap must be greater than zero");
//         require(_usdcAddress != address(0), "Invalid USDC address");
//         require(
//             _supportedTokenAddress != address(0),
//             "Invalid SupportedToken address"
//         );
//         require(
//             _usdcToEthRate > 0 && _usdcToDajuRate > 0,
//             "Invalid USDC rates"
//         );
//         require(
//             _supportedTokenToEthRate > 0 && _supportedTokenToDajuRate > 0,
//             "Invalid SupportedToken rates"
//         );

//         CAP = cap;
//         usdcAddress = _usdcAddress;
//         supportedTokenAddress = _supportedTokenAddress;
//         usdcToEthRate = _usdcToEthRate;
//         usdcToDajuRate = _usdcToDajuRate;
//         supportedTokenToEthRate = _supportedTokenToEthRate;
//         supportedTokenToDajuRate = _supportedTokenToDajuRate;
//         supportedTokenDecimals = _supportedTokenDecimals;

//         _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
//         _grantRole(MINTER_ROLE, initialOwner);
//         _grantRole(EXCHANGE_MANAGER_ROLE, initialOwner);

//         _mint(initialOwner, 1_000_000 * 10 ** decimals());
//     }

//     // ================== USDC Deposit Function ==================

//     function depositUSDC(
//         uint256 usdcAmount
//     ) external nonReentrant whenNotPaused {
//         if (usdcAmount == 0) revert ZeroAmount();

//         IERC20 usdc = IERC20(usdcAddress);
//         if (usdc.balanceOf(msg.sender) < usdcAmount)
//             revert InsufficientTokenBalance();
//         if (usdc.allowance(msg.sender, address(this)) < usdcAmount)
//             revert InsufficientAllowance();

//         if (!usdc.transferFrom(msg.sender, address(this), usdcAmount))
//             revert TokenTransferFailed();

//         emit USDCDeposited(msg.sender, usdcAmount);
//     }

//     // ================== USDC-ETH Exchange Functions ==================

//     function buyETHWithUSDC(
//         uint256 usdcAmount
//     ) external nonReentrant whenNotPaused {
//         if (usdcAmount == 0) revert ZeroAmount();

//         uint256 ethAmount = (usdcAmount * 10 ** 18) /
//             (usdcToEthRate * 10 ** USDC_DECIMALS);

//         IERC20 usdc = IERC20(usdcAddress);
//         if (usdc.balanceOf(msg.sender) < usdcAmount)
//             revert InsufficientTokenBalance();
//         if (usdc.allowance(msg.sender, address(this)) < usdcAmount)
//             revert InsufficientAllowance();

//         if (!usdc.transferFrom(msg.sender, address(this), usdcAmount))
//             revert TokenTransferFailed();
//         if (address(this).balance < ethAmount)
//             revert InsufficientTokenReserves(ethAmount, address(this).balance);

//         (bool sent, ) = msg.sender.call{value: ethAmount}("");
//         if (!sent) revert ETHTransferFailed();

//         emit BuyETHWithUSDC(msg.sender, usdcAmount, ethAmount);
//     }

//     function sellETHForUSDC() external payable nonReentrant whenNotPaused {
//         if (msg.value == 0) revert ZeroAmount();

//         uint256 usdcAmount = _calculateUSDCAmount(msg.value);
//         if (usdcAmount == 0) revert InvalidExchangeAmount();

//         IERC20 usdc = IERC20(usdcAddress);
//         uint256 usdcBalance = usdc.balanceOf(address(this));
//         if (usdcBalance < usdcAmount)
//             revert InsufficientTokenReserves(usdcAmount, usdcBalance);

//         if (!usdc.transfer(msg.sender, usdcAmount))
//             revert TokenTransferFailed();

//         emit SellETHForUSDC(msg.sender, msg.value, usdcAmount);
//     }

//     // ================== SupportedToken-ETH Exchange Functions ==================

//     function buyETHWithSupportedToken(
//         uint256 tokenAmount
//     ) external nonReentrant whenNotPaused {
//         if (tokenAmount == 0) revert ZeroAmount();

//         uint256 ethAmount = (tokenAmount * 10 ** 18) /
//             (supportedTokenToEthRate * 10 ** supportedTokenDecimals);

//         IERC20 supportedToken = IERC20(supportedTokenAddress);
//         if (supportedToken.balanceOf(msg.sender) < tokenAmount)
//             revert InsufficientTokenBalance();
//         if (supportedToken.allowance(msg.sender, address(this)) < tokenAmount)
//             revert InsufficientAllowance();

//         if (
//             !supportedToken.transferFrom(msg.sender, address(this), tokenAmount)
//         ) revert TokenTransferFailed();
//         if (address(this).balance < ethAmount)
//             revert InsufficientTokenReserves(ethAmount, address(this).balance);

//         (bool sent, ) = msg.sender.call{value: ethAmount}("");
//         if (!sent) revert ETHTransferFailed();

//         emit BuyETHWithSupportedToken(msg.sender, tokenAmount, ethAmount);
//     }

//     function sellETHForSupportedToken()
//         external
//         payable
//         nonReentrant
//         whenNotPaused
//     {
//         if (msg.value == 0) revert ZeroAmount();

//         uint256 tokenAmount = (msg.value * supportedTokenToEthRate) /
//             10 ** (18 - supportedTokenDecimals);

//         IERC20 supportedToken = IERC20(supportedTokenAddress);
//         uint256 tokenBalance = supportedToken.balanceOf(address(this));
//         if (tokenBalance < tokenAmount)
//             revert InsufficientTokenReserves(tokenAmount, tokenBalance);

//         if (!supportedToken.transfer(msg.sender, tokenAmount))
//             revert TokenTransferFailed();

//         emit SellETHForSupportedToken(msg.sender, msg.value, tokenAmount);
//     }

//     // ================== USDC-DAJU Exchange Functions ==================

//     function exchangeUSDCForDAJU(
//         uint256 usdcAmount
//     ) external nonReentrant whenNotPaused {
//         if (usdcAmount == 0) revert ZeroAmount();

//         uint256 dajuAmount = (usdcAmount * 10 ** 18) /
//             (usdcToDajuRate * 10 ** USDC_DECIMALS);

//         IERC20 usdc = IERC20(usdcAddress);
//         if (usdc.balanceOf(msg.sender) < usdcAmount)
//             revert InsufficientTokenBalance();
//         if (usdc.allowance(msg.sender, address(this)) < usdcAmount)
//             revert InsufficientAllowance();

//         if (!usdc.transferFrom(msg.sender, address(this), usdcAmount))
//             revert TokenTransferFailed();
//         if (balanceOf(address(this)) < dajuAmount)
//             revert InsufficientContractBalance();

//         _transfer(address(this), msg.sender, dajuAmount);

//         emit ExchangeCompleted(
//             msg.sender,
//             "USDC",
//             usdcAmount,
//             dajuAmount,
//             true
//         );
//     }

//     function exchangeDAJUForUSDC(
//         uint256 dajuAmount
//     ) external nonReentrant whenNotPaused {
//         if (dajuAmount == 0) revert ZeroAmount();

//         uint256 usdcAmount = (dajuAmount * usdcToDajuRate) /
//             10 ** (18 - USDC_DECIMALS);

//         if (balanceOf(msg.sender) < dajuAmount)
//             revert InsufficientDajuBalance();
//         _transfer(msg.sender, address(this), dajuAmount);

//         IERC20 usdc = IERC20(usdcAddress);
//         uint256 usdcBalance = usdc.balanceOf(address(this));
//         if (usdcBalance < usdcAmount)
//             revert InsufficientTokenReserves(usdcAmount, usdcBalance);

//         if (!usdc.transfer(msg.sender, usdcAmount))
//             revert TokenTransferFailed();

//         emit ExchangeCompleted(
//             msg.sender,
//             "USDC",
//             dajuAmount,
//             usdcAmount,
//             false
//         );
//     }

//     // ================== SupportedToken-DAJU Exchange Functions ==================

//     function exchangeSupportedTokenForDAJU(
//         uint256 tokenAmount
//     ) external nonReentrant whenNotPaused {
//         if (tokenAmount == 0) revert ZeroAmount();

//         uint256 dajuAmount = (tokenAmount * 10 ** 18) /
//             (supportedTokenToDajuRate * 10 ** supportedTokenDecimals);

//         IERC20 supportedToken = IERC20(supportedTokenAddress);
//         if (supportedToken.balanceOf(msg.sender) < tokenAmount)
//             revert InsufficientTokenBalance();
//         if (supportedToken.allowance(msg.sender, address(this)) < tokenAmount)
//             revert InsufficientAllowance();

//         if (
//             !supportedToken.transferFrom(msg.sender, address(this), tokenAmount)
//         ) revert TokenTransferFailed();
//         if (balanceOf(address(this)) < dajuAmount)
//             revert InsufficientContractBalance();

//         _transfer(address(this), msg.sender, dajuAmount);

//         emit ExchangeCompleted(
//             msg.sender,
//             "SupportedToken",
//             tokenAmount,
//             dajuAmount,
//             true
//         );
//     }

//     function exchangeDAJUForSupportedToken(
//         uint256 dajuAmount
//     ) external nonReentrant whenNotPaused {
//         if (dajuAmount == 0) revert ZeroAmount();

//         uint256 tokenAmount = (dajuAmount * supportedTokenToDajuRate) /
//             10 ** (18 - supportedTokenDecimals);

//         if (balanceOf(msg.sender) < dajuAmount)
//             revert InsufficientDajuBalance();
//         _transfer(msg.sender, address(this), dajuAmount);

//         IERC20 supportedToken = IERC20(supportedTokenAddress);
//         uint256 tokenBalance = supportedToken.balanceOf(address(this));
//         if (tokenBalance < tokenAmount)
//             revert InsufficientTokenReserves(tokenAmount, tokenBalance);

//         if (!supportedToken.transfer(msg.sender, tokenAmount))
//             revert TokenTransferFailed();

//         emit ExchangeCompleted(
//             msg.sender,
//             "SupportedToken",
//             dajuAmount,
//             tokenAmount,
//             false
//         );
//     }

//     // ================== Admin Functions ==================

//     function updateUSDCToETHRate(
//         uint256 newRate
//     ) external onlyRole(EXCHANGE_MANAGER_ROLE) {
//         if (newRate == 0) revert InvalidExchangeAmount();
//         uint256 oldRate = usdcToEthRate;
//         usdcToEthRate = newRate;
//         emit ExchangeRateUpdated("USDC", oldRate, newRate, true);
//     }

//     function updateUSDCToDAJURate(
//         uint256 newRate
//     ) external onlyRole(EXCHANGE_MANAGER_ROLE) {
//         if (newRate == 0) revert InvalidExchangeAmount();
//         uint256 oldRate = usdcToDajuRate;
//         usdcToDajuRate = newRate;
//         emit ExchangeRateUpdated("USDC", oldRate, newRate, false);
//     }

//     function updateSupportedTokenToETHRate(
//         uint256 newRate
//     ) external onlyRole(EXCHANGE_MANAGER_ROLE) {
//         if (newRate == 0) revert InvalidExchangeAmount();
//         uint256 oldRate = supportedTokenToEthRate;
//         supportedTokenToEthRate = newRate;
//         emit ExchangeRateUpdated("SupportedToken", oldRate, newRate, true);
//     }

//     function updateSupportedTokenToDAJURate(
//         uint256 newRate
//     ) external onlyRole(EXCHANGE_MANAGER_ROLE) {
//         if (newRate == 0) revert InvalidExchangeAmount();
//         uint256 oldRate = supportedTokenToDajuRate;
//         supportedTokenToDajuRate = newRate;
//         emit ExchangeRateUpdated("SupportedToken", oldRate, newRate, false);
//     }

//     function togglePause() external onlyRole(DEFAULT_ADMIN_ROLE) {
//         paused = !paused;
//         emit PausedStateChanged(paused);
//     }

//     function withdrawETH(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
//         (bool success, ) = msg.sender.call{value: amount}("");
//         if (!success) revert ETHTransferFailed();
//     }

//     function withdrawUSDC(
//         uint256 amount
//     ) external onlyRole(DEFAULT_ADMIN_ROLE) {
//         IERC20 usdc = IERC20(usdcAddress);
//         if (!usdc.transfer(msg.sender, amount)) revert TokenTransferFailed();
//     }

//     function withdrawSupportedToken(
//         uint256 amount
//     ) external onlyRole(DEFAULT_ADMIN_ROLE) {
//         IERC20 supportedToken = IERC20(supportedTokenAddress);
//         if (!supportedToken.transfer(msg.sender, amount))
//             revert TokenTransferFailed();
//     }

//     // ================== View Functions ==================

//     function getETHBalance() public view returns (uint256) {
//         return address(this).balance;
//     }

//     function getUSDCBalance() public view returns (uint256) {
//         return IERC20(usdcAddress).balanceOf(address(this));
//     }

//     function getSupportedTokenBalance() public view returns (uint256) {
//         return IERC20(supportedTokenAddress).balanceOf(address(this));
//     }

//     function calculateETHAmount(
//         uint256 usdcAmount
//     ) public view returns (uint256) {
//         return (usdcAmount * 10 ** 18) / (usdcToEthRate * 10 ** USDC_DECIMALS);
//     }

//     function calculateUSDCAmount(
//         uint256 ethAmount
//     ) public view returns (uint256) {
//         return (ethAmount * usdcToEthRate) / 10 ** (18 - USDC_DECIMALS);
//     }

//     function calculateDAJUAmount(
//         uint256 usdcAmount
//     ) public view returns (uint256) {
//         return (usdcAmount * 10 ** 18) / (usdcToDajuRate * 10 ** USDC_DECIMALS);
//     }

//     function calculateUSDCFromDAJU(
//         uint256 dajuAmount
//     ) public view returns (uint256) {
//         return (dajuAmount * usdcToDajuRate) / 10 ** (18 - USDC_DECIMALS);
//     }

//     function calculateETHFromSupportedToken(
//         uint256 tokenAmount
//     ) public view returns (uint256) {
//         return
//             (tokenAmount * 10 ** 18) /
//             (supportedTokenToEthRate * 10 ** supportedTokenDecimals);
//     }

//     function calculateSupportedTokenFromETH(
//         uint256 ethAmount
//     ) public view returns (uint256) {
//         return
//             (ethAmount * supportedTokenToEthRate) /
//             10 ** (18 - supportedTokenDecimals);
//     }

//     function calculateDAJUFromSupportedToken(
//         uint256 tokenAmount
//     ) public view returns (uint256) {
//         return
//             (tokenAmount * 10 ** 18) /
//             (supportedTokenToDajuRate * 10 ** supportedTokenDecimals);
//     }

//     function calculateSupportedTokenFromDAJU(
//         uint256 dajuAmount
//     ) public view returns (uint256) {
//         return
//             (dajuAmount * supportedTokenToDajuRate) /
//             10 ** (18 - supportedTokenDecimals);
//     }

//     // Allow contract to receive ETH
//     receive() external payable {
//         emit ETHReceived(msg.sender, msg.value);
//     }

//     function _calculateUSDCAmount(
//         uint256 ethAmount
//     ) internal view returns (uint256) {
//         return (ethAmount * usdcToEthRate) / 10 ** 12; // 18 - USDC_DECIMALS (6) = 12
//     }

//     function _transferToken(
//         address token,
//         address to,
//         uint256 amount,
//         bytes4 /*reserveErrorSelector*/
//     ) internal {
//         IERC20 tokenContract = IERC20(token);
//         uint256 balance = tokenContract.balanceOf(address(this));
//         if (balance < amount) revert InsufficientTokenReserves(amount, balance);
//         if (!tokenContract.transfer(to, amount)) revert TokenTransferFailed();
//     }
// }



import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract DajuToken is ERC20, Ownable, ERC20Permit, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public immutable CAP;

    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);

    constructor(
        address initialOwner,
        uint256 cap
    )
        ERC20("DajuToken", "DAJU")
        Ownable(initialOwner)
        ERC20Permit("DajuToken")
    {
        require(initialOwner != address(0), "Invalid initial owner");
        require(cap > 0, "Cap must be greater than zero");
        CAP = cap;

        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(MINTER_ROLE, initialOwner);

        _mint(initialOwner, 1_000_000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(totalSupply() + amount <= CAP, "Exceeds cap");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    function burn(uint256 amount) public override {
        super.burn(amount);
        emit TokensBurned(msg.sender, amount);
    }

    function burnFrom(address account, uint256 amount) public override {
        super.burnFrom(account, amount);
        emit TokensBurned(account, amount);
    }
}
