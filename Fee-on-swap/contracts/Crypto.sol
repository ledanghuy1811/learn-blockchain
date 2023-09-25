// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Crypto is ERC20 {
    uint256 private constant initialSupply = 100000000;
    uint256 private constant maxHolding = 1000000;
    uint256 private constant FEE_ON_TRANSFER_NUMERATOR = 5;
    uint256 private constant FEE_ON_TRANSFER_DENOMINATOR = 100;     // fee on transfer is 5%

    address private feeTo;              // address receive fee on transfer
    address private contractOwner;      // owner of the contract
    bool private isMinted;              // check that mint only once for constructor
    mapping(address => bool) private whiteList;     // use mapping for easier check condition

    constructor() ERC20("Crypto", "CTR") {
        contractOwner = msg.sender;
        whiteList[contractOwner] = true;        // add contractOwner to white list
        _mint(contractOwner, initialSupply);    // Because _totalSupply and _balances is private then
                                                // use _mint function to create _totalSupply = initialSupply
                                                // and initiate balance of contractOwner equal _totalSupply
        isMinted = true;
    }

    function setFeeTo(address _feeTo) public {
        require(msg.sender == contractOwner, "Crypto: only contract owner can set fee to address!");
        feeTo = _feeTo;
    }

    function setWhiteList(address addr) public {
        require(msg.sender == contractOwner, "Crypto: only contract owner can set whiteList!");
        whiteList[addr] = true;
    }

    function isWhiteList(address addr) public view returns (bool) {
        return whiteList[addr];
    } 

    function _transfer(address from, address to, uint256 amount) internal override {
        uint256 _fee = amount * FEE_ON_TRANSFER_NUMERATOR / FEE_ON_TRANSFER_DENOMINATOR;
        uint256 _amount = amount - _fee;

        if(!whiteList[to]) {
            require(balanceOf(to) + _amount < maxHolding, "Crypto: Execution reverted!");     // each token holder not in white
                                                                                            // list hold maximum 1000000
        }
        
        ERC20._transfer(from, to, _amount);
        ERC20._transfer(from, feeTo, _fee);
    } 

    function _mint(address account, uint256 amount) internal override {
        require(msg.sender == contractOwner, "Crypto: contract owner call this function in constructor!");
        require(!isMinted, "Crypto: mint fuction is called in constructor!");

        ERC20._mint(account, amount);
    }
}