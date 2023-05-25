const hre = require("hardhat");

async function main() {
  const [owner] = await hre.ethers.getSigners();

  const network = await ethers.provider.getNetwork();
  const Weth = await hre.ethers.getContractFactory("WETH", owner);
  const weth = await Weth.deploy("WETH Token", "WETH");
  await weth.deployed();

  const usdt = await Weth.deploy("USDT Token", "USDT");
  await usdt.deployed();

  const token = await Weth.deploy("Random Token", "TKN");
  await token.deployed();

  if (network.name != "unknown") {
    console.log(`Token deployed to: ${weth.address} on ${network.name}`);

    console.log("Verifying contract on Etherscan...");
    const WAIT_BLOCK_CONFIRMATIONS = 6;
    await weth.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
    verify(weth.address, ["WETH Token", "WETH"]);
  }

  console.log(`Owner: ${owner.address}`);
  console.log(`Weth: ${weth.address}`);
  console.log(`USDT: ${usdt.address}`);
  console.log(`TKN: ${token.address}`);
}

async function verify(contractAddress, arguments) {
  await run("verify:verify", {
    address: contractAddress,
    constructorArguments: arguments,
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
