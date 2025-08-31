// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IOmokVault} from "../interface/IOmokVault.sol";

contract OmokEscrow {
    struct Match {
        uint256 matchId;
        address user1;
        address user2;
        bool isFinished;
    }

    struct UserBalance {
        address user;
        uint256 balance;
    }

    uint256 public constant BETTING_AMOUNT = 1e8;
    IOmokVault public omokVault;
    address public manager;
    
    uint256 public matchId;
    Match public openMatch;
    mapping(address => Match) public userMatchInfo;
    mapping(uint256 => mapping(address => uint256)) public epochUserBalance;
    
    // Top 10% tracking
    mapping(uint256 => address[]) public epochParticipants;
    mapping(uint256 => mapping(address => bool)) public hasParticipated;
    mapping(uint256 => mapping(address => bool)) public isTop10Percent;
    mapping(uint256 => uint256) public epochTop10Threshold;
    
    // Transient storage slots for sorting (used only within transaction)
    uint256 private constant SORT_ARRAY_SLOT = 0x1000;
    uint256 private constant SORT_LENGTH_SLOT = 0x2000;
    uint256 private constant TEMP_BALANCE_SLOT = 0x3000;
    
    event MatchCreated(uint256 indexed matchId, address indexed user1);
    event MatchStarted(uint256 indexed matchId, address indexed user1, address indexed user2);
    event MatchEnded(uint256 indexed matchId, address indexed user1, address indexed user2, address winner);
    event Top10PercentCalculated(uint256 indexed epochId, uint256 threshold, uint256 topUsersCount);

    modifier onlyOmokVault() {
        require(msg.sender == address(omokVault), "OnlyOmokVault");
        _;
    }
    
    modifier onlyManager() {
        require(msg.sender == manager, "OnlyManager");
        _;
    }

    function mint(uint256 epochId, address to, uint256 amount) external onlyOmokVault {
        _updateBalance(epochId, to, epochUserBalance[epochId][to] + amount);
    }

    function _updateBalance(uint256 epochId, address user, uint256 newBalance) internal {
        if (!hasParticipated[epochId][user] && newBalance > 0) {
            epochParticipants[epochId].push(user);
            hasParticipated[epochId][user] = true;
        }
        
        epochUserBalance[epochId][user] = newBalance;
    }

    function joinMatch() external {
        require(userMatchInfo[msg.sender].isFinished, "You have unfinished match");
        uint256 epochId = getCurrentEpochId();
        uint256 currentBalance = epochUserBalance[epochId][msg.sender];
        require(currentBalance >= BETTING_AMOUNT, "Not enough balance");
        
        _updateBalance(epochId, msg.sender, currentBalance - BETTING_AMOUNT);
        
        if(openMatch.user1 == address(0)) {
            matchId++;
            openMatch = Match(matchId, msg.sender, address(0), false);
            emit MatchCreated(matchId, msg.sender);
            return;
        } else {
            matchId++;
            openMatch = Match(matchId, openMatch.user1, msg.sender, false);
        }
        emit MatchStarted(matchId, openMatch.user1, msg.sender);
        userMatchInfo[msg.sender] = openMatch;
        userMatchInfo[openMatch.user1] = openMatch;
        delete openMatch;
    }

    function endMatch(address user1, address user2, address winner) external onlyManager {
        require(userMatchInfo[user1].matchId == userMatchInfo[user2].matchId, "Match id is not same");
        userMatchInfo[user1].isFinished = true;
        userMatchInfo[user2].isFinished = true;
        
        uint256 epochId = getCurrentEpochId();
        if(winner == user1) {
            _updateBalance(epochId, user1, epochUserBalance[epochId][user1] + BETTING_AMOUNT * 2);
        } else {
            _updateBalance(epochId, user2, epochUserBalance[epochId][user2] + BETTING_AMOUNT * 2);
        }
        emit MatchEnded(userMatchInfo[user1].matchId, user1, user2, winner);
    }

    function leaveMatch() external {
        uint256 epochId = getCurrentEpochId();
        
        if(openMatch.user1 == msg.sender) {
            openMatch.user1 = address(0);
            _updateBalance(epochId, msg.sender, epochUserBalance[epochId][msg.sender] + (BETTING_AMOUNT/2));
            emit MatchEnded(openMatch.matchId, openMatch.user1, openMatch.user2, address(0));
            delete openMatch;
            return;
        }
        
        Match memory targetMatch = userMatchInfo[msg.sender];
        require(!targetMatch.isFinished, "You don't have a match");
        userMatchInfo[targetMatch.user1].isFinished = true;
        userMatchInfo[targetMatch.user2].isFinished = true;
        
        address otherUser = targetMatch.user1 == msg.sender ? targetMatch.user2 : targetMatch.user1;
        _updateBalance(epochId, msg.sender, epochUserBalance[epochId][msg.sender] + (BETTING_AMOUNT/2));
        _updateBalance(epochId, otherUser, epochUserBalance[epochId][otherUser] + (BETTING_AMOUNT * 2/3));
        
        emit MatchEnded(userMatchInfo[msg.sender].matchId, userMatchInfo[msg.sender].user1, userMatchInfo[msg.sender].user2, address(0));
    }

    function calculateTop10Percent(uint256 epochId) external onlyManager {
        address[] memory participants = epochParticipants[epochId];
        uint256 length = participants.length;
        require(length > 0, "No participants in epoch");
        
        // Store length in transient storage
        assembly {
            tstore(SORT_LENGTH_SLOT, length)
        }
        
        // Store balances in transient storage for sorting
        for (uint256 i = 0; i < length; i++) {
            address participant = participants[i];
            uint256 userBalance = epochUserBalance[epochId][participant];
            
            assembly {
                // Store address at slot: SORT_ARRAY_SLOT + i * 2
                let addrSlot := add(SORT_ARRAY_SLOT, mul(i, 2))
                tstore(addrSlot, participant)
                
                // Store balance at slot: SORT_ARRAY_SLOT + i * 2 + 1
                let balSlot := add(addrSlot, 1)
                tstore(balSlot, userBalance)
            }
        }
        
        // Sort using transient storage
        _transientQuickSort(0, length - 1);
        
        // Calculate top 10%
        uint256 topCount = (length * 10) / 100;
        if (topCount == 0) topCount = 1;
        
        // Get threshold from sorted transient storage
        uint256 threshold;
        assembly {
            let thresholdSlot := add(SORT_ARRAY_SLOT, add(mul(sub(topCount, 1), 2), 1))
            threshold := tload(thresholdSlot)
        }
        epochTop10Threshold[epochId] = threshold;
        
        // Mark top 10% users
        for (uint256 i = 0; i < topCount; i++) {
            address topUser;
            assembly {
                let addrSlot := add(SORT_ARRAY_SLOT, mul(i, 2))
                topUser := tload(addrSlot)
            }
            isTop10Percent[epochId][topUser] = true;
        }
        
        emit Top10PercentCalculated(epochId, threshold, topCount);
    }
    
    function _transientQuickSort(uint256 left, uint256 right) internal {
        if (left >= right) return;
        
        uint256 pivotIndex = _transientPartition(left, right);
        if (pivotIndex > 0) _transientQuickSort(left, pivotIndex - 1);
        _transientQuickSort(pivotIndex + 1, right);
    }
    
    function _transientPartition(uint256 left, uint256 right) internal returns (uint256) {
        uint256 pivotBalance;
        address pivotAddr;
        
        assembly {
            let pivotBalSlot := add(SORT_ARRAY_SLOT, add(mul(right, 2), 1))
            pivotBalance := tload(pivotBalSlot)
            let pivotAddrSlot := add(SORT_ARRAY_SLOT, mul(right, 2))
            pivotAddr := tload(pivotAddrSlot)
        }
        
        uint256 i = left;
        
        for (uint256 j = left; j < right; j++) {
            uint256 currentBalance;
            assembly {
                let balSlot := add(SORT_ARRAY_SLOT, add(mul(j, 2), 1))
                currentBalance := tload(balSlot)
            }
            
            if (currentBalance >= pivotBalance) {
                // Swap elements at i and j using transient storage
                if (i != j) {
                    assembly {
                        // Load values at position i
                        let iAddrSlot := add(SORT_ARRAY_SLOT, mul(i, 2))
                        let iBalSlot := add(iAddrSlot, 1)
                        let iAddr := tload(iAddrSlot)
                        let iBal := tload(iBalSlot)
                        
                        // Load values at position j
                        let jAddrSlot := add(SORT_ARRAY_SLOT, mul(j, 2))
                        let jBalSlot := add(jAddrSlot, 1)
                        let jAddr := tload(jAddrSlot)
                        let jBal := tload(jBalSlot)
                        
                        // Swap
                        tstore(iAddrSlot, jAddr)
                        tstore(iBalSlot, jBal)
                        tstore(jAddrSlot, iAddr)
                        tstore(jBalSlot, iBal)
                    }
                }
                i++;
            }
        }
        
        // Swap pivot with element at i
        if (i != right) {
            assembly {
                // Load values at position i
                let iAddrSlot := add(SORT_ARRAY_SLOT, mul(i, 2))
                let iBalSlot := add(iAddrSlot, 1)
                let iAddr := tload(iAddrSlot)
                let iBal := tload(iBalSlot)
                
                // Load values at position right (pivot)
                let rightAddrSlot := add(SORT_ARRAY_SLOT, mul(right, 2))
                let rightBalSlot := add(rightAddrSlot, 1)
                
                // Swap
                tstore(iAddrSlot, pivotAddr)
                tstore(iBalSlot, pivotBalance)
                tstore(rightAddrSlot, iAddr)
                tstore(rightBalSlot, iBal)
            }
        }
        
        return i;
    }
    
    function getTop10PercentUsers(uint256 epochId) external view returns (address[] memory, uint256[] memory) {
        address[] memory participants = epochParticipants[epochId];
        uint256 count = 0;
        
        for (uint256 i = 0; i < participants.length; i++) {
            if (isTop10Percent[epochId][participants[i]]) {
                count++;
            }
        }
        
        address[] memory topUsers = new address[](count);
        uint256[] memory topBalances = new uint256[](count);
        uint256 idx = 0;
        
        for (uint256 i = 0; i < participants.length; i++) {
            if (isTop10Percent[epochId][participants[i]]) {
                topUsers[idx] = participants[i];
                topBalances[idx] = epochUserBalance[epochId][participants[i]];
                idx++;
            }
        }
        
        return (topUsers, topBalances);
    }
    
    function isUserInTop10Percent(uint256 epochId, address user) external view returns (bool) {
        return isTop10Percent[epochId][user];
    }
    
    function getEpochParticipants(uint256 epochId) external view returns (address[] memory) {
        return epochParticipants[epochId];
    }

    function balanceOf(address user) external view returns (uint256) {
        return epochUserBalance[getCurrentEpochId()][user];
    }
    
    function getCurrentEpochId() public view returns (uint256) {
        return omokVault.currentEpochId();
    }
    
    function getMyMatchInfo() external view returns (Match memory) {
        return userMatchInfo[msg.sender];
    }
}