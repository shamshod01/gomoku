// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOmokEscrow {
    struct Match {
        uint256 matchId;
        address user1;
        address user2;
        bool isFinished;
    }

    function BETTING_AMOUNT() external view returns (uint256);
    function omokVault() external view returns (address);
    function manager() external view returns (address);
    function matchId() external view returns (uint256);
    function openMatch() external view returns (Match memory);
    function userMatchInfo(address user) external view returns (Match memory);
    function epochUserBalance(uint256 epochId, address user) external view returns (uint256);

    function mint(uint256 epochId, address to, uint256 amount) external;
    function joinMatch() external;
    function endMatch(address user1, address user2, address winner) external;
    function leaveMatch() external;
    function balanceOf(address user) external view returns (uint256);
    function getCurrentEpochId() external view returns (uint256);
    function getMyMatchInfo() external view returns (Match memory);
}

interface IOmokEscrowTop10 is IOmokEscrow {
    function epochParticipants(uint256 epochId, uint256 index) external view returns (address);
    function hasParticipated(uint256 epochId, address user) external view returns (bool);
    function isTop10Percent(uint256 epochId, address user) external view returns (bool);
    function epochTop10Threshold(uint256 epochId) external view returns (uint256);

    function calculateTop10Percent(uint256 epochId) external;
    function getTop10PercentUsers(uint256 epochId) external view returns (address[] memory, uint256[] memory);
    function isUserInTop10Percent(uint256 epochId, address user) external view returns (bool);
    function getEpochParticipants(uint256 epochId) external view returns (address[] memory);
}