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

	before(async () => {
		[owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

		cryptoContract = await ethers.deployContract(
			"Crypto",
			["0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f"]
		);
		await cryptoContract.setFeeTo(addr3.address);
	});

	describe("Crypto:", () => {
		it("Should assign the total supply of tokens to the owner", async () => {
			let ownerBalance = await cryptoContract.balanceOf(owner.address);
			expect(await cryptoContract.totalSupply()).to.equal(ownerBalance);
		});

		it("Should assign owner to white list", async () => {
			const ownerAddress = owner.address;

			expect(await cryptoContract.isWhiteList(ownerAddress)).to.equal(true);
		});

		describe("Before in white list:", () => {
			it("Should not receive more than 1 million token", async () => {
				const tokenHolderAddress = addr2.address;
				const amount = 1000000;

				await expect(
					cryptoContract.transfer(tokenHolderAddress, amount)
				).to.be.revertedWith("Crypto: Execution reverted!");
			});
		});

		// describe("After in white list:", () => {
		// 	before(async () => {
		// 		await cryptoContract.setWhiteList(addr1.address);
		// 		await cryptoContract.setWhiteList(addr2.address);
		// 		await cryptoContract.setWhiteList(addr3.address);
		// 	});

		// 	it("Should receive more than 1 million token", async () => {
		// 		const amount = 2000000;

		// 		await cryptoContract.transfer(addr1.address, amount);
		// 	});

		// 	it("Should send fee to feeTo address", async () => {
		// 		const amount = 2000000;
		// 		const fee = (amount * 5) / 100;
		// 		const realAmount = amount - fee;

		// 		expect(await cryptoContract.balanceOf(addr1.address)).to.equal(amount);
		// 		expect(await cryptoContract.balanceOf(addr3.address)).to.equal(0);
		// 	});
		// });
	});
});
