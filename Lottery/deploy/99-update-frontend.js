const { ethers, network } = require("hardhat");
const fs = require("fs");

const FRONTEND_ADDRESSES_FILE =
  "../lottery-ui/constants/contractAddresses.json";
const FRONTEND_ABI_FILE = "../lottery-ui/constants/abi.json";

module.exports = async function () {
  if (process.env.UPDATE_FRONTEND) {
    updateContractAddresses();
    updateAbi();
  }
};

async function updateContractAddresses() {
  const lottery = await ethers.getContract("Lottery");
  const chainId = network.config.chainId.toString();
  const currentAddresses = JSON.parse(
    fs.readFileSync(FRONTEND_ADDRESSES_FILE, "utf8")
  );
  if (chainId in currentAddresses) {
    if (!currentAddresses[chainId].includes(lottery.address)) {
      currentAddresses[chainId].push(lottery.address);
    }
  }

  {
    currentAddresses[chainId] = lottery.address;
  }

  fs.writeFileSync(FRONTEND_ADDRESSES_FILE, JSON.stringify(currentAddresses));
}

async function updateAbi() {
  const lottery = await ethers.getContract("Lottery");
  fs.writeFileSync(
    FRONTEND_ABI_FILE,
    lottery.interface.format(ethers.utils.FormatTypes.json)
  );
}

module.exports.tags = ["all", "frontend"];
