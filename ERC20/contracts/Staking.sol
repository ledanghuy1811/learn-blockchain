// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StakingCreator {
    Staking[] private stakes;

    function createStaking(address tokenAddress) public {
        Staking newStake = new Staking(tokenAddress, msg.sender);
        stakes.push(newStake);
    }

    function getStakeByIndex(uint256 index) public view returns (Staking) {
        return Staking(stakes[index]);
    }

    function getOwner(uint256 index) public view returns (address) {
        return stakes[index].owner();
    }
}

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
    bool private isInitialize; // initialize once
    uint256 private stakingContractToken; // pool stake token

    constructor(address tokenAddr, address stakeOwner) Ownable() {
        token = IERC20(tokenAddr); // address of token contract
        transferOwnership(stakeOwner); // address of stake owner
    }

    function initialize() public onlyOwner {
        require(!isInitialize, "Staking: initialized!");

        stakingContractToken = token.allowance(msg.sender, address(this));
        require(
            token.transferFrom(msg.sender, address(this), stakingContractToken),
            "Staking: transfer failed!"
        );
        isInitialize = true;
    }

    function getStakedAmount(address addr) public view returns (uint256) {
        return userStakeInfo[addr].stakeAmount;
    }

    function getTotalStakedToken() public view returns (uint256) {
        return totalStakeAmount;
    }

    function getStakingContractToken() public view returns (uint256) {
        return stakingContractToken;
    }

    function stakeToken(uint256 amount) public {
        if (userStakeInfo[msg.sender].dayStart > 0) {
            require(
                userStakeInfo[msg.sender].dayEnd > block.timestamp,
                "Staking: can not stake after 30 days!"
            );
        } else {
            require(
                token.balanceOf(address(this)) > 0,
                "Staking: nothing to claim after stake!"
            );
        }

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
            stakingContractToken) / totalStakeAmount;
        uint256 totalTokenClaim = userStakeInfo[msg.sender].stakeAmount +
            bonusToken;
        require(
            token.transfer(msg.sender, totalTokenClaim),
            "Staking: claim failed!"
        );
    }
}
