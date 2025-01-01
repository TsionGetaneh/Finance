const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const Reputation = await hre.ethers.getContractFactory("ReputationSystem");
  const reputation = await Reputation.deploy();
  await reputation.waitForDeployment();
  console.log(`ReputationSystem deployed to: ${await reputation.getAddress()}`);

  const Equb = await hre.ethers.getContractFactory("EqubManager");
  const equb = await Equb.deploy(await reputation.getAddress());
  await equb.waitForDeployment();
  console.log(`EqubManager deployed to: ${await equb.getAddress()}`);

  const Lending = await hre.ethers.getContractFactory("LendingPool");
  const lending = await Lending.deploy(await reputation.getAddress());
  await lending.waitForDeployment();
  console.log(`LendingPool deployed to: ${await lending.getAddress()}`);

  const Gov = await hre.ethers.getContractFactory("Governance");
  const gov = await Gov.deploy(await reputation.getAddress());
  await gov.waitForDeployment();
  console.log(`Governance deployed to: ${await gov.getAddress()}`);

  // Authorize contracts in ReputationSystem
  await reputation.setAuthorizedCaller(await equb.getAddress(), true);
  await reputation.setAuthorizedCaller(await lending.getAddress(), true);
  console.log("Reputation authorizations complete.");

  // Optionally fund the lending pool with some initial ETH
  await deployer.sendTransaction({
    to: await lending.getAddress(),
    value: hre.ethers.parseEther("1.0")
  });
  console.log("Funded LendingPool with 1 ETH");

  console.log("Deployment finished!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
