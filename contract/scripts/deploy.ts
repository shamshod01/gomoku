import { ethers } from "hardhat";

async function main() {
  console.log("Deploying GomokuToken...");

  // Get the contract factory
  const GomokuToken = await ethers.getContractFactory("GomokuToken");
  
  // Deploy the contract
  const token = await GomokuToken.deploy();
  
  // Wait for deployment to finish
  await token.waitForDeployment();
  
  const tokenAddress = await token.getAddress();
  
  console.log("GomokuToken deployed to:", tokenAddress);
  
  // Get deployer address
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  // Get initial supply
  const totalSupply = await token.totalSupply();
  console.log("Total supply:", ethers.formatEther(totalSupply), "GMKU");
}

// Execute the deployment script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });