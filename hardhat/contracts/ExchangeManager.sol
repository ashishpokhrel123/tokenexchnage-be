// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "./DajuToken.sol";

contract ExchangeManager is ReentrancyGuard {
    DajuToken public dajuToken;
    address public usdcAddress;
    address public supportedTokenAddress;
    uint256 public usdcToEthRate; 
    uint256 public usdcToDajuRate; 
    uint256 public supportedTokenToEthRate; 
    uint256 public supportedTokenToDajuRate; 
    uint8 public constant USDC_DECIMALS = 6;
    uint8 public supportedTokenDecimals;
    address public owner;
    bool public paused;

    // Events
    event ExchangeCompleted(
        address indexed user,
        string tokenSymbol,
        uint256 inputAmount,
        uint256 outputAmount,
        bool isBuy
    );
    event ETHReceived(address from, uint256 amount);
    event BuyETHWithUSDC(
        address indexed user,
        uint256 usdcAmount,
        uint256 ethAmount
    );
    event SellETHForUSDC(
        address indexed user,
        uint256 ethAmount,
        uint256 usdcAmount
    );
    event BuyETHWithSupportedToken(
        address indexed user,
        uint256 tokenAmount,
        uint256 ethAmount
    );
    event SellETHForSupportedToken(
        address indexed user,
        uint256 ethAmount,
        uint256 tokenAmount
    );
    event USDCDeposited(address indexed from, uint256 amount);
    event DAJUDeposited(address indexed from, uint256 amount);

    // Custom Errors
    error ZeroAmount();
    error InsufficientTokenBalance();
    error InsufficientAllowance();
    error TokenTransferFailed();
    error InsufficientContractBalance();
    error InsufficientTokenReserves(uint256 required, uint256 available);
    error ETHTransferFailed();
    error InsufficientDajuBalance();

    modifier whenNotPaused() {
        require(!paused, "Contract paused");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(
        address _dajuToken,
        address _usdcAddress,
        uint256 _usdcToEthRate,
        uint256 _usdcToDajuRate,
        address _supportedTokenAddress,
        uint256 _supportedTokenToEthRate,
        uint256 _supportedTokenToDajuRate,
        uint8 _supportedTokenDecimals,
        uint256 initialUsdcDeposit
    ) payable {
        require(_dajuToken != address(0), "Invalid DajuToken address");
        require(_usdcAddress != address(0), "Invalid USDC address");
        require(
            _supportedTokenAddress != address(0),
            "Invalid SupportedToken address"
        );
        require(
            _usdcToEthRate > 0 && _usdcToDajuRate > 0,
            "Invalid USDC rates"
        );
        require(
            _supportedTokenToEthRate > 0 && _supportedTokenToDajuRate > 0,
            "Invalid SupportedToken rates"
        );
        require(msg.value > 0, "Must send ETH during deployment");

        owner = msg.sender;
        dajuToken = DajuToken(_dajuToken);
        usdcAddress = _usdcAddress;
        supportedTokenAddress = _supportedTokenAddress;
        usdcToEthRate = _usdcToEthRate;
        usdcToDajuRate = _usdcToDajuRate;
        supportedTokenToEthRate = _supportedTokenToEthRate;
        supportedTokenToDajuRate = _supportedTokenToDajuRate;
        supportedTokenDecimals = _supportedTokenDecimals;

        // Initial ETH deposit
        emit ETHReceived(msg.sender, msg.value);

        // Initial USDC deposit (if provided)
        if (initialUsdcDeposit > 0) {
            IERC20 usdc = IERC20(usdcAddress);
            require(
                usdc.balanceOf(msg.sender) >= initialUsdcDeposit,
                "Insufficient USDC balance"
            );
            require(
                usdc.allowance(msg.sender, address(this)) >= initialUsdcDeposit,
                "Insufficient USDC allowance"
            );
            if (
                !usdc.transferFrom(
                    msg.sender,
                    address(this),
                    initialUsdcDeposit
                )
            ) revert TokenTransferFailed();
            emit USDCDeposited(msg.sender, initialUsdcDeposit);
        }
    }

    // === Deposit Functions ===
    function depositUSDC(
        uint256 usdcAmount
    ) external nonReentrant whenNotPaused {
        if (usdcAmount == 0) revert ZeroAmount();
        IERC20 usdc = IERC20(usdcAddress);
        if (usdc.balanceOf(msg.sender) < usdcAmount)
            revert InsufficientTokenBalance();
        if (usdc.allowance(msg.sender, address(this)) < usdcAmount)
            revert InsufficientAllowance();
        if (!usdc.transferFrom(msg.sender, address(this), usdcAmount))
            revert TokenTransferFailed();
        emit USDCDeposited(msg.sender, usdcAmount);
    }

    function depositDAJU(
        uint256 dajuAmount
    ) external nonReentrant whenNotPaused {
        if (dajuAmount == 0) revert ZeroAmount();
        if (dajuToken.balanceOf(msg.sender) < dajuAmount)
            revert InsufficientTokenBalance();
        if (dajuToken.allowance(msg.sender, address(this)) < dajuAmount)
            revert InsufficientAllowance();
        if (!dajuToken.transferFrom(msg.sender, address(this), dajuAmount))
            revert TokenTransferFailed();
        emit DAJUDeposited(msg.sender, dajuAmount);
    }

    // === USDC-ETH Exchange ===
    function buyETHWithUSDC(
        uint256 usdcAmount
    ) external nonReentrant whenNotPaused {
        if (usdcAmount == 0) revert ZeroAmount();
        uint256 ethAmount = (usdcAmount * 10 ** 18) /
            (usdcToEthRate * 10 ** USDC_DECIMALS);
        IERC20 usdc = IERC20(usdcAddress);
        if (usdc.balanceOf(msg.sender) < usdcAmount)
            revert InsufficientTokenBalance();
        if (usdc.allowance(msg.sender, address(this)) < usdcAmount)
            revert InsufficientAllowance();
        if (!usdc.transferFrom(msg.sender, address(this), usdcAmount))
            revert TokenTransferFailed();
        if (address(this).balance < ethAmount)
            revert InsufficientTokenReserves(ethAmount, address(this).balance);
        (bool sent, ) = msg.sender.call{value: ethAmount}("");
        if (!sent) revert ETHTransferFailed();
        emit BuyETHWithUSDC(msg.sender, usdcAmount, ethAmount);
    }

    function sellETHForUSDC() external payable nonReentrant whenNotPaused {
        if (msg.value == 0) revert ZeroAmount();
        uint256 usdcAmount = (msg.value * usdcToEthRate) / 10 ** 12;
        IERC20 usdc = IERC20(usdcAddress);
        uint256 usdcBalance = usdc.balanceOf(address(this));
        if (usdcBalance < usdcAmount)
            revert InsufficientTokenReserves(usdcAmount, usdcBalance);
        if (!usdc.transfer(msg.sender, usdcAmount))
            revert TokenTransferFailed();
        emit SellETHForUSDC(msg.sender, msg.value, usdcAmount);
    }

    // === SupportedToken-ETH Exchange ===
    function buyETHWithSupportedToken(
        uint256 tokenAmount
    ) external nonReentrant whenNotPaused {
        if (tokenAmount == 0) revert ZeroAmount();
        uint256 ethAmount = (tokenAmount * 10 ** 18) /
            (supportedTokenToEthRate * 10 ** supportedTokenDecimals);
        IERC20 supportedToken = IERC20(supportedTokenAddress);
        if (supportedToken.balanceOf(msg.sender) < tokenAmount)
            revert InsufficientTokenBalance();
        if (supportedToken.allowance(msg.sender, address(this)) < tokenAmount)
            revert InsufficientAllowance();
        if (
            !supportedToken.transferFrom(msg.sender, address(this), tokenAmount)
        ) revert TokenTransferFailed();
        if (address(this).balance < ethAmount)
            revert InsufficientTokenReserves(ethAmount, address(this).balance);
        (bool sent, ) = msg.sender.call{value: ethAmount}("");
        if (!sent) revert ETHTransferFailed();
        emit BuyETHWithSupportedToken(msg.sender, tokenAmount, ethAmount);
    }

    function sellETHForSupportedToken()
        external
        payable
        nonReentrant
        whenNotPaused
    {
        if (msg.value == 0) revert ZeroAmount();
        uint256 tokenAmount = (msg.value * supportedTokenToEthRate) /
            10 ** (18 - supportedTokenDecimals);
        IERC20 supportedToken = IERC20(supportedTokenAddress);
        uint256 tokenBalance = supportedToken.balanceOf(address(this));
        if (tokenBalance < tokenAmount)
            revert InsufficientTokenReserves(tokenAmount, tokenBalance);
        if (!supportedToken.transfer(msg.sender, tokenAmount))
            revert TokenTransferFailed();
        emit SellETHForSupportedToken(msg.sender, msg.value, tokenAmount);
    }

    // === USDC-DAJU Exchange ===
    function exchangeUSDCForDAJU(
        uint256 usdcAmount
    ) external nonReentrant whenNotPaused {
        if (usdcAmount == 0) revert ZeroAmount();
        uint256 dajuAmount = (usdcAmount * 10 ** 18) /
            (usdcToDajuRate * 10 ** USDC_DECIMALS);
        IERC20 usdc = IERC20(usdcAddress);
        if (usdc.balanceOf(msg.sender) < usdcAmount)
            revert InsufficientTokenBalance();
        if (usdc.allowance(msg.sender, address(this)) < usdcAmount)
            revert InsufficientAllowance();
        if (!usdc.transferFrom(msg.sender, address(this), usdcAmount))
            revert TokenTransferFailed();
        if (dajuToken.balanceOf(address(this)) < dajuAmount)
            revert InsufficientContractBalance();
        if (!dajuToken.transfer(msg.sender, dajuAmount))
            revert TokenTransferFailed();
        emit ExchangeCompleted(
            msg.sender,
            "USDC",
            usdcAmount,
            dajuAmount,
            true
        );
    }

    function exchangeDAJUForUSDC(
        uint256 dajuAmount
    ) external nonReentrant whenNotPaused {
        if (dajuAmount == 0) revert ZeroAmount();
        uint256 usdcAmount = (dajuAmount * usdcToDajuRate) /
            10 ** (18 - USDC_DECIMALS);
        if (dajuToken.balanceOf(msg.sender) < dajuAmount)
            revert InsufficientDajuBalance();
        if (dajuToken.allowance(msg.sender, address(this)) < dajuAmount)
            revert InsufficientAllowance();
        if (!dajuToken.transferFrom(msg.sender, address(this), dajuAmount))
            revert TokenTransferFailed();
        IERC20 usdc = IERC20(usdcAddress);
        uint256 usdcBalance = usdc.balanceOf(address(this));
        if (usdcBalance < usdcAmount)
            revert InsufficientTokenReserves(usdcAmount, usdcBalance);
        if (!usdc.transfer(msg.sender, usdcAmount))
            revert TokenTransferFailed();
        emit ExchangeCompleted(
            msg.sender,
            "USDC",
            dajuAmount,
            usdcAmount,
            false
        );
    }

    // === SupportedToken-DAJU Exchange ===
    function exchangeSupportedTokenForDAJU(
        uint256 tokenAmount
    ) external nonReentrant whenNotPaused {
        if (tokenAmount == 0) revert ZeroAmount();
        uint256 dajuAmount = (tokenAmount * 10 ** 18) /
            (supportedTokenToDajuRate * 10 ** supportedTokenDecimals);
        IERC20 supportedToken = IERC20(supportedTokenAddress);
        if (supportedToken.balanceOf(msg.sender) < tokenAmount)
            revert InsufficientTokenBalance();
        if (supportedToken.allowance(msg.sender, address(this)) < tokenAmount)
            revert InsufficientAllowance();
        if (
            !supportedToken.transferFrom(msg.sender, address(this), tokenAmount)
        ) revert TokenTransferFailed();
        if (dajuToken.balanceOf(address(this)) < dajuAmount)
            revert InsufficientContractBalance();
        if (!dajuToken.transfer(msg.sender, dajuAmount))
            revert TokenTransferFailed();
        emit ExchangeCompleted(
            msg.sender,
            "SupportedToken",
            tokenAmount,
            dajuAmount,
            true
        );
    }

    function exchangeDAJUForSupportedToken(
        uint256 dajuAmount
    ) external nonReentrant whenNotPaused {
        if (dajuAmount == 0) revert ZeroAmount();
        uint256 tokenAmount = (dajuAmount * supportedTokenToDajuRate) /
            10 ** (18 - supportedTokenDecimals);
        if (dajuToken.balanceOf(msg.sender) < dajuAmount)
            revert InsufficientDajuBalance();
        if (dajuToken.allowance(msg.sender, address(this)) < dajuAmount)
            revert InsufficientAllowance();
        if (!dajuToken.transferFrom(msg.sender, address(this), dajuAmount))
            revert TokenTransferFailed();
        IERC20 supportedToken = IERC20(supportedTokenAddress);
        uint256 tokenBalance = supportedToken.balanceOf(address(this));
        if (tokenBalance < tokenAmount)
            revert InsufficientTokenReserves(tokenAmount, tokenBalance);
        if (!supportedToken.transfer(msg.sender, tokenAmount))
            revert TokenTransferFailed();
        emit ExchangeCompleted(
            msg.sender,
            "SupportedToken",
            dajuAmount,
            tokenAmount,
            false
        );
    }

    // === Admin Functions ===
    function updateRates(
        uint256 _usdcToEthRate,
        uint256 _usdcToDajuRate,
        uint256 _supportedTokenToEthRate,
        uint256 _supportedTokenToDajuRate
    ) external onlyOwner {
        require(
            _usdcToEthRate > 0 && _usdcToDajuRate > 0,
            "Invalid USDC rates"
        );
        require(
            _supportedTokenToEthRate > 0 && _supportedTokenToDajuRate > 0,
            "Invalid SupportedToken rates"
        );
        usdcToEthRate = _usdcToEthRate;
        usdcToDajuRate = _usdcToDajuRate;
        supportedTokenToEthRate = _supportedTokenToEthRate;
        supportedTokenToDajuRate = _supportedTokenToDajuRate;
    }

    function togglePause() external onlyOwner {
        paused = !paused;
    }

    function withdrawETH(uint256 amount) external onlyOwner {
        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert ETHTransferFailed();
    }

    function withdrawUSDC(uint256 amount) external onlyOwner {
        IERC20 usdc = IERC20(usdcAddress);
        if (!usdc.transfer(msg.sender, amount)) revert TokenTransferFailed();
    }

    function withdrawDAJU(uint256 amount) external onlyOwner {
        if (!dajuToken.transfer(msg.sender, amount))
            revert TokenTransferFailed();
    }

    function withdrawSupportedToken(uint256 amount) external onlyOwner {
        IERC20 supportedToken = IERC20(supportedTokenAddress);
        if (!supportedToken.transfer(msg.sender, amount))
            revert TokenTransferFailed();
    }

    // === View Functions ===
    function getUSDCBalance() external view returns (uint256) {
        return IERC20(usdcAddress).balanceOf(address(this));
    }

    function getETHBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getSupportedTokenBalance() external view returns (uint256) {
        return IERC20(supportedTokenAddress).balanceOf(address(this));
    }

    function getDajuBalance() external view returns (uint256) {
        return dajuToken.balanceOf(address(this));
    }

    // Allow contract to receive ETH
    receive() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }
}
