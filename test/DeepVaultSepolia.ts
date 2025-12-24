import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { expect } from "chai";
import { DeepVault } from "../types";

type Signers = {
  owner: HardhatEthersSigner;
};

describe("DeepVaultSepolia", function () {
  let signers: Signers;
  let deepVault: DeepVault;
  let deepVaultAddress: string;

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const deepVaultDeployment = await deployments.get("DeepVault");
      deepVaultAddress = deepVaultDeployment.address;
      deepVault = await ethers.getContractAt("DeepVault", deepVaultDeployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0] };
  });

  it("creates or updates a document", async function () {
    this.timeout(4 * 40000);

    const exists = await deepVault.documentExists(signers.owner.address);
    if (!exists) {
      const randomKeyAddress = ethers.Wallet.createRandom().address;
      const encryptedInput = await fhevm
        .createEncryptedInput(deepVaultAddress, signers.owner.address)
        .addAddress(randomKeyAddress)
        .encrypt();

      const txCreate = await deepVault
        .connect(signers.owner)
        .createDocument("Sepolia Vault", "", encryptedInput.handles[0], encryptedInput.inputProof);
      await txCreate.wait();
    }

    const txUpdate = await deepVault.connect(signers.owner).updateDocument(signers.owner.address, "ciphertext");
    await txUpdate.wait();

    const doc = await deepVault.getDocument(signers.owner.address);
    expect(doc[0]).to.not.eq("");
    expect(doc[1]).to.eq("ciphertext");
  });
});
