// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOmokEscrow {
    // Enums
    enum MatchType { PUBLIC, PRIVATE }
    enum MatchStatus { OPEN, ACTIVE, FINISHED, CANCELLED }
    
    // Structs
    struct Match {
        uint256 matchId;
        address creator;
        address joiner;
        uint256 bettingAmount;
        MatchType matchType;
        MatchStatus status;
        address winner;
        uint256 createdAt;
        uint256 finishedAt;
    }
    
    struct GameResult {
        uint256 matchId;
        address winner;
        uint256 timestamp;
        bytes32 gameHash;
    }

    // Events
    event MatchCreated(
        uint256 indexed matchId,
        address indexed creator,
        uint256 bettingAmount,
        MatchType matchType
    );
    
    event MatchJoined(
        uint256 indexed matchId,
        address indexed joiner,
        address indexed creator
    );
    
    event MatchFinished(
        uint256 indexed matchId,
        address indexed winner,
        uint256 winnerPayout,
        uint256 burnedAmount
    );
    
    event MatchCancelled(
        uint256 indexed matchId,
        address indexed creator,
        string reason
    );
    
    event GameManagerUpdated(address indexed oldManager, address indexed newManager);

    // Constants
    function BURN_PERCENTAGE() external view returns (uint256);
    function PERCENTAGE_BASE() external view returns (uint256);
    
    // State variables
    function OMOK_ADDRESS() external view returns (address);
    function gameManager() external view returns (address);
    function matchCounter() external view returns (uint256);
    
    // Mappings
    function matches(uint256 matchId) external view returns (Match memory);
    function userActiveMatch(address user) external view returns (uint256);
    function usedNonces(uint256 nonce) external view returns (bool);

    // Main functions
    function createMatch(uint256 bettingAmount, MatchType matchType) external;
    function joinPublicMatch(uint256 matchId) external;
    function joinPrivateMatch(uint256 matchId, bytes calldata signature, uint256 nonce) external;
    function submitGameResult(
        uint256 matchId,
        address winner,
        bytes32 gameHash,
        bytes calldata signature,
        uint256 nonce
    ) external;
    function cancelMatch(uint256 matchId) external;
    function emergencyCancelMatch(uint256 matchId, string calldata reason) external;
    function updateGameManager(address newGameManager) external;

    // View functions
    function getMatch(uint256 matchId) external view returns (Match memory);
    function getUserActiveMatch(address user) external view returns (uint256);
    function getCurrentMatchId() external view returns (uint256);
    function isNonceUsed(uint256 nonce) external view returns (bool);
    function getMatchPot(uint256 matchId) external view returns (uint256);
    function calculatePayout(uint256 matchId) external view returns (uint256 winnerPayout, uint256 burnAmount);
}