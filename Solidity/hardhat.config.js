require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("@openzeppelin/hardhat-upgrades");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();
require("./tasks/tasks");

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const BNBT_RPC_URL = process.env.BNBT_RPC_URL;
const BNBTSCAN_API_KEY = process.env.BNBTSCAN_API_KEY;
const MUMBAI_RPC_URL = process.env.MUMBAI_RPC_URL;
const MUMBAI_API_KEY = process.env.MUMBAI_API_KEY;
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const SEPOLIA_API_KEY = process.env.SEPOLIA_API_KEY;
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY;
const REPORT_GAS = process.env.REPORT_GAS;
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    bnbt: {
      url: BNBT_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 97,
    },
    mumbai: {
      url: MUMBAI_RPC_URL,
      accounts: [PRIVATE_KEY],
      gasPrice: 35000000000,
      saveDeployments: true,
      chainId: 80001,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
    },
    hardhat: {
      chainId: 1337,
    },
  },
  gasReporter: {
    enabled: REPORT_GAS ? true : false,
    noColors: true,
    outputFile: "gas-report.txt",
    currency: "USD",
    coinmarketcap: COINMARKETCAP_API_KEY,
    //token: "BNB",
    showTimeSpent: true,
    showMethodSig: true,
  },

  etherscan: {
    apiKey: {
      bscTestnet: BNBTSCAN_API_KEY,
      polygonMumbai: MUMBAI_API_KEY,
      sepolia: SEPOLIA_API_KEY,
    },
  },
};
