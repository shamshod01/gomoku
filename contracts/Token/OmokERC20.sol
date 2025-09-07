// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title OmokERC20
 * @dev OMOK token contract with minting and burning capabilities
 * Used for betting in the Omok game escrow system
 */
contract OmokERC20 is ERC20, ERC20Burnable, Ownable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    
    uint8 private _decimals;
    
    /**
     * @dev Constructor that gives msg.sender all of initial tokens.
     * @param name Name of the token
     * @param symbol Symbol of the token
     * @param decimals_ Number of decimals for the token
     * @param initialSupply Initial supply of tokens (in wei)
     */
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable() {
        _decimals = decimals_;
        
        // Grant the contract deployer the default admin role
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
        
        // Mint initial supply to deployer
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply);
        }
    }
    
    /**
     * @dev Returns the number of decimals used to get its user representation.
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    /**
     * @dev Mint tokens to a specific address
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
    
    /**
     * @dev Burn tokens from a specific address
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(from, amount);
    }
    
    /**
     * @dev Grant minter role to an address
     * @param account Address to grant minter role to
     */
    function grantMinterRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, account);
    }
    
    /**
     * @dev Revoke minter role from an address
     * @param account Address to revoke minter role from
     */
    function revokeMinterRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(MINTER_ROLE, account);
    }
    
    /**
     * @dev Grant burner role to an address
     * @param account Address to grant burner role to
     */
    function grantBurnerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(BURNER_ROLE, account);
    }
    
    /**
     * @dev Revoke burner role from an address
     * @param account Address to revoke burner role from
     */
    function revokeBurnerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(BURNER_ROLE, account);
    }
    
    /**
     * @dev Check if an address has minter role
     * @param account Address to check
     * @return True if address has minter role
     */
    function isMinter(address account) external view returns (bool) {
        return hasRole(MINTER_ROLE, account);
    }
    
    /**
     * @dev Check if an address has burner role
     * @param account Address to check
     * @return True if address has burner role
     */
    function isBurner(address account) external view returns (bool) {
        return hasRole(BURNER_ROLE, account);
    }
    
    /**
     * @dev Override supportsInterface to include AccessControl
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
