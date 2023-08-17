require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: ".env" });

const QUICKNODE_HTTP_URL = process.env.QUICKNODE_HTTP_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.18",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    hardhat: {
      chainId: 1337,
      mining: {
        auto: true,
        interval: 5000,
      },
      allowUnlimitedContractSize: true,
    },
    goerli: {
      url: "https://eth-goerli.public.blastapi.io",
      chainId: 5,
      accounts: [PRIVATE_KEY],
      gas: 3000000,
      gasPrice: 3000000000,
    },
    ethereum: {
      url: "https://rpc.mevblocker.io",
      chainId: 1,
      accounts: [PRIVATE_KEY],
    },
    bscscan: {
      url: "https://bsc-dataseed.binance.org",
      chainId: 56,
      accounts: [PRIVATE_KEY],
    },
    zkEvmTestnet: {
      url: "https://rpc.public.zkevm-test.net",
      chainId: 1442,
      accounts: [PRIVATE_KEY],
    },
    zkEvmMainnet: {
      url: "https://zkevm-rpc.com",
      chainId: 1101,
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: "J2AQP4WTSWP4P1ENKSX7IKYG2JSRJJFZ4S",
    customChains: [
      {
        network: "zkEvmTestnet",
        chainId: 1442,
        urls: {
          apiURL: "https://api-testnet-zkevm.polygonscan.com/api",
          browserURL: "https://testnet-zkevm.polygonscan.com",
        },
      },
      {
        network: "zkEvmMainnet",
        chainId: 1101,
        urls: {
          apiURL: "https://api-zkevm.polygonscan.com/api",
          browserURL: "https://zkevm.polygonscan.com",
        },
      },
    ],
  },
};
