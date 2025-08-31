// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOmokVault {
    struct Epoch {
        uint256 startTimestamp;
        uint256 endTimestamp;
        uint256 totalDeposit;
        uint256 totalWithdraw;
    }

    function DEPOSIT_AMOUNT() external view returns (uint256);
    function currentEpochId() external view returns (uint256);
    function nextEpochId() external view returns (uint256);
    function epochs(uint256 epochId) external view returns (Epoch memory);
    function epochUserDeposit(uint256 epochId, address user) external view returns (uint256);
    function lastClaimed(address user) external view returns (uint256);

    function deposit() external;
    function endCurrentEpoch() external;
    function claimableOmok() external view returns (uint256);
    function claimOmok() external;
    function withdraw(uint256 epochId) external;
    function rewardTopHolders() external;
}