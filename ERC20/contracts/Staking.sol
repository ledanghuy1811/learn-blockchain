// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Staking is Ownable {
    uint256 private constant secondPerDay = 86400; // second in a day
    IERC20 private token;

    struct StakeInfo {
        uint256 stakeAmount;
        uint256 dayStart;
        uint256 dayEnd;
    }
    mapping(address => StakeInfo) private userStakeInfo; // stake amount of each token holder
    uint256 private totalStakeAmount; // total stake amount of all token holder
    bool private isInitialize;

    constructor(address tokenAddr) Ownable() {
        token = IERC20(tokenAddr); // address of token contract
    }

    function initialize() public {
        require(!isInitialize, "Staking: initialized!");
        _checkOwner(); // check owner

        uint256 tokenForStake = (token.totalSupply() * 3) / 10;
        require(
            token.transferFrom(msg.sender, address(this), tokenForStake),
            "Staking: transfer failed!"
        );
        isInitialize = true;
    }

    function stakeToken(uint256 amount) public {
        StakeInfo memory stake;
        stake.dayStart = block.timestamp;
        stake.dayEnd = block.timestamp + secondPerDay * 30;
        if (userStakeInfo[msg.sender].dayStart > 0) {
            stake.stakeAmount = userStakeInfo[msg.sender].stakeAmount + amount;
        } else {
            stake.stakeAmount = amount;
        }

        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Staking: stake failed!"
        );
        userStakeInfo[msg.sender] = stake;
        totalStakeAmount += amount;
    }

    function claimToken() public {
        require(
            userStakeInfo[msg.sender].dayEnd < block.timestamp,
            "Staking: not enough 30 days!"
        );

        uint256 bonusToken = (userStakeInfo[msg.sender].stakeAmount *
            token.allowance(owner(), address(this))) / totalStakeAmount;
        uint256 totalTokenClaim = userStakeInfo[msg.sender].stakeAmount +
            bonusToken;
        require(
            token.transfer(msg.sender, totalTokenClaim),
            "Staking: claim failed!"
        );

        totalStakeAmount -= userStakeInfo[msg.sender].stakeAmount; // decrease amount staked
        // reset user stake info
        userStakeInfo[msg.sender].stakeAmount = 0;
        userStakeInfo[msg.sender].dayStart = 0;
        userStakeInfo[msg.sender].dayEnd = 0;
    }
}
