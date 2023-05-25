const { task } = require("hardhat/config");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
defTime = 33110000;
task("increaseTime", "Increases the time in the local blockchain")
  .addParam("seconds", "The number of seconds to increase the time by", defTime, types.int)
  .setAction(async (taskArgs, { ethers }) => {
    const { seconds } = taskArgs;

    await time.increase(seconds);

    console.log(`Time increased by ${seconds} seconds.`);
  });

task("getBalanceOf", "")
  .addParam("address", "address to check")
  .addParam("contract", "contract address")
  .setAction(async (taskArgs, { ethers }) => {
    const { address, contract } = taskArgs;
    const TokenFactory = await ethers.getContractFactory("WETH");
    const Token = TokenFactory.attach(contract);

    const balance = await Token.balanceOf(address);

    console.log(`Balance of ${address} = ${balance}`);
  });

task("getRoot", "")
  .addParam("address", "owner address check")
  .addParam("contract", "contract address")
  .setAction(async (taskArgs, { ethers }) => {
    const { address, contract } = taskArgs;
    const TokenFactory = await ethers.getContractFactory("SmartTestament");
    const Token = TokenFactory.attach(contract);

    const balance = await Token.testaments[address];

    console.log(`Balance of ${address} =`, balance);
  });
