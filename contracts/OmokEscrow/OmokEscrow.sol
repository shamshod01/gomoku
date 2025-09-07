// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

interface IOMOK {
    function burn(address from, uint256 amt) external;
    function decimals() external view returns (uint8);
}

/**
 * @title OmokEscrow
 * @dev Escrow contract for 1v1 matches with betting functionality
 * Supports both public and private matches with signature verification
 */
contract OmokEscrow is Initializable, OwnableUpgradeable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    // Constants
    uint256 public constant BURN_PERCENTAGE = 10; // 10% of betting amount will be burned
    uint256 public constant PERCENTAGE_BASE = 100;
    
    // State variables
    address public OMOK_ADDRESS;
    address public gameManager;
    uint256 public matchCounter;
    
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
        bytes32 gameHash; // Hash of game data for verification
    }
    
    // Mappings
    mapping(uint256 => Match) public matches;
    mapping(address => uint256) public userActiveMatch; // User can only have one active match
    mapping(uint256 => bool) public usedNonces; // Prevent signature replay attacks
    
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
    
    // Custom errors
    error InvalidBettingAmount();
    error UserAlreadyInMatch();
    error MatchNotFound();
    error MatchNotOpen();
    error CannotJoinOwnMatch();
    error InsufficientBalance();
    error InvalidSignature();
    error MatchNotActive();
    error NotMatchParticipant();
    error MatchAlreadyFinished();
    error InvalidGameManager();
    error SignatureAlreadyUsed();
    error InvalidWinner();

    /**
     * @dev Initialize the contract
     * @param _omokAddress Address of the OMOK token contract
     * @param _gameManager Address of the game manager who can sign game results
     */
    function initialize(address _omokAddress, address _gameManager) public initializer {
        __Ownable_init();
        OMOK_ADDRESS = _omokAddress;
        gameManager = _gameManager;
        matchCounter = 0;
    }

    /**
     * @dev Create a new match
     * @param bettingAmount Amount of OMOK tokens to bet
     * @param matchType Type of match (PUBLIC or PRIVATE)
     */
    function createMatch(uint256 bettingAmount, MatchType matchType) external nonReentrant {
        if (bettingAmount == 0) revert InvalidBettingAmount();
        if (userActiveMatch[msg.sender] != 0) revert UserAlreadyInMatch();
        
        // Check user has sufficient balance
        if (IERC20(OMOK_ADDRESS).balanceOf(msg.sender) < bettingAmount) {
            revert InsufficientBalance();
        }
        
        // Transfer betting amount to escrow
        IERC20(OMOK_ADDRESS).safeTransferFrom(msg.sender, address(this), bettingAmount);
        
        // Create match
        matchCounter++;
        matches[matchCounter] = Match({
            matchId: matchCounter,
            creator: msg.sender,
            joiner: address(0),
            bettingAmount: bettingAmount,
            matchType: matchType,
            status: MatchStatus.OPEN,
            winner: address(0),
            createdAt: block.timestamp,
            finishedAt: 0
        });
        
        userActiveMatch[msg.sender] = matchCounter;
        
        emit MatchCreated(matchCounter, msg.sender, bettingAmount, matchType);
    }

    /**
     * @dev Join a public match
     * @param matchId ID of the match to join
     */
    function joinPublicMatch(uint256 matchId) external nonReentrant {
        _joinMatch(matchId, bytes(""));
    }

    /**
     * @dev Join a private match with creator's signature
     * @param matchId ID of the match to join
     * @param signature Signature from match creator allowing this user to join
     * @param nonce Unique nonce to prevent replay attacks
     */
    function joinPrivateMatch(
        uint256 matchId,
        bytes calldata signature,
        uint256 nonce
    ) external nonReentrant {
        if (usedNonces[nonce]) revert SignatureAlreadyUsed();
        
        Match storage matchData = matches[matchId];
        if (matchData.matchId == 0) revert MatchNotFound();
        if (matchData.matchType != MatchType.PRIVATE) revert MatchNotFound();
        
        // Verify signature
        bytes32 messageHash = ECDSA.toEthSignedMessageHash(keccak256(
            abi.encodePacked(matchId, msg.sender, nonce)
        ));
        
        address signer = messageHash.recover(signature);
        if (signer != matchData.creator) revert InvalidSignature();
        
        usedNonces[nonce] = true;
        _joinMatch(matchId, signature);
    }

    /**
     * @dev Internal function to join a match
     * @param matchId ID of the match to join
     * @param signature Signature (empty for public matches)
     */
    function _joinMatch(uint256 matchId, bytes memory signature) internal {
        Match storage matchData = matches[matchId];
        
        if (matchData.matchId == 0) revert MatchNotFound();
        if (matchData.status != MatchStatus.OPEN) revert MatchNotOpen();
        if (matchData.creator == msg.sender) revert CannotJoinOwnMatch();
        if (userActiveMatch[msg.sender] != 0) revert UserAlreadyInMatch();
        
        // For public matches, no signature verification needed
        if (matchData.matchType == MatchType.PUBLIC && signature.length > 0) {
            revert InvalidSignature();
        }
        
        // Check user has sufficient balance
        if (IERC20(OMOK_ADDRESS).balanceOf(msg.sender) < matchData.bettingAmount) {
            revert InsufficientBalance();
        }
        
        // Transfer betting amount to escrow
        IERC20(OMOK_ADDRESS).safeTransferFrom(msg.sender, address(this), matchData.bettingAmount);
        
        // Update match
        matchData.joiner = msg.sender;
        matchData.status = MatchStatus.ACTIVE;
        userActiveMatch[msg.sender] = matchId;
        
        emit MatchJoined(matchId, msg.sender, matchData.creator);
    }

    /**
     * @dev Submit game result with game manager signature
     * @param matchId ID of the finished match
     * @param winner Address of the winner
     * @param gameHash Hash of the game data for verification
     * @param signature Signature from game manager confirming the result
     * @param nonce Unique nonce to prevent replay attacks
     */
    function submitGameResult(
        uint256 matchId,
        address winner,
        bytes32 gameHash,
        bytes calldata signature,
        uint256 nonce
    ) external nonReentrant {
        if (usedNonces[nonce]) revert SignatureAlreadyUsed();
        
        Match storage matchData = matches[matchId];
        
        if (matchData.matchId == 0) revert MatchNotFound();
        if (matchData.status != MatchStatus.ACTIVE) revert MatchNotActive();
        if (matchData.status == MatchStatus.FINISHED) revert MatchAlreadyFinished();
        
        // Only match participants can submit results
        if (msg.sender != matchData.creator && msg.sender != matchData.joiner) {
            revert NotMatchParticipant();
        }
        
        // Winner must be one of the participants
        if (winner != matchData.creator && winner != matchData.joiner) {
            revert InvalidWinner();
        }
        
        // Verify game manager signature
        bytes32 messageHash = ECDSA.toEthSignedMessageHash(keccak256(
            abi.encodePacked(matchId, winner, gameHash, nonce)
        ));
        
        address signer = messageHash.recover(signature);
        if (signer != gameManager) revert InvalidSignature();
        
        usedNonces[nonce] = true;
        
        // Calculate payouts
        uint256 totalPot = matchData.bettingAmount * 2;
        uint256 burnAmount = (totalPot * BURN_PERCENTAGE) / PERCENTAGE_BASE;
        uint256 winnerPayout = totalPot - burnAmount;
        
        // Update match
        matchData.winner = winner;
        matchData.status = MatchStatus.FINISHED;
        matchData.finishedAt = block.timestamp;
        
        // Clear active matches for both users
        userActiveMatch[matchData.creator] = 0;
        userActiveMatch[matchData.joiner] = 0;
        
        // Burn tokens
        IOMOK(OMOK_ADDRESS).burn(address(this), burnAmount);
        
        // Transfer winnings to winner
        IERC20(OMOK_ADDRESS).safeTransfer(winner, winnerPayout);
        
        emit MatchFinished(matchId, winner, winnerPayout, burnAmount);
    }

    /**
     * @dev Cancel an open match (only creator can cancel)
     * @param matchId ID of the match to cancel
     */
    function cancelMatch(uint256 matchId) external nonReentrant {
        Match storage matchData = matches[matchId];
        
        if (matchData.matchId == 0) revert MatchNotFound();
        if (matchData.creator != msg.sender) revert NotMatchParticipant();
        if (matchData.status != MatchStatus.OPEN) revert MatchNotOpen();
        
        // Update match status
        matchData.status = MatchStatus.CANCELLED;
        userActiveMatch[msg.sender] = 0;
        
        // Refund betting amount to creator
        IERC20(OMOK_ADDRESS).safeTransfer(matchData.creator, matchData.bettingAmount);
        
        emit MatchCancelled(matchId, msg.sender, "Cancelled by creator");
    }

    /**
     * @dev Emergency cancel match (only owner)
     * @param matchId ID of the match to cancel
     * @param reason Reason for cancellation
     */
    function emergencyCancelMatch(uint256 matchId, string calldata reason) external onlyOwner {
        Match storage matchData = matches[matchId];
        
        if (matchData.matchId == 0) revert MatchNotFound();
        if (matchData.status == MatchStatus.FINISHED || matchData.status == MatchStatus.CANCELLED) {
            revert MatchAlreadyFinished();
        }
        
        // Clear active matches
        userActiveMatch[matchData.creator] = 0;
        if (matchData.joiner != address(0)) {
            userActiveMatch[matchData.joiner] = 0;
        }
        
        // Calculate refunds
        if (matchData.status == MatchStatus.OPEN) {
            // Only creator deposited
            IERC20(OMOK_ADDRESS).safeTransfer(matchData.creator, matchData.bettingAmount);
        } else if (matchData.status == MatchStatus.ACTIVE) {
            // Both players deposited, refund both
            IERC20(OMOK_ADDRESS).safeTransfer(matchData.creator, matchData.bettingAmount);
            IERC20(OMOK_ADDRESS).safeTransfer(matchData.joiner, matchData.bettingAmount);
        }
        
        matchData.status = MatchStatus.CANCELLED;
        
        emit MatchCancelled(matchId, matchData.creator, reason);
    }

    /**
     * @dev Update game manager address (only owner)
     * @param newGameManager New game manager address
     */
    function updateGameManager(address newGameManager) external onlyOwner {
        if (newGameManager == address(0)) revert InvalidGameManager();
        
        address oldManager = gameManager;
        gameManager = newGameManager;
        
        emit GameManagerUpdated(oldManager, newGameManager);
    }

    // View functions
    
    /**
     * @dev Get match information
     * @param matchId ID of the match
     * @return Match struct
     */
    function getMatch(uint256 matchId) external view returns (Match memory) {
        return matches[matchId];
    }

    /**
     * @dev Get user's active match ID
     * @param user Address of the user
     * @return Active match ID (0 if no active match)
     */
    function getUserActiveMatch(address user) external view returns (uint256) {
        return userActiveMatch[user];
    }

    /**
     * @dev Get current match counter
     * @return Current match counter
     */
    function getCurrentMatchId() external view returns (uint256) {
        return matchCounter;
    }

    /**
     * @dev Check if a nonce has been used
     * @param nonce Nonce to check
     * @return True if nonce has been used
     */
    function isNonceUsed(uint256 nonce) external view returns (bool) {
        return usedNonces[nonce];
    }

    /**
     * @dev Get total pot for a match
     * @param matchId ID of the match
     * @return Total pot amount
     */
    function getMatchPot(uint256 matchId) external view returns (uint256) {
        Match memory matchData = matches[matchId];
        if (matchData.status == MatchStatus.ACTIVE || matchData.status == MatchStatus.FINISHED) {
            return matchData.bettingAmount * 2;
        } else if (matchData.status == MatchStatus.OPEN) {
            return matchData.bettingAmount;
        }
        return 0;
    }

    /**
     * @dev Calculate winner payout for a match
     * @param matchId ID of the match
     * @return winnerPayout Winner payout amount
     * @return burnAmount Burn amount
     */
    function calculatePayout(uint256 matchId) external view returns (uint256 winnerPayout, uint256 burnAmount) {
        Match memory matchData = matches[matchId];
        if (matchData.status == MatchStatus.ACTIVE || matchData.status == MatchStatus.FINISHED) {
            uint256 totalPot = matchData.bettingAmount * 2;
            burnAmount = (totalPot * BURN_PERCENTAGE) / PERCENTAGE_BASE;
            winnerPayout = totalPot - burnAmount;
        }
    }
}
