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
  const [numPlayers, setNumPlayers] = useState("0");
  const [recentWinner, setRecentWinner] = useState("0x");

  const { runContractFunction: enterLottery } = useWeb3Contract({
    abi: abi,
    contractAddress: lotteryAddress,
    functionName: "enterLottery",
    params: {},
    msgValue: entranceFee,
  });

  const { runContractFunction: getEntranceFee } = useWeb3Contract({
    abi: abi,
    contractAddress: lotteryAddress,
    functionName: "getEntranceFee",
    params: {},
  });

  const { runContractFunction: getNumberOfPlayers } = useWeb3Contract({
    abi: abi,
    contractAddress: lotteryAddress,
    functionName: "getNumberOfPlayers",
    params: {},
  });

  const { runContractFunction: getRecentWinner } = useWeb3Contract({
    abi: abi,
    contractAddress: lotteryAddress,
    functionName: "getRecentWinner",
    params: {},
  });

  async function updateUI() {
    const entranceFeeFromCall = (await getEntranceFee()).toString();
    const numberOfPlayersFromCall = (await getNumberOfPlayers()).toString();
    const recentWinnerFromCall = (await getRecentWinner()).toString();
    setEntranceFee(entranceFeeFromCall);
    setNumPlayers(numberOfPlayersFromCall);
    setRecentWinner(recentWinnerFromCall);
  }

  useEffect(() => {
    if (isWeb3Enabled) {
      updateUI();
    }
  }, [isWeb3Enabled]);

  return (
    <div>
      {lotteryAddress ? (
        <div>
          <button
            onClick={async function () {
              await enterLottery();
            }}
          >
            Enter Lottery
          </button>
          Entrance fee: {ethers.utils.formatUnits(entranceFee, "ether")} ETH
          Number of Players: {numPlayers}
          Recent Winner: {recentWinner}
        </div>
      ) : (
        <div>No Lottery address detected.</div>
      )}
    </div>
  );
};

export default LotteryEntrance;
