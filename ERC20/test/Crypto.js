const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Crypto and Staking:", () => {
	let owner;
	let addr1;
	let addr2;
	let addrs;
	let cryptoContract;
	let stakingContract;
	let stakingToken;

	before(async () => {
		[owner, addr1, addr2, ...addrs] = await ethers.getSigners();

		cryptoContract = await ethers.deployContract("Crypto");
		stakingContract = await ethers.deployContract("Staking", [
			cryptoContract.target,
		]);

		stakingToken =
			((await cryptoContract.totalSupply()) * BigInt(3)) / BigInt(10);

		await cryptoContract.setWhiteList(stakingContract.target);
		await cryptoContract.approve(stakingContract.target, stakingToken);
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
			});

			it("Should receive more than 1 million token", async () => {
				const tokenHolderAddress = addr1.address;
				const amount = 1000000;

				await cryptoContract.transfer(tokenHolderAddress, amount);
				await cryptoContract.transfer(addr2.address, amount);
			});
		});
	});

	describe("Staking:", () => {
		describe("Initialize staking token:", () => {
			it("Should initialize by owner", async () => {
				const tx = await stakingContract.connect(addr1);

				await expect(tx.initialize()).to.be.revertedWith(
					"Ownable: caller is not the owner"
				);
			});

			it("Should initialize once time", async () => {
				await stakingContract.initialize();

				await expect(stakingContract.initialize()).to.be.revertedWith(
					"Staking: initialized!"
				);
			});

			it("Should initialize with 30% of token", async () => {
				const stakingBalance = await cryptoContract.balanceOf(
					stakingContract.target
				);

				expect(stakingBalance).to.equal(stakingToken);
			});
		});

		describe("Staking token:", () => {
			before(async () => {
				const addr1Balance = await cryptoContract.balanceOf(addr1.address);
				const tx = await cryptoContract.connect(addr1);

				await tx.approve(stakingContract.target, addr1Balance);
			});

			it("Should not stake token more than current balance!", async () => {
				const tx = await stakingContract.connect(addr1);
				const amount = 2000000;

				await expect(tx.stakeToken(amount)).to.be.revertedWith(
					"ERC20: insufficient allowance"
				);
			});

			it("Should stake more than one time!", async () => {
				const tx = await stakingContract.connect(addr1);
				const amount = 1000;

				await tx.stakeToken(amount);
				await tx.stakeToken(amount);
			});
		});

		describe("Claim token:", () => {
			before(async () => {
				const addr2Balance = await cryptoContract.balanceOf(addr2.address);
				let tx = await cryptoContract.connect(addr2);
				await tx.approve(stakingContract.target, addr2Balance);

				tx = await stakingContract.connect(addr2);
				await tx.stakeToken(3000);
			});

			it("Should not claim token before 30 days!", async () => {
				const tx = await stakingContract.connect(addr1);

				await expect(tx.claimToken()).to.be.revertedWith(
					"Staking: not enough 30 days!"
				);
			});

			it("Should claim token after 30 days!", async () => {
				const claimTime = (await time.latest()) + 86400 * 31; // time after 30 days
				await time.increaseTo(claimTime);
				const tx = await stakingContract.connect(addr1);

				await tx.claimToken();
			});

			it("Should take bonus after claim token!", async () => {
				const addrBalance = Number(
					await cryptoContract.balanceOf(addr2.address)
				);
				const tokenStaked = Number(
					await stakingContract.getStakedAmount(addr2.address)
				);
				const totalStakeAmount = Number(
					await stakingContract.getTotalStakedToken()
				);
				const stakingContractToken = Number(
					await stakingContract.getStakingContractToken()
				);

				const claimToken =
					addrBalance +
					tokenStaked +
					(tokenStaked * stakingContractToken) / totalStakeAmount;
				const tx = await stakingContract.connect(addr2);
				await tx.claimToken();

				expect(await cryptoContract.balanceOf(addr2.address)).to.equal(
					claimToken
				);
			});
		});
	});

	// describe("lock()", () => {
	//   before(async () => {
	//     let tx = await cryptoContract
	//       .connect(addr1)
	//       .approve(
	//         stakingContract.address,
	//         ethers.utils.parseEther("1000").toString()
	//       );
	//     await tx.wait();

	//     tx = await stakingContract.connect(addr1).lock({
	//       token: cryptoContract.address,
	//       amount: ethers.utils.parseEther("1000").toString(),
	//       startTime: Math.ceil(new Date().getTime() / 1000),
	//       duration: 86400, // one day
	//       owner: addr1.address,
	//     });
	//     await tx.wait();
	//   });

	//   it("Check lock data", async () => {
	//     const nonce = await stakingContract.nonce(addr1.address);
	//     const idx = await stakingContract.getLockIdx(
	//       addr1.address,
	//       parseInt(nonce) - 1
	//     );
	//     const data = await stakingContract.lockData(idx);
	//     expect(data.token).to.be.eq(cryptoContract.address);
	//     expect(data.owner).to.be.eq(addr1.address);
	//     expect(data.amount.toString()).to.be.eq(
	//       ethers.utils.parseEther("1000").toString()
	//     );
	//   });

	//   it("Check can claimable", async () => {
	//     const nonce = await stakingContract.nonce(addr1.address);
	//     const idx = await stakingContract.getLockIdx(
	//       addr1.address,
	//       parseInt(nonce) - 1
	//     );
	//     const data = await stakingContract.isClaimable(idx);
	//     expect(data).to.be.eq(false);
	//   });
	// });

	// describe("unlock()", () => {
	//   before(async () => {
	//     let tx = await cryptoContract
	//       .connect(addr2)
	//       .approve(
	//         stakingContract.address,
	//         ethers.utils.parseEther("1000").toString()
	//       );
	//     await tx.wait();

	//     const blockNumBefore = await ethers.provider.getBlockNumber();
	//     const blockBefore = await ethers.provider.getBlock(blockNumBefore);
	//     const timestamp = blockBefore.timestamp;

	//     tx = await stakingContract.connect(addr2).lock({
	//       token: cryptoContract.address,
	//       amount: ethers.utils.parseEther("1000").toString(),
	//       startTime: timestamp,
	//       duration: 86400, // one day
	//       owner: addr2.address,
	//     });
	//     await tx.wait();

	//     await time.increaseTo(timestamp + 86400);

	//     const nonce = await stakingContract.nonce(addr2.address);
	//     const idx = await stakingContract.getLockIdx(
	//       addr2.address,
	//       parseInt(nonce) - 1
	//     );
	//     tx = await stakingContract.connect(addr2).unlock(idx);
	//   });

	//   it("Check lock data", async () => {
	//     const nonce = await stakingContract.nonce(addr2.address);
	//     const idx = await stakingContract.getLockIdx(
	//       addr2.address,
	//       parseInt(nonce) - 1
	//     );
	//     const data = await stakingContract.lockData(idx);
	//     expect(data.token).to.be.eq(cryptoContract.address);
	//     expect(data.owner).to.be.eq(addr2.address);
	//     expect(data.amount.toString()).to.be.eq(
	//       ethers.utils.parseEther("1000").toString()
	//     );
	//   });

	//   it("Check can claimable", async () => {
	//     const nonce = await stakingContract.nonce(addr2.address);
	//     const idx = await stakingContract.getLockIdx(
	//       addr2.address,
	//       parseInt(nonce) - 1
	//     );
	//     const data = await stakingContract.isClaimable(idx);
	//     expect(data).to.be.eq(true);
	//   });

	//   it("Check balance of unlocker", async () => {
	//     const balance = await cryptoContract.balanceOf(addr2.address);
	//     expect(balance.toString()).to.be.eq(
	//       ethers.utils.parseEther("1000").toString()
	//     );
	//   });
	// });
});
