const hre = require("hardhat");
const { makeMerkleTree } = require("../utils/makeMerkleTree");

const approveMax = "115792089237316195423570985008687907853269984665640564039457584007913129639935"; //(2^256 - 1 )
const BASE_POINT = 10000;
const FEE_BP = 100;
const MIN_TESTAMENT_LOCK = 31104000;
const erc20Shares = [1000, 3000, 6000];
const neededVotes = 1;

async function main() {
  const testamentContractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const Testament = await ethers.getContractFactory("SmartTestament");
  const testamentContract = await Testament.attach(testamentContractAddress);
  const signers = await hre.ethers.getSigners();
  const owner = signers[0];
  const heirsWithShares = [
    {
      heirAddress: signers[1].address,
      erc20Share: erc20Shares[0],
    },
    {
      heirAddress: signers[2].address,
      erc20Share: erc20Shares[1],
    },
    {
      heirAddress: signers[3].address,
      erc20Share: erc20Shares[2],
    },
  ];

  const merkleTreeData = await makeMerkleTree(heirsWithShares);
  const { root } = merkleTreeData;

  await testamentContract
    .connect(owner)
    .createTestament(
      MIN_TESTAMENT_LOCK,
      neededVotes,
      [signers[1].address, signers[2].address],
      root
    );
  return { heirsWithShares, merkleTreeData };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
