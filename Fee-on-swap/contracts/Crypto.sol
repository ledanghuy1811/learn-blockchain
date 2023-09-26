// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";

contract Crypto is ERC20 {
    uint256 private constant initialSupply = 100000000;
    uint256 private constant maxHolding = 1000000;
    uint256 private constant FEE_ON_TRANSFER_NUMERATOR = 5;
    uint256 private constant FEE_ON_TRANSFER_DENOMINATOR = 100; // fee on transfer is 5%

    address public immutable factory;
    mapping(address => address) public tokenPairsWith;  // token to pair in swap
    mapping(address => bool) public pairs;              // pair tokens 
    address private feeTo; // address receive fee on transfer
    address private contractOwner; // owner of the contract
    bool private isMinted; // check that mint only once for constructor
    mapping(address => bool) private whiteList; // use mapping for easier check condition

    constructor(address _factory, address _weth) ERC20("Crypto", "CTR") {
        factory = _factory;
        contractOwner = msg.sender;
        whiteList[contractOwner] = true; // add contractOwner to white list
        _mint(contractOwner, initialSupply);    // Because _totalSupply and _balances is private then
                                                // use _mint function to create _totalSupply = initialSupply
                                                // and initiate balance of contractOwner equal _totalSupply
        isMinted = true;
        createPair(address(this), _weth);   // first create pair with WETH
    }

    function createPair(address tokenA, address tokenB) public returns(address pair) {
        pair = IUniswapV2Factory(factory).createPair(tokenA, tokenB);
        address tokenToCreatePairWith = tokenA == address(this) ? tokenB : tokenA;
        tokenPairsWith[tokenToCreatePairWith] = pair;
        pairs[pair] = true;
    }

    function setFeeTo(address _feeTo) public {
        require(
            msg.sender == contractOwner,
            "Crypto: only contract owner can set fee to address!"
        );
        feeTo = _feeTo;
    }

    function setWhiteList(address addr) public {
        require(
            msg.sender == contractOwner,
            "Crypto: only contract owner can set whiteList!"
        );
        whiteList[addr] = true;
    }

    function isWhiteList(address addr) public view returns (bool) {
        return whiteList[addr];
    }

    function isPair(address addr) public view returns (bool) {
        return pairs[addr];
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        if (!isPair(to)) {
            // to is normal address
            if (!whiteList[to]) {
                require(
                    balanceOf(to) + amount < maxHolding,
                    "Crypto: Execution reverted!"
                ); // each token holder not in white
                // list hold maximum 1000000
            }
            ERC20._transfer(from, to, amount);
        } else {
            uint256 _fee = (amount * FEE_ON_TRANSFER_NUMERATOR) /
                FEE_ON_TRANSFER_DENOMINATOR;
            uint256 _amount = amount - _fee;

            if (!whiteList[to]) {
                require(
                    balanceOf(to) + _amount < maxHolding,
                    "Crypto: Execution reverted!"
                ); // each token holder not in white
                // list hold maximum 1000000
            }

            ERC20._transfer(from, to, _amount);
            // ERC20._transfer(from, feeTo, _fee);
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
