import { expect } from "chai";
import { ethers } from "hardhat";
import { GomokuToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("GomokuToken", function () {
  let token: GomokuToken;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract
    const GomokuToken = await ethers.getContractFactory("GomokuToken");
    token = await GomokuToken.deploy();
    await token.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await token.balanceOf(owner.address);
      expect(await token.totalSupply()).to.equal(ownerBalance);
    });

    it("Should have correct name and symbol", async function () {
      expect(await token.name()).to.equal("Gomoku Token");
      expect(await token.symbol()).to.equal("GMKU");
    });

    it("Should have 18 decimals", async function () {
      expect(await token.decimals()).to.equal(18);
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      // Transfer 50 tokens from owner to addr1
      await expect(
        token.transfer(addr1.address, ethers.parseEther("50"))
      ).to.changeTokenBalances(
        token,
        [owner, addr1],
        [ethers.parseEther("-50"), ethers.parseEther("50")]
      );
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialOwnerBalance = await token.balanceOf(owner.address);

      // Try to send 1 token from addr1 (0 tokens) to owner
      await expect(
        token.connect(addr1).transfer(owner.address, 1)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");

      // Owner balance shouldn't have changed
      expect(await token.balanceOf(owner.address)).to.equal(
        initialOwnerBalance
      );
    });

    it("Should update balances after transfers", async function () {
      const initialOwnerBalance = await token.balanceOf(owner.address);

      // Transfer 100 tokens from owner to addr1
      await token.transfer(addr1.address, ethers.parseEther("100"));

      // Transfer 50 tokens from addr1 to addr2
      await token.connect(addr1).transfer(addr2.address, ethers.parseEther("50"));

      // Check balances
      const finalOwnerBalance = await token.balanceOf(owner.address);
      expect(finalOwnerBalance).to.equal(
        initialOwnerBalance - ethers.parseEther("100")
      );

      const addr1Balance = await token.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(ethers.parseEther("50"));

      const addr2Balance = await token.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(ethers.parseEther("50"));
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint new tokens", async function () {
      const mintAmount = ethers.parseEther("1000");
      await token.mint(addr1.address, mintAmount);
      
      expect(await token.balanceOf(addr1.address)).to.equal(mintAmount);
    });

    it("Should not allow non-owner to mint tokens", async function () {
      const mintAmount = ethers.parseEther("1000");
      
      await expect(
        token.connect(addr1).mint(addr2.address, mintAmount)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });

  describe("Burning", function () {
    it("Should allow users to burn their own tokens", async function () {
      const burnAmount = ethers.parseEther("100");
      const initialSupply = await token.totalSupply();
      
      await token.burn(burnAmount);
      
      expect(await token.totalSupply()).to.equal(initialSupply - burnAmount);
    });

    it("Should not allow burning more than balance", async function () {
      const balance = await token.balanceOf(addr1.address);
      const burnAmount = balance + ethers.parseEther("1");
      
      await expect(
        token.connect(addr1).burn(burnAmount)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });
  });
});