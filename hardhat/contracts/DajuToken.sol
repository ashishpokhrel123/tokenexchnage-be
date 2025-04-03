// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;



import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";


contract DajuToken is ERC20, Ownable, ERC20Permit, ERC20Burnable, AccessControl, ReentrancyGuard {
    // Roles
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant EXCHANGE_MANAGER_ROLE = keccak256("EXCHANGE_MANAGER_ROLE");

    // Events
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    event ExchangeCompleted(address indexed user, string tokenSymbol, uint256 inputAmount, uint256 outputAmount, bool isBuying);
    event ExchangeRateUpdated(string tokenSymbol, uint256 oldRate, uint256 newRate);
    event TokenSupported(string tokenSymbol, address tokenAddress, uint256 initialRate);
    event PausedStateChanged(bool isPaused);

    // Exchange rate storage (token per 1 DAJU, multiplied by 1e18)
    mapping(string => uint256) public exchangeRates;
    mapping(string => address) public externalTokenAddress;
    mapping(string => uint8) public tokenDecimals;

    // Supported tokens for exchange
    string[] public supportedTokens;

    // Maximum token supply and pause state
    uint256 public immutable CAP;
    bool public paused;

    // Modifiers
    modifier whenNotPaused() {
        require(!paused, "Contract paused");
        _;
    }

    constructor(address initialOwner, uint256 cap) 
        ERC20("DajuToken", "DAJU")
        Ownable(initialOwner)
        ERC20Permit("DajuToken")
    {
        require(cap > 0, "Cap must be greater than zero");
        CAP = cap;

        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(MINTER_ROLE, initialOwner);
        _grantRole(EXCHANGE_MANAGER_ROLE, initialOwner);

        // Initial minting of tokens to the owner (1 million)
        _mint(initialOwner, 1000000 * 10 ** decimals());

        // Set up initial exchange rates and token info
        _addSupportedToken("ETH", address(0), 25 * 10 ** 14, 18);  // 1 DAJU = 0.0025 ETH
        _addSupportedToken("USDC", 0xa131AD247055FD2e2aA8b156A11bdEc81b9eAD95, 12 * 10 ** 17, 6);  // 1 DAJU = 1.20 USDC
    }

    // ===== Token Management Functions =====

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) whenNotPaused {
        require(totalSupply() + amount <= CAP, "DajuToken: cap exceeded");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    function burn(uint256 amount) public override whenNotPaused {
        super.burn(amount);
        emit TokensBurned(msg.sender, amount);
    }

    // ===== Exchange Management Functions =====

    function updateExchangeRate(string memory tokenSymbol, uint256 newRate) 
        public 
        onlyRole(EXCHANGE_MANAGER_ROLE) 
        whenNotPaused 
    {
        require(bytes(tokenSymbol).length > 0, "Invalid token symbol");
        require(newRate > 0, "Rate must be positive");
        require(exchangeRates[tokenSymbol] > 0, "Token not supported");
        
        uint256 oldRate = exchangeRates[tokenSymbol];
        exchangeRates[tokenSymbol] = newRate;
        emit ExchangeRateUpdated(tokenSymbol, oldRate, newRate);
    }

    function addSupportedToken(
        string memory tokenSymbol, 
        address tokenAddress, 
        uint256 initialRate,
        uint8 decimals
    ) public onlyRole(EXCHANGE_MANAGER_ROLE) whenNotPaused {
        _addSupportedToken(tokenSymbol, tokenAddress, initialRate, decimals);
    }

    // New setter function to update token addresses
    function setTokenAddress(string memory tokenSymbol, address tokenAddress) 
        public 
        onlyRole(EXCHANGE_MANAGER_ROLE) 
    {
        externalTokenAddress[tokenSymbol] = tokenAddress;
    }

    function exchange(string memory tokenSymbol, uint256 amount, bool isBuying) 
        public 
        nonReentrant 
        whenNotPaused 
    {
        require(amount > 0, "Amount must be positive");
        uint256 calculatedAmount = calculateExchange(tokenSymbol, amount, isBuying);
        
        if (isBuying) {
            // Buying DAJU with external token
            address tokenAddr = externalTokenAddress[tokenSymbol];
            if (tokenAddr != address(0)) {  // Not ETH
                require(IERC20(tokenAddr).transferFrom(msg.sender, address(this), amount), "Transfer failed");
            }
            _transfer(address(this), msg.sender, calculatedAmount);
        } else {
            // Selling DAJU for external token
            _transfer(msg.sender, address(this), amount);
            address tokenAddr = externalTokenAddress[tokenSymbol];
            if (tokenAddr != address(0)) {  // Not ETH
                require(IERC20(tokenAddr).transfer(msg.sender, calculatedAmount), "Transfer failed");
            }
        }
        
        emit ExchangeCompleted(msg.sender, tokenSymbol, amount, calculatedAmount, isBuying);
    }

    // ===== View Functions =====

    function getSupportedTokensAndRates() 
        public 
        view 
        returns (string[] memory tokens, uint256[] memory rates, address[] memory addresses) 
    {
        uint256 length = supportedTokens.length;
        uint256[] memory tokenRates = new uint256[](length);
        address[] memory tokenAddresses = new address[](length);

        for (uint i = 0; i < length; i++) {
            string memory symbol = supportedTokens[i];
            tokenRates[i] = exchangeRates[symbol];
            tokenAddresses[i] = externalTokenAddress[symbol];
        }

        return (supportedTokens, tokenRates, tokenAddresses);
    }

    function calculateExchange(
        string memory tokenSymbol, 
        uint256 amount, 
        bool isBuying
    ) public view returns (uint256) {
        uint256 rate = exchangeRates[tokenSymbol];
        require(rate > 0, "Unsupported token");
        require(amount > 0, "Amount must be positive");

        uint256 adjustedAmount = adjustDecimals(tokenSymbol, amount, isBuying);
        return isBuying 
            ? (adjustedAmount * 10 ** 18) / rate  // Buying DAJU with token
            : (adjustedAmount * rate) / 10 ** 18; // Selling DAJU for token
    }

    // ===== Admin Functions =====

    function setPaused(bool _paused) public onlyRole(DEFAULT_ADMIN_ROLE) {
        paused = _paused;
        emit PausedStateChanged(_paused);
    }

    // ===== Internal Functions =====

    function _addSupportedToken(
        string memory tokenSymbol,
        address tokenAddress,
        uint256 rate,
        uint8 decimals
    ) internal {
        require(bytes(tokenSymbol).length > 0, "Invalid token symbol");
        require(rate > 0, "Rate must be positive");

        uint256 length = supportedTokens.length;
        for (uint i = 0; i < length; i++) {
            require(
                keccak256(bytes(supportedTokens[i])) != keccak256(bytes(tokenSymbol)),
                "Token already supported"
            );
        }

        supportedTokens.push(tokenSymbol);
        exchangeRates[tokenSymbol] = rate;
        externalTokenAddress[tokenSymbol] = tokenAddress;
        tokenDecimals[tokenSymbol] = decimals;
        emit TokenSupported(tokenSymbol, tokenAddress, rate);
    }

    function adjustDecimals(
        string memory tokenSymbol, 
        uint256 amount,
        bool isBuying
    ) internal view returns (uint256) {
        uint8 externalDecimals = tokenDecimals[tokenSymbol];
        if (isBuying) {
            return externalDecimals < 18 
                ? amount * 10 ** (18 - externalDecimals)
                : amount / 10 ** (externalDecimals - 18);
        } else {
            return externalDecimals < 18 
                ? amount / 10 ** (18 - externalDecimals)
                : amount * 10 ** (externalDecimals - 18);
        }
    }

    // Override required by multiple inheritance
    function _transferOwnership(address newOwner) internal override {
        super._transferOwnership(newOwner);
        _grantRole(DEFAULT_ADMIN_ROLE, newOwner);
    }
}