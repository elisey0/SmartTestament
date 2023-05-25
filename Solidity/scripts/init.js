const helpers = require("@nomicfoundation/hardhat-network-helpers");

async function init() {
  const address = "0xe02E492AFC434Fae22487ef39b96E56613dee632";

  await helpers.setBalance(address, 1000 * 1e18);
}

init()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
