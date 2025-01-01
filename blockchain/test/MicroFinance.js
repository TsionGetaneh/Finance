const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MicroFinance DApp", function () {
  let ReputationSystem, EqubManager, LendingPool, Governance;
  let reputation, equb, lending, gov;
  let owner, user1, user2, user3;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    const Reputation = await ethers.getContractFactory("ReputationSystem");
    reputation = await Reputation.deploy();

    const Equb = await ethers.getContractFactory("EqubManager");
    equb = await Equb.deploy(reputation.getAddress());

    const Lending = await ethers.getContractFactory("LendingPool");
    lending = await Lending.deploy(reputation.getAddress());

    const Gov = await ethers.getContractFactory("Governance");
    gov = await Gov.deploy(reputation.getAddress());

    // Authorize Equb and Lending in ReputationSystem
    await reputation.setAuthorizedCaller(equb.getAddress(), true);
    await reputation.setAuthorizedCaller(lending.getAddress(), true);

    // Fund the lending pool
    await owner.sendTransaction({
      to: lending.getAddress(),
      value: ethers.parseEther("5")
    });
  });

  describe("Equb", function () {
    it("Should allow creating and joining a group", async function () {
      await equb.connect(user1).createGroup("Daily Savings", ethers.parseEther("0.1"), 86400, 3);
      const group = await equb.groups(0);
      expect(group.name).to.equal("Daily Savings");
      
      await equb.connect(user2).joinGroup(0);
      const members = await equb.getMembers(0);
      expect(members.length).to.equal(2);
    });

    it("Should execute payout after all members contribute", async function () {
      const contribution = ethers.parseEther("0.1");
      await equb.connect(user1).createGroup("Fast Equb", contribution, 86400, 2);
      await equb.connect(user2).joinGroup(0);

      const initialBalance = await ethers.provider.getBalance(user1.address);
      
      await equb.connect(user1).contribute(0, { value: contribution });
      await equb.connect(user2).contribute(0, { value: contribution });

      const finalBalance = await ethers.provider.getBalance(user1.address);
      const group = await equb.groups(0);
      
      expect(group.currentCycle).to.equal(1);
      // user1 was the first in payout order, should have received 0.2 ETH (minus gas for contribution)
      expect(finalBalance).to.be.gt(initialBalance);
    });
  });

  describe("Lending", function () {
    it("Should handle loan requests and approvals", async function () {
      // Need 600 reputation for user1
      for (let i = 0; i < 10; i++) {
        await reputation.recordContribution(user1.address, true);
      }
      
      const score = await reputation.getReputationScore(user1.address);
      expect(score).to.be.at.least(600);

      const loanAmount = ethers.parseEther("0.5");
      await lending.connect(user1).requestLoan(loanAmount, 604800, [user2.address, user3.address]);
      
      await lending.connect(user2).approveLoan(0);
      const initialBalance = await ethers.provider.getBalance(user1.address);
      await lending.connect(user3).approveLoan(0);

      const loan = await lending.loans(0);
      expect(loan.approvals).to.equal(2);
      
      const finalBalance = await ethers.provider.getBalance(user1.address);
      expect(finalBalance - initialBalance).to.be.closeTo(loanAmount, ethers.parseEther("0.01"));
    });
  });
});
