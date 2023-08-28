// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// contract StakingCreator {
//     Staking[] private stakes;

//     function createStaking(address tokenAddress) public {
//         Staking newStake = new Staking(tokenAddress, _msgSender());
//         stakes.push(newStake);
//     }

//     function getStakeByIndex(uint256 index) public view returns (Staking) {
//         return Staking(stakes[index]);
//     }

//     function getOwner(uint256 index) public view returns (address) {
//         return stakes[index].owner();
//     }
// }

contract Staking is Ownable {
    uint256 private constant SECOND_PER_DAY = 86400; // second in a day
    uint256 private count;

    struct StakeInfo {
        uint256 stakeAmount;
        uint256 dayStart;
        uint256 dayEnd;
    }
    struct Pool {
        address poolOwner;
        address tokenAddress;
        mapping(address => StakeInfo) userStakeInfo; // stake amount of each token holder
        uint256 totalStakeAmount; // total stake amount of all token holder
        bool isInitialize; // initialize once
        uint256 stakingContractToken; // pool stake token
    }
    mapping(uint256 => Pool) private pools;

    constructor() Ownable() {}

    function createPool(address tokenAddress) public {
        Pool storage newPool = pools[count];
        newPool.poolOwner = _msgSender();
        newPool.tokenAddress = tokenAddress;
        count++;
    }

    function getPool(uint256 index) public view returns (address) {
        Pool storage pool = pools[index];
        return pool.tokenAddress;
    }

    function initialize(uint256 poolIndex, uint256 amount) public {
        Pool storage pool = pools[poolIndex];
        require(
            _msgSender() == pool.poolOwner,
            "Staking: you are not the owner!"
        );
        require(!pool.isInitialize, "Staking: initialized!");

        uint256 contractAllowance = IERC20(pool.tokenAddress).allowance(
            _msgSender(), address(this)
        );
        require(
            contractAllowance > amount,
            "Staking: allowance must greater than amount!"
        );
        require(
            IERC20(pool.tokenAddress).transferFrom(
                _msgSender(),
                address(this),
                amount
            ),
            "Staking: transfer failed!"
        );
        pool.stakingContractToken = amount;
        pool.isInitialize = true;
    }

    // function getStakedAmount(address addr) public view returns (uint256) {
    //     return userStakeInfo[addr].stakeAmount;
    // }

    // function getTotalStakedToken() public view returns (uint256) {
    //     return totalStakeAmount;
    // }

    // function getStakingContractToken() public view returns (uint256) {
    //     return stakingContractToken;
    // }

    function stakeToken(uint256 poolIndex, uint256 amount) public {
        Pool storage pool = pools[poolIndex];
        if (pool.userStakeInfo[_msgSender()].dayStart > 0) {
            require(
                pool.userStakeInfo[_msgSender()].dayEnd > block.timestamp,
                "Staking: can not stake after 30 days!"
            );
        } else {
            require(
                IERC20(pool.tokenAddress).balanceOf(address(this)) > 0,
                "Staking: nothing to claim after stake!"
            );
        }

        StakeInfo memory stake;
        stake.dayStart = block.timestamp;
        stake.dayEnd = block.timestamp + SECOND_PER_DAY * 30;
        if (pool.userStakeInfo[_msgSender()].dayStart > 0) {
            stake.stakeAmount =
                pool.userStakeInfo[_msgSender()].stakeAmount +
                amount;
        } else {
            stake.stakeAmount = amount;
        }

        require(
            IERC20(pool.tokenAddress).transferFrom(
                _msgSender(),
                address(this),
                amount
            ),
            "Staking: stake failed!"
        );
        pool.userStakeInfo[_msgSender()] = stake;
        pool.totalStakeAmount += amount;
    }

    function claimToken(uint256 poolIndex) public {
        Pool storage pool = pools[poolIndex];
        require(
            pool.userStakeInfo[_msgSender()].dayEnd < block.timestamp,
            "Staking: not enough 30 days!"
        );

        uint256 bonusToken = (pool.userStakeInfo[_msgSender()].stakeAmount *
            pool.stakingContractToken) / pool.totalStakeAmount;
        uint256 totalTokenClaim = pool.userStakeInfo[_msgSender()].stakeAmount +
            bonusToken;
        require(
            IERC20(pool.tokenAddress).transfer(_msgSender(), totalTokenClaim),
            "Staking: claim failed!"
        );
    }
}
