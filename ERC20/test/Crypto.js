const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Crypto and Staking:", () => {
	let owner;
	let addr1;
	let addr2;
	let addr3;
	let addrs;
	let firstCryptoContract;
	let secondCryptoContract;
	let stakingContract;

	before(async () => {
		[owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

		firstCryptoContract = await ethers.deployContract("Crypto");
		secondCryptoContract = await ethers.deployContract("Crypto");
		stakingContract = await ethers.deployContract("Staking");
	});

	describe("Crypto:", () => {
		it("Should assign the total supply of tokens to the owner", async () => {
			let ownerBalance = await firstCryptoContract.balanceOf(owner.address);
			expect(await firstCryptoContract.totalSupply()).to.equal(ownerBalance);

			ownerBalance = await secondCryptoContract.balanceOf(owner.address);
			expect(await secondCryptoContract.totalSupply()).to.equal(ownerBalance);
		});

		it("Should assign owner to white list", async () => {
			const ownerAddress = owner.address;

			expect(await firstCryptoContract.isWhiteList(ownerAddress)).to.equal(
				true
			);
			expect(await secondCryptoContract.isWhiteList(ownerAddress)).to.equal(
				true
			);
		});

		describe("Before in white list:", () => {
			it("Should not receive more than 1 million token", async () => {
				const tokenHolderAddress = addr2.address;
				const amount = 1000000;

				await expect(
					firstCryptoContract.transfer(tokenHolderAddress, amount)
				).to.be.revertedWith("Crypto: Execution reverted!");
				await expect(
					secondCryptoContract.transfer(tokenHolderAddress, amount)
				).to.be.revertedWith("Crypto: Execution reverted!");
			});
		});

		describe("After in white list:", () => {
			before(async () => {
				await firstCryptoContract.setWhiteList(addr2.address);
				await firstCryptoContract.setWhiteList(addr3.address);
				await secondCryptoContract.setWhiteList(addr1.address);
				await secondCryptoContract.setWhiteList(addr2.address);
				await secondCryptoContract.setWhiteList(addr3.address);
			});

			it("Should receive more than 1 million token", async () => {
				const amount = 1000000;

				await firstCryptoContract.transfer(addr2.address, amount);
				await firstCryptoContract.transfer(addr3.address, amount);
				await secondCryptoContract.transfer(addr1.address, amount);
				await secondCryptoContract.transfer(addr2.address, amount);
				await secondCryptoContract.transfer(addr3.address, amount);
			});
		});
	});

	describe("Staking:", () => {
		before(async () => {
			const amount = 100000;

			await firstCryptoContract.approve(stakingContract.target, amount); // 1 pool by owner
			await stakingContract.createPool(firstCryptoContract.target);

			let tx = await secondCryptoContract.connect(addr1);
			await tx.approve(stakingContract.target, amount); // 1 pool by addr1
			tx = await stakingContract.connect(addr1);
			await tx.createPool(secondCryptoContract.target);
		});

		describe("Initialize staking token:", () => {
			it("Should initialize by owner", async () => {
				const tx = await stakingContract.connect(addr2);

				await expect(tx.initialize(0, 10000)).to.be.revertedWith(
					"Staking: you are not the owner!"
				);
				await expect(tx.initialize(1, 10000)).to.be.revertedWith(
					"Staking: you are not the owner!"
				);
			});

			it("Should initialize once time", async () => {
				await stakingContract.initialize(0, 30000);
				await expect(stakingContract.initialize(0, 30000)).to.be.revertedWith(
					"Staking: initialized!"
				);

				const tx = stakingContract.connect(addr1);
				await tx.initialize(1, 10000);
				await expect(tx.initialize(1, 10000)).to.be.revertedWith(
					"Staking: initialized!"
				);
			});
		});

		describe("Staking token:", () => {
			before(async () => {
				let addr2Balance = await firstCryptoContract.balanceOf(addr2.address);
				let tx = await firstCryptoContract.connect(addr2);
				await tx.approve(stakingContract.target, addr2Balance);
				addr2Balance = await secondCryptoContract.balanceOf(addr2.address);
				tx = await secondCryptoContract.connect(addr2);
				await tx.approve(stakingContract.target, addr2Balance);

				let addr3Balance = await firstCryptoContract.balanceOf(addr3.address);
				tx = await firstCryptoContract.connect(addr3);
				await tx.approve(stakingContract.target, addr3Balance);
				addr3Balance = await secondCryptoContract.balanceOf(addr3.address);
				tx = await secondCryptoContract.connect(addr3);
				await tx.approve(stakingContract.target, addr3Balance);
			});

			it("Should not stake token more than current balance!", async () => {
				const amount = 2000000;
				const tx = await stakingContract.connect(addr2);

				await expect(tx.stakeToken(0, amount)).to.be.revertedWith(
					"ERC20: insufficient allowance"
				);
				await expect(tx.stakeToken(1, amount)).to.be.revertedWith(
					"ERC20: insufficient allowance"
				);
			});

			it("Should stake more than one time!", async () => {
				const tx = await stakingContract.connect(addr2);

				await tx.stakeToken(0, 2500);
				await tx.stakeToken(0, 2500);
				await tx.stakeToken(1, 1000);
				await tx.stakeToken(1, 1000);
			});
		});

		describe("Claim token:", () => {
			before(async () => {
				const tx = await stakingContract.connect(addr3);

				await tx.stakeToken(0, 10000);
				await tx.stakeToken(1, 5000);
			});

			it("Should not claim token before 30 days!", async () => {
				const tx = await stakingContract.connect(addr2);

				await expect(tx.claimToken(0)).to.be.revertedWith(
					"Staking: not enough 30 days!"
				);
				await expect(tx.claimToken(1)).to.be.revertedWith(
					"Staking: not enough 30 days!"
				);
			});

			it("Should claim token after 30 days!", async () => {
				const claimTime = (await time.latest()) + 86400 * 31; // time after 30 days
				await time.increaseTo(claimTime);

				let tx = await stakingContract.connect(addr2);
				await tx.claimToken(0);
				await tx.claimToken(1);

				tx = await stakingContract.connect(addr3);
				await tx.claimToken(0);
				await tx.claimToken(1);
			});

			it("Should not stake token after 30 days!", async () => {
				const amount = 1000;
				const tx = await stakingContract.connect(addr2);

				await expect(tx.stakeToken(0, amount)).to.be.revertedWith(
					"Staking: can not stake after 30 days!"
				);
				await expect(tx.stakeToken(1, amount)).to.be.revertedWith(
					"Staking: can not stake after 30 days!"
				);
			});

			it("Should not stake token when pool is empty!", async () => {
				const amount = 1000;

				await expect(
					stakingContract.stakeToken(0, amount)
				).to.be.revertedWith("Staking: nothing to claim after stake!");
			});
		});
	});
});
