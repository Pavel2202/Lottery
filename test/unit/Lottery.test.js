const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery", function () {
      let lottery, vrfCoordinatorV2Mock, lotteryEntranceFee, deployer, interval;
      const chainId = network.config.chainId;

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        lottery = await ethers.getContract("Lottery", deployer);
        vrfCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );
        const subscriptionId = lottery.getSubscriptionId();
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, lottery.address);
        lotteryEntranceFee = await lottery.getEntranceFee();
        interval = await lottery.getInterval();
      });

      describe("constructor", function () {
        it("Initializes the lottery correctly", async function () {
          const lotteryState = await lottery.getLotteryState();
          const entranceFee = await lottery.getEntranceFee();

          assert.equal(lotteryState.toString(), "0");
          assert.equal(interval.toString(), networkConfig[chainId]["interval"]);
          assert.equal(
            entranceFee.toString(),
            networkConfig[chainId]["entranceFee"]
          );
        });
      });

      describe("enterLottery", function () {
        it("Reverts when you don't pay enough", async function () {
          await expect(lottery.enterLottery()).to.be.revertedWith(
            "Lottery__NotEnoughETHEntered"
          );
        });

        it("Doesn't allow entrance when lottery is calculating", async function () {
          await lottery.enterLottery({ value: lotteryEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await lottery.performUpkeep([]);

          await expect(
            lottery.enterLottery({ value: lotteryEntranceFee })
          ).to.be.revertedWith("Lottery__NotOpen");
        });

        it("Records players when they enter", async function () {
          await lottery.enterLottery({ value: lotteryEntranceFee });
          const playerFromContract = await lottery.getPlayer(0);
          assert.equal(playerFromContract, deployer);
        });

        it("Emits event on enter", async function () {
          await expect(
            lottery.enterLottery({ value: lotteryEntranceFee })
          ).to.emit(lottery, "LotteryEnter");
        });
      });

      describe("checkUpkeep", function () {
        it("Returns true when all conditions are met", async function () {
          await lottery.enterLottery({ value: lotteryEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);

          const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
          assert(upkeepNeeded);
        });

        it("Returns false when lottery state is not open", async function () {
          await lottery.enterLottery({ value: lotteryEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await lottery.performUpkeep([]);

          const { upkeepNeeded } = await lottery.checkUpkeep([]);
          assert(!upkeepNeeded);
        });

        it("Returns false when interval hasn't passed", async function () {
          await lottery.enterLottery({ value: lotteryEntranceFee });
          const { upkeepNeeded } = await lottery.checkUpkeep([]);
          assert(!upkeepNeeded);
        });

        it("Returns false when there are no players and no ETH in the lottery", async function () {
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await lottery.checkUpkeep([]);
          assert(!upkeepNeeded);
        });
      });

      describe("performUpkeep", function () {
        it("Reverts when checkUpkeep returns false", async function () {
          const { upkeepNeeded } = await lottery.checkUpkeep([]);
          await expect(lottery.performUpkeep([])).to.be.revertedWith(
            "Lottery__UpkeepNotNeeded"
          );
        });

        it("Runs when checkUpkeep returns true", async function () {
          await lottery.enterLottery({ value: lotteryEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);

          const tx = await lottery.performUpkeep("0x");
          assert(tx);
        });

        it("Updates the lottery state and emits a requestId", async function () {
          await lottery.enterLottery({ value: lotteryEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const txResponse = await lottery.performUpkeep("0x");
          const txReceipt = await txResponse.wait(1);
          const lotteryState = await lottery.getLotteryState();
          const requestId = txReceipt.events[1].args.requestId;
          assert(requestId.toNumber() > 0);
          assert(lotteryState == 1);
        });
      });

      describe("fulfillRandomWords", function () {
        beforeEach(async function () {
          await lottery.enterLottery({ value: lotteryEntranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
        });

        it("Can only be called after performUpkeep", async function () {
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(0, lottery.address)
          ).to.be.revertedWith("nonexistent request");
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(1, lottery.address)
          ).to.be.revertedWith("nonexistent request");
        });

        it("Picks a winner, resets the lottery and sends money", async function () {
          const additionalEntrants = 3;
          const startingAccountIndex = 1;
          const accounts = await ethers.getSigners();

          for (
            let i = startingAccountIndex;
            i < startingAccountIndex + additionalEntrants;
            i++
          ) {
            const accountConenctedLottery = lottery.connect(accounts[i]);
            await accountConenctedLottery.enterLottery({
              value: lotteryEntranceFee,
            });
          }

          const startingTimeStamp = await lottery.getLatestTimeStamp();

          await new Promise(async (resolve, reject) => {
            lottery.once("WinnerPicked", async () => {
              try {
                const recentWinner = await lottery.getRecentWinner();
                const lotteryState = await lottery.getLotteryState();
                const endingTimeStamp = await lottery.getLatestTimeStamp();
                const numPlayers = await lottery.getNumberOfPlayers();

                assert.equal(numPlayers.toString(), "0");
                assert.equal(lotteryState.toString(), "0");
                assert(endingTimeStamp > startingTimeStamp);
              } catch (e) {
                reject(e);
              }

              resolve();
            });

            const tx = await lottery.performUpkeep([]);
            const txReceipt = await tx.wait(1);
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txReceipt.events[1].args.requestId,
              lottery.address
            );
          });
        });
      });

      describe("getNumWords", function () {
        it("Returns number of words", async function () {
          const numWords = await lottery.getNumWords();
          assert.equal(numWords, 1);
        });
      });

      describe("getRequestConfirmations", function () {
        it("Returns request confirmations", async function () {
          const requestConfirmations = await lottery.getRequestConfirmations();
          assert.equal(requestConfirmations, 3);
        });
      });
    });
