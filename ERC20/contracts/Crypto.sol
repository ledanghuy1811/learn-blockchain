// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
    Thêm requirement như sau:
        + Thêm 1 list những người (whitelist)
        + với những người thuộc whitelist này thì sẽ được cầm token vượt quá maxHolding
        + owner cũng nằm trong wwhitelist này
        + nếu owner k nằm trong whitelist này  vẫn bị check maxHolding
        
    Staking
        + Chia 70% tokens cho owner và 30% sẽ nằm trong contract
        + Thêm 1 hàm stake(amount) sau khi stake xong thì sẽ bị lock 30 ngày
        + Sau 30 ngày sẽ gọi được hàm claim để thu hồi lại tiền và 1 phần token lợi nhuận nằm trong 30% token này
        + Công thức:
            30% token trong contract là x
            Số token được stake bởi tất cả user là y
            Số tiền nhận thêm được sau 30 ngày sẽ là: (x / y) * (số lượng token stake by user) 
*/

contract Crypto is ERC20 {
    uint256 private constant initialSupply = 100000000;
    uint256 private constant maxHolding = 1000000;

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

    function setWhiteList(address addr) public {
        require(msg.sender == contractOwner, "Error: only contract owner can set whiteList!");
        whiteList[addr] = true;
    }

    function _transfer(address from, address to, uint256 amount) internal override {
        if(!whiteList[to]) {
            require(balanceOf(to) + amount < maxHolding, "Error: Execution reverted!");     // each token holder not in white
                                                                                            // list hold maximum 1000000
        }
        
        ERC20._transfer(from, to, amount);
    } 

    function _mint(address account, uint256 amount) internal override {
        require(msg.sender == contractOwner, "Error: contract owner call this function in constructor!");
        require(!isMinted, "Error: mint fuction is called in constructor!");

        ERC20._mint(account, amount);
    }
}