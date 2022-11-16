// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

error Lottery__NotEnoughETHEntered();

contract Lottery {
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;

    event LotteryEnter(address indexed player);

    constructor(uint256 entranceFee) {
        i_entranceFee = entranceFee;
    }

    function enterLottery() public payable {
        if (msg.value < i_entranceFee) {
            revert Lottery__NotEnoughETHEntered();
        }

        s_players.push(payable(msg.sender));
        emit LotteryEnter(msg.sender);
    }

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }
}
