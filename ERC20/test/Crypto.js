const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Crypto", () => {
  let owner;
  let addr1;
  let addr2;
  let addrs;
  let mockERC20;
  let lockContract;

  before(async () => {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    let mockFactory = await ethers.getContractFactory("MockERC20");
    mockERC20 = await mockFactory.deploy();

    let tx = await mockERC20
      .connect(addr1)
      .mint(ethers.utils.parseEther("1000").toString());

    await tx.wait();

    tx = await mockERC20
      .connect(addr2)
      .mint(ethers.utils.parseEther("1000").toString());
    await tx.wait();

    let lockFactory = await ethers.getContractFactory("Lock");
    lockContract = await lockFactory.deploy();
  });

  describe("lock()", () => {
    before(async () => {
      let tx = await mockERC20
        .connect(addr1)
        .approve(
          lockContract.address,
          ethers.utils.parseEther("1000").toString()
        );
      await tx.wait();

      tx = await lockContract.connect(addr1).lock({
        token: mockERC20.address,
        amount: ethers.utils.parseEther("1000").toString(),
        startTime: Math.ceil(new Date().getTime() / 1000),
        duration: 86400, // one day
        owner: addr1.address,
      });

      await tx.wait();
    });

    it("Check lock data", async () => {
      const nonce = await lockContract.nonce(addr1.address);
      const idx = await lockContract.getLockIdx(
        addr1.address,
        parseInt(nonce) - 1
      );
      const data = await lockContract.lockData(idx);
      expect(data.token).to.be.eq(mockERC20.address);
      expect(data.owner).to.be.eq(addr1.address);
      expect(data.amount.toString()).to.be.eq(
        ethers.utils.parseEther("1000").toString()
      );
    });

    it("Check can claimable", async () => {
      const nonce = await lockContract.nonce(addr1.address);
      const idx = await lockContract.getLockIdx(
        addr1.address,
        parseInt(nonce) - 1
      );
      const data = await lockContract.isClaimable(idx);
      expect(data).to.be.eq(false);
    });
  });

  describe("unlock()", () => {
    before(async () => {
      let tx = await mockERC20
        .connect(addr2)
        .approve(
          lockContract.address,
          ethers.utils.parseEther("1000").toString()
        );
      await tx.wait();

      const blockNumBefore = await ethers.provider.getBlockNumber();
      const blockBefore = await ethers.provider.getBlock(blockNumBefore);
      const timestamp = blockBefore.timestamp;

      tx = await lockContract.connect(addr2).lock({
        token: mockERC20.address,
        amount: ethers.utils.parseEther("1000").toString(),
        startTime: timestamp,
        duration: 86400, // one day
        owner: addr2.address,
      });

      await tx.wait();

      await time.increaseTo(timestamp + 86400);

      const nonce = await lockContract.nonce(addr2.address);
      const idx = await lockContract.getLockIdx(
        addr2.address,
        parseInt(nonce) - 1
      );
      tx = await lockContract.connect(addr2).unlock(idx);
    });

    it("Check lock data", async () => {
      const nonce = await lockContract.nonce(addr2.address);
      const idx = await lockContract.getLockIdx(
        addr2.address,
        parseInt(nonce) - 1
      );
      const data = await lockContract.lockData(idx);
      expect(data.token).to.be.eq(mockERC20.address);
      expect(data.owner).to.be.eq(addr2.address);
      expect(data.amount.toString()).to.be.eq(
        ethers.utils.parseEther("1000").toString()
      );
    });

    it("Check can claimable", async () => {
      const nonce = await lockContract.nonce(addr2.address);
      const idx = await lockContract.getLockIdx(
        addr2.address,
        parseInt(nonce) - 1
      );
      const data = await lockContract.isClaimable(idx);
      expect(data).to.be.eq(true);
    });

    it("Check balance of unlocker", async () => {
      const balance = await mockERC20.balanceOf(addr2.address);
      expect(balance.toString()).to.be.eq(
        ethers.utils.parseEther("1000").toString()
      );
    });
  });
});