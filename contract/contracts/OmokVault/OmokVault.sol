// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {IOmokEscrow} from "../interface/IOmokEscrow.sol";

// TODO: add bifi deposit, withdraw logic
// TODO: calculate total rewards for the epoch and reward to top 10% holders
contract OmokVault is Ownable2StepUpgradeable {
    using SafeERC20 for IERC20;
    
    struct Epoch {
        uint256 startTimestamp;
        uint256 endTimestamp;
        uint256 totalDeposit;
        uint256 totalWithdraw;
    }
    address public constant USDC_ADDRESS = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // USDC on Base Mainnet
    address public constant BIFI = 0x0A5aA5D3a4d28014f967Bf0f29EAA3FF9807D5c6; // Mixed Route Quoter on Base Mainnet
    IOmokEscrow public OMOK_ESCROW;
    address public manager;
    uint256 public commissionAmount;
    uint256 public DEPOSIT_AMOUNT;
    uint256 public currentEpochId;
    uint256 public nextEpochId;
    mapping(uint256 => Epoch) public epochs;
    mapping(uint256 => mapping(address => uint256)) public epochUserDeposit;
    mapping(address => uint256) public lastClaimed;

    function deposit() external {
        IERC20(USDC_ADDRESS).safeTransferFrom(msg.sender, address(this), DEPOSIT_AMOUNT);
        // if current epoch is started already, increase epochId and schedule new epoch
        Epoch memory currentEpoch = epochs[currentEpochId];
        if(currentEpoch.startTimestamp < block.timestamp) {
            epochs[nextEpochId].startTimestamp = currentEpoch.endTimestamp;
            epochs[nextEpochId].endTimestamp = currentEpoch.endTimestamp + 7 days;
            epochUserDeposit[nextEpochId][msg.sender] += DEPOSIT_AMOUNT;
            epochs[nextEpochId].totalDeposit += DEPOSIT_AMOUNT;
        } else {
            epochUserDeposit[currentEpochId][msg.sender] += DEPOSIT_AMOUNT;
            epochs[currentEpochId].totalDeposit += DEPOSIT_AMOUNT;
        }
    }

    function endCurrentEpoch() external onlyOwner {
        currentEpochId = nextEpochId;
        nextEpochId++;
    }

    function claimableOmok() public view returns (uint256) {
        uint256 totalDeposit = epochUserDeposit[currentEpochId][msg.sender];
        Epoch memory currentEpoch = epochs[currentEpochId];
        uint256 calculateFrom = lastClaimed[msg.sender] > currentEpoch.startTimestamp ? lastClaimed[msg.sender] : currentEpoch.startTimestamp;
        uint256 calculateTo = block.timestamp > currentEpoch.endTimestamp ? currentEpoch.endTimestamp : block.timestamp;
        uint256 duration = calculateTo - calculateFrom;
        uint256 totalOmok = totalDeposit * duration / 7 days;
        return totalOmok;
    }

    function claimOmok() external {
        uint256 totalOmok = claimableOmok();
        lastClaimed[msg.sender] = block.timestamp;
        OMOK_ESCROW.mint(currentEpochId, msg.sender, totalOmok);
    }

    function withdraw(uint256 epochId) external {
        Epoch memory targetEpoch = epochs[epochId];
        if(targetEpoch.endTimestamp > block.timestamp) {
            revert("Epoch not ended");
        }
        uint256 totalDeposit = epochUserDeposit[epochId][msg.sender];
        epochUserDeposit[epochId][msg.sender] = 0;
        IERC20(USDC_ADDRESS).safeTransfer(msg.sender, totalDeposit);
        epochs[epochId].totalWithdraw += totalDeposit;
        require(epochs[epochId].totalWithdraw <= epochs[epochId].totalDeposit, "Total withdraw is greater than total deposit");
    }

    function rewardTopHolders() external onlyOwner {
        uint256 totalDeposit = epochUserDeposit[currentEpochId][msg.sender];
        Epoch memory currentEpoch = epochs[currentEpochId];
        uint256 calculateFrom = lastClaimed[msg.sender] > currentEpoch.startTimestamp ? lastClaimed[msg.sender] : currentEpoch.startTimestamp;
        uint256 calculateTo = block.timestamp > currentEpoch.endTimestamp ? currentEpoch.endTimestamp : block.timestamp;
        uint256 duration = calculateTo - calculateFrom;
        uint256 totalOmok = totalDeposit * duration / 7 days;
    }
}


