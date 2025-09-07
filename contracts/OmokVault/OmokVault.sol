// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IOmokEscrow} from "../interface/IOmokEscrow.sol";

interface IOMOK {
    function mint(address to, uint256 amt) external;
    function burn(address from, uint256 amt) external;
    function decimals() external view returns (uint8);
}

interface IBifiVault {
    function deposit(uint256 usdc) external;
    function withdraw(uint256 usdc) external;
    function totalAssets() external view returns (uint256); // in USDC (6d)
}

contract OmokVault is Initializable, OwnableUpgradeable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    uint256 constant ONE = 1e6;
    address public constant USDC_ADDRESS = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // USDC on Bifrost decimal 6;
    address public OMOK_ADDRESS; // decimal 6;
    address public constant BIFI = 0x0A5aA5D3a4d28014f967Bf0f29EAA3FF9807D5c6; // Bifrost Bifi Vault;
    uint256 public totalDepositUSDC;
    uint256 public constant VESTING_DURATION = 7 days;
    struct Vesting {
     uint256 claimableUntil;
     uint256 amountLeftToClaim;
     uint256 lastClaimed;
    }
    mapping(address => Vesting) public vestings;

    function initialize() public initializer {
        __Ownable_init();
     }


    /**
     * @notice User usdc will be deposited to bifi vault 
     * amount of Vesting Omok will be minted to Vault based on omok price
     * user's old vesting will be updated with new vesting
     * @param stakingAmount The amount of USDC to deposit
     */
    function deposit(uint256 stakingAmount) external nonReentrant {
        require(stakingAmount > 0, "Staking amount must be greater than 0");
        IERC20(USDC_ADDRESS).safeTransferFrom(msg.sender, address(this), stakingAmount);
        IBifiVault(BIFI).deposit(stakingAmount);

        uint256 amountOutMint = stakingAmount * ONE / omokPrice();
        totalDepositUSDC += stakingAmount;
        IOMOK(OMOK_ADDRESS).mint(address(this), amountOutMint);

        Vesting memory userVesting = vestings[msg.sender];
        userVesting.claimableUntil = block.timestamp + VESTING_DURATION;
        userVesting.amountLeftToClaim += amountOutMint;
        userVesting.lastClaimed = block.timestamp;
        vestings[msg.sender] = userVesting;        
    }



    function claimableOmok(address user) public view returns (uint256) {
        Vesting memory v = vestings[user];
        if (v.amountLeftToClaim == 0 || block.timestamp <= v.lastClaimed) return 0;

        uint256 end = v.claimableUntil;
        uint256 nowTs = block.timestamp < end ? block.timestamp : end;
        if (nowTs <= v.lastClaimed) return 0;

        uint256 remainingWindow = end - v.lastClaimed;           // dynamic window
        uint256 elapsed        = nowTs - v.lastClaimed;
        return v.amountLeftToClaim * elapsed / remainingWindow;  // proportional
    }


    function claimOmok() external nonReentrant {
        uint256 amt = claimableOmok(msg.sender);
        require(amt > 0, "Nothing to claim");
        Vesting storage v = vestings[msg.sender];
        v.lastClaimed = block.timestamp < v.claimableUntil ? block.timestamp : v.claimableUntil;
        v.amountLeftToClaim -= amt;
        IERC20(OMOK_ADDRESS).safeTransfer(msg.sender, amt);
    }

    function withdraw(uint256 amountOmok) external nonReentrant {
        IOMOK(OMOK_ADDRESS).burn(msg.sender, amountOmok);
        uint256 usdcAmount = amountOmok * omokPrice() / ONE;
        totalDepositUSDC -= usdcAmount;
        IBifiVault(BIFI).withdraw(usdcAmount);
        IERC20(USDC_ADDRESS).safeTransfer(msg.sender, usdcAmount);
    }


    function omokPrice() public view returns (uint256) {
        uint256 totalOmok = IERC20(OMOK_ADDRESS).totalSupply();
        if(totalOmok == 0) {
            return ONE;
        }
        return  totalDepositUSDC * ONE / totalOmok;
    }
    // yield generated from bifi vault will be count as platform profit
    function totalTreasury() external view returns (uint256) {
        uint256 totalBifiUSDC = IBifiVault(BIFI).totalAssets(); // call bifi deposit amount;
        return  totalBifiUSDC - totalDepositUSDC;
    }
}


