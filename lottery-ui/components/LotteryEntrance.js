import { contractAddresses, abi } from "../constants";
import { useWeb3Contract, useMoralis } from "react-moralis";
import { useState, useEffect } from "react";
import { ethers } from "ethers";

const LotteryEntrance = () => {
  const { chainId: chainIdHex, isWeb3Enabled } = useMoralis();
  const chainId = parseInt(chainIdHex);
  const lotteryAddress =
    chainId in contractAddresses ? contractAddresses[chainId] : null;
  const [entranceFee, setEntranceFee] = useState("0");

  const { runContractFunction: enterLottery } = useWeb3Contract({
    abi: abi,
    contractAddress: lotteryAddress,
    functionName: "enterLottery",
    params: {},
    msgValue: 1,
  });

  const { runContractFunction: getEntranceFee } = useWeb3Contract({
    abi: abi,
    contractAddress: lotteryAddress,
    functionName: "getEntranceFee",
    params: {},
  });

  async function updateUI() {
    const entranceFeeFromCall = (await getEntranceFee()).toString();
    setEntranceFee(ethers.utils.formatUnits(entranceFeeFromCall, "ether"));
  }

  useEffect(() => {
    if (isWeb3Enabled) {
      updateUI();
    }
  }, [isWeb3Enabled]);

  return (<div>Entrance fee: {entranceFee} ETH</div>);
};

export default LotteryEntrance;
