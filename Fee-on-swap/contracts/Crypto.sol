// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract Crypto is ERC20 {
    uint256 private constant INITIAL_SUPPLY = 100000000;
    uint256 private constant MAX_WALLET_SIZE = 1000000;
    uint256 private constant MAX_TRANSACTION_AMOUNT = 45000;
    uint256 private constant FEE_ON_BUY_NUMERATOR = 5;
    uint256 private constant FEE_ON_SOLD_NUMERATOR = 3;
    uint256 private constant FEE_ON_TRANSFER_DENOMINATOR = 100; // fee on transfer is 5%

    address public immutable router;
    mapping(address => address) public tokenPairsWith; // token to pair in swap
    mapping(address => bool) public pairs; // pair tokens
    address private feeTo; // address receive fee on transfer
    address private contractOwner; // owner of the contract
    bool private isMinted; // check that mint only once for constructor
    mapping(address => bool) private whiteList; // use mapping for easier check condition
    mapping(address => bool) private removeLimitList; // use mapping for easier check condition
    mapping(address => bool) private whiteListFee;  // use for free add liquidity and remove liquidity

    constructor(address _router) ERC20("Crypto", "CTR") {
        router = _router;
        contractOwner = msg.sender;
        whiteList[contractOwner] = true; // add contractOwner to white list
        whiteListFee[contractOwner] = true;
        whiteList[router] = true; // add router to white list
        _mint(contractOwner, INITIAL_SUPPLY);   // Because _totalSupply and _balances is private then 
                                                // use _mint function to create _totalSupply = INITIAL_SUPPLY
                                                // and initiate balance of contractOwner equal _totalSupply
        isMinted = true;
        createPair(address(this), IUniswapV2Router02(router).WETH()); // first create pair with WETH
    }

    modifier onlyOwner() {
        require(
            msg.sender == contractOwner,
            "Crypto: only contract owner can do this"
        );
        _;
    }

    function createPair(
        address tokenA,
        address tokenB
    ) public onlyOwner returns (address pair) {
        address factory = IUniswapV2Router02(router).factory();
        pair = IUniswapV2Factory(factory).createPair(tokenA, tokenB);
        address tokenToCreatePairWith = tokenA == address(this)
            ? tokenB
            : tokenA;
        tokenPairsWith[tokenToCreatePairWith] = pair;
        pairs[pair] = true;
        setWhiteList(pair);
    }

    function removeLimit(address addr) public onlyOwner {
        require(
            !isRemoveLimit(addr),
            "Crypto: address has been removed limit!"
        );
        removeLimitList[addr] = true;
    }

    function setFeeTo(address _feeTo) public onlyOwner {
        feeTo = _feeTo;
    }

    function setWhiteList(address addr) public onlyOwner {
        whiteList[addr] = true;
    }

    function setWhiteListFee(address addr) public onlyOwner {
        whiteListFee[addr] = true;
    }

    function isWhiteList(address addr) public view returns (bool) {
        return whiteList[addr];
    }

    function isPair(address addr) public view returns (bool) {
        return pairs[addr];
    }

    function isRemoveLimit(address addr) public view returns (bool) {
        return removeLimitList[addr];
    }

    function isWhiteListFee(address addr) public view returns (bool) {
        return whiteListFee[addr];
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        uint256 _fee;
        if (isPair(to) && !isWhiteListFee(to)) {
            _fee = (amount * FEE_ON_BUY_NUMERATOR) /
                FEE_ON_TRANSFER_DENOMINATOR;
        } else if (isPair(from) && !isWhiteListFee(to)) {
            _fee = (amount * FEE_ON_SOLD_NUMERATOR) /
                FEE_ON_TRANSFER_DENOMINATOR;
        } else {
            _fee = 0;
        }
        uint256 _amount = amount - _fee;

        if (!isWhiteList(to) && !isRemoveLimit(to)) {
            require(
                balanceOf(to) + _amount < MAX_WALLET_SIZE,
                "Crypto: Execution reverted!"
            ); // each token holder not in white list hold maximum 1000000
            require(
                _amount < MAX_TRANSACTION_AMOUNT,
                "Crypto: amount exceed max transaction amount!"
            );
        }
        ERC20._transfer(from, to, _amount);
        if(feeTo == address(0)) {
            ERC20._burn(from, _fee);
        } else {
            ERC20._transfer(from, feeTo, _fee);
        }
    }

    function _mint(address account, uint256 amount) internal override {
        require(
            msg.sender == contractOwner,
            "Crypto: contract owner call this function in constructor!"
        );
        require(!isMinted, "Crypto: mint fuction is called in constructor!");

        ERC20._mint(account, amount);
    }
}
