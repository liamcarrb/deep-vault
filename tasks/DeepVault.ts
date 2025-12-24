import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Examples:
 *   - npx hardhat --network localhost task:address
 *   - npx hardhat --network sepolia task:address
 */
task("task:address", "Prints the DeepVault address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;
  const deepVault = await deployments.get("DeepVault");
  console.log("DeepVault address is " + deepVault.address);
});

/**
 * Examples:
 *   - npx hardhat --network localhost task:create-document --name "My Doc"
 */
task("task:create-document", "Creates a new document with a random encrypted key")
  .addParam("name", "Document name")
  .addOptionalParam("body", "Encrypted body string", "")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();
    const deepVaultDeployment = await deployments.get("DeepVault");
    const signers = await ethers.getSigners();
    const deepVault = await ethers.getContractAt("DeepVault", deepVaultDeployment.address);

    const randomKeyAddress = ethers.Wallet.createRandom().address;
    const encryptedInput = await fhevm
      .createEncryptedInput(deepVaultDeployment.address, signers[0].address)
      .addAddress(randomKeyAddress)
      .encrypt();

    const tx = await deepVault
      .connect(signers[0])
      .createDocument(taskArguments.name, taskArguments.body, encryptedInput.handles[0], encryptedInput.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
    console.log(`DeepVault createDocument succeeded, key=${randomKeyAddress}`);
  });

/**
 * Examples:
 *   - npx hardhat --network localhost task:update-document --owner 0x... --body "ciphertext"
 */
task("task:update-document", "Updates an existing document")
  .addParam("owner", "Document owner address")
  .addParam("body", "Encrypted body string")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const deepVaultDeployment = await deployments.get("DeepVault");
    const signers = await ethers.getSigners();
    const deepVault = await ethers.getContractAt("DeepVault", deepVaultDeployment.address);

    const tx = await deepVault.connect(signers[0]).updateDocument(taskArguments.owner, taskArguments.body);
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
    console.log(`DeepVault updateDocument succeeded`);
  });

/**
 * Examples:
 *   - npx hardhat --network localhost task:grant-access --grantee 0x...
 */
task("task:grant-access", "Grants access to decrypt the document key")
  .addParam("grantee", "Grantee address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const deepVaultDeployment = await deployments.get("DeepVault");
    const signers = await ethers.getSigners();
    const deepVault = await ethers.getContractAt("DeepVault", deepVaultDeployment.address);

    const tx = await deepVault.connect(signers[0]).grantAccess(taskArguments.grantee);
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
    console.log(`DeepVault grantAccess succeeded`);
  });

/**
 * Examples:
 *   - npx hardhat --network localhost task:get-document --owner 0x...
 */
task("task:get-document", "Reads a document for an owner")
  .addParam("owner", "Document owner address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const deepVaultDeployment = await deployments.get("DeepVault");
    const deepVault = await ethers.getContractAt("DeepVault", deepVaultDeployment.address);

    const doc = await deepVault.getDocument(taskArguments.owner);
    console.log(`name=${doc[0]}`);
    console.log(`encryptedBody=${doc[1]}`);
    console.log(`encryptedKey=${doc[2]}`);
    console.log(`updatedAt=${doc[3]}`);
    console.log(`exists=${doc[4]}`);
  });

/**
 * Examples:
 *   - npx hardhat --network localhost task:has-access --owner 0x... --user 0x...
 */
task("task:has-access", "Checks access to a document")
  .addParam("owner", "Document owner address")
  .addParam("user", "User address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const deepVaultDeployment = await deployments.get("DeepVault");
    const deepVault = await ethers.getContractAt("DeepVault", deepVaultDeployment.address);
    const hasAccess = await deepVault.hasAccess(taskArguments.owner, taskArguments.user);

    console.log(`hasAccess=${hasAccess}`);
  });
