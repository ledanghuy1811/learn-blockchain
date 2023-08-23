const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Crypto and Staking:", () => {
	let owner;
	let addr1;
	let addr2;
	let addr3;
	let addrs;
	let cryptoContract;
	let stakingCreatorContract;
	let ownerStakingContract;
	let addr1StakingContract;
	let ownerStakingToken;
	let addr1StakingToken;

	before(async () => {
		[owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

		cryptoContract = await ethers.deployContract("Crypto");
		stakingCreatorContract = await ethers.deployContract("StakingCreator");
	});

	describe("Crypto:", () => {
		it("Should assign the total supply of tokens to the owner", async () => {
			const ownerBalance = await cryptoContract.balanceOf(owner.address);

			expect(await cryptoContract.totalSupply()).to.equal(ownerBalance);
		});

		it("Should assign owner to white list", async () => {
			const ownerAddress = owner.address;

			expect(await cryptoContract.isWhiteList(ownerAddress)).to.equal(true);
		});

		describe("Before in white list:", () => {
			it("Should not receive more than 1 million token", async () => {
				const tokenHolderAddress = addr1.address;
				const amount = 1000000;

				await expect(
					cryptoContract.transfer(tokenHolderAddress, amount)
				).to.be.revertedWith("Crypto: Execution reverted!");
			});
		});

		describe("After in white list:", () => {
			before(async () => {
				await cryptoContract.setWhiteList(addr1.address);
				await cryptoContract.setWhiteList(addr2.address);
				await cryptoContract.setWhiteList(addr3.address);
			});

			it("Should receive more than 1 million token", async () => {
				const amount = 1000000;

				await cryptoContract.transfer(addr1.address, amount);
				await cryptoContract.transfer(addr2.address, amount);
				await cryptoContract.transfer(addr3.address, amount);
			});
		});
	});

	describe("Staking:", () => {
		before(async () => {
			await stakingCreatorContract.createStaking(cryptoContract.target); // 1 pool by owner
			let addr = await stakingCreatorContract.getStakeByIndex(0);
			ownerStakingContract = await ethers.getContractAt("Staking", addr);
			ownerStakingToken =
				((await cryptoContract.balanceOf(owner.address)) * BigInt(3)) /
				BigInt(10);
			await cryptoContract.setWhiteList(ownerStakingContract.target);
			await cryptoContract.approve(
				ownerStakingContract.target,
				ownerStakingToken
			);

			let tx = await stakingCreatorContract.connect(addr1);
			await tx.createStaking(cryptoContract.target); // 1 pool by addr1
			addr = await tx.getStakeByIndex(1);
			addr1StakingContract = await ethers.getContractAt("Staking", addr);
			tx = await cryptoContract.connect(addr1);
			addr1StakingToken =
				((await tx.balanceOf(addr1.address)) * BigInt(3)) / BigInt(10);
			await tx.approve(addr1StakingContract.target, addr1StakingToken);
		});

		describe("Initialize staking token:", () => {
			it("Should initialize by owner", async () => {
				const tx1 = await ownerStakingContract.connect(addr2);
				const tx2 = await addr1StakingContract.connect(addr2);

				await expect(tx1.initialize()).to.be.revertedWith(
					"Ownable: caller is not the owner"
				);
				await expect(tx2.initialize()).to.be.revertedWith(
					"Ownable: caller is not the owner"
				);
			});

			it("Should initialize once time", async () => {
				const tx = addr1StakingContract.connect(addr1);
				await ownerStakingContract.initialize();
				await tx.initialize();

				await expect(ownerStakingContract.initialize()).to.be.revertedWith(
					"Staking: initialized!"
				);
				await expect(tx.initialize()).to.be.revertedWith(
					"Staking: initialized!"
				);
			});

			it("Should initialize with 30% of token", async () => {
				const ownerStakingBalance = await cryptoContract.balanceOf(
					ownerStakingContract.target
				);
				const addr1StakingBalance = await cryptoContract.balanceOf(
					addr1StakingContract.target
				);

				expect(ownerStakingBalance).to.equal(ownerStakingToken);
				expect(addr1StakingBalance).to.equal(addr1StakingToken);
			});
		});

		describe("Staking token:", () => {
			before(async () => {
				const addr2Balance = await cryptoContract.balanceOf(addr2.address);
				let tx = await cryptoContract.connect(addr2);
				await tx.approve(ownerStakingContract.target, addr2Balance);
				await tx.approve(addr1StakingContract.target, addr2Balance);

				const addr3Balance = await cryptoContract.balanceOf(addr3.address);
				tx = await cryptoContract.connect(addr3);
				await tx.approve(ownerStakingContract.target, addr3Balance);
				await tx.approve(addr1StakingContract.target, addr3Balance);
			});

			it("Should not stake token more than current balance!", async () => {
				const amount = 2000000;

				let tx = await ownerStakingContract.connect(addr2);
				await expect(tx.stakeToken(amount)).to.be.revertedWith(
					"ERC20: insufficient allowance"
				);

				tx = await addr1StakingContract.connect(addr2);
				await expect(tx.stakeToken(amount)).to.be.revertedWith(
					"ERC20: insufficient allowance"
				);
			});

			it("Should stake more than one time!", async () => {
				const amount = 1000;

				let tx = await ownerStakingContract.connect(addr2);
				await tx.stakeToken(amount);
				await tx.stakeToken(amount);

				tx = await addr1StakingContract.connect(addr2);
				await tx.stakeToken(amount);
				await tx.stakeToken(amount);
			});
		});

		describe("Claim token:", () => {
			before(async () => {
				let tx = await ownerStakingContract.connect(addr3);
				await tx.stakeToken(3000);

				tx = await addr1StakingContract.connect(addr3);
				await tx.stakeToken(3000);
			});

			it("Should not claim token before 30 days!", async () => {
				let tx = await ownerStakingContract.connect(addr2);
				await expect(tx.claimToken()).to.be.revertedWith(
					"Staking: not enough 30 days!"
				);

				tx = await addr1StakingContract.connect(addr2);
				await expect(tx.claimToken()).to.be.revertedWith(
					"Staking: not enough 30 days!"
				);
			});

			it("Should claim token after 30 days!", async () => {
				const claimTime = (await time.latest()) + 86400 * 31; // time after 30 days
				await time.increaseTo(claimTime);

				let tx = await ownerStakingContract.connect(addr2);
				await tx.claimToken();

				tx = await addr1StakingContract.connect(addr2);
				await tx.claimToken();
			});

			it("Should take bonus after claim token!", async () => {
				let addrBalance = await cryptoContract.balanceOf(addr2.address);
				let tokenStaked = await ownerStakingContract.getStakedAmount(
					addr2.address
				);
				let totalStakeAmount = await ownerStakingContract.getTotalStakedToken();
				let stakingContractToken =
					await ownerStakingContract.getStakingContractToken();
				let claimToken =
					addrBalance +
					tokenStaked +
					(tokenStaked * stakingContractToken) / totalStakeAmount;

				let tx = await ownerStakingContract.connect(addr2);
				await tx.claimToken();
				expect(await cryptoContract.balanceOf(addr2.address)).to.equal(
					claimToken
				);

				addrBalance = await cryptoContract.balanceOf(addr3.address);
				tokenStaked = await addr1StakingContract.getStakedAmount(addr3.address);
				totalStakeAmount = await addr1StakingContract.getTotalStakedToken();
				stakingContractToken =
					await addr1StakingContract.getStakingContractToken();
				claimToken =
					addrBalance +
					tokenStaked +
					(tokenStaked * stakingContractToken) / totalStakeAmount;

				tx = await addr1StakingContract.connect(addr3);
				await tx.claimToken();
				expect(await cryptoContract.balanceOf(addr3.address)).to.equal(
					claimToken
				);
			});

			it("Should not stake token after 30 days!", async () => {
				const amount = 1000;

				let tx = await ownerStakingContract.connect(addr2);
				await expect(tx.stakeToken(amount)).to.be.revertedWith(
					"Staking: can not stake after 30 days!"
				);

				tx = await addr1StakingContract.connect(addr2);
				await expect(tx.stakeToken(amount)).to.be.revertedWith(
					"Staking: can not stake after 30 days!"
				);
			});

			it("Should not stake token when pool is empty!", async () => {
				const amount = 1000;

				await expect(
					addr1StakingContract.stakeToken(amount)
				).to.be.revertedWith("Staking: nothing to claim after stake!");
			});
		});
	});
});
