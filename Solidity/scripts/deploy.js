const hre = require("hardhat");

async function main() {
  const [owner] = await hre.ethers.getSigners();

  const Testament = await hre.ethers.getContractFactory("SmartTestament", owner);
  const testament = await Testament.deploy();
  await testament.deployed();
  const network = await ethers.provider.getNetwork();

  if (network.name != "unknown") {
    console.log(`Testament deployed to: ${testament.address} on ${network.name}`);

    console.log("Verifying contract on Etherscan...");
    const WAIT_BLOCK_CONFIRMATIONS = 6;
    await testament.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
    verify(testament.address, []);
  }

  console.log(`Owner: ${owner.address}`);
  console.log(`Testament ${testament.address}`);
}

async function verify(contractAddress, arguments) {
  await run("verify:verify", {
    address: contractAddress,
    constructorArguments: arguments,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
