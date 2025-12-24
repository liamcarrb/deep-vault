import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { DeepVault, DeepVault__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("DeepVault")) as DeepVault__factory;
  const deepVault = (await factory.deploy()) as DeepVault;
  const deepVaultAddress = await deepVault.getAddress();
  return { deepVault, deepVaultAddress };
}

describe("DeepVault", function () {
  let signers: Signers;
  let deepVault: DeepVault;
  let deepVaultAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ deepVault, deepVaultAddress } = await deployFixture());
  });

  it("creates a document with an encrypted key", async function () {
    const randomKeyAddress = ethers.Wallet.createRandom().address;
    const encryptedInput = await fhevm
      .createEncryptedInput(deepVaultAddress, signers.alice.address)
      .addAddress(randomKeyAddress)
      .encrypt();

    await deepVault
      .connect(signers.alice)
      .createDocument("First Vault", "", encryptedInput.handles[0], encryptedInput.inputProof);

    const doc = await deepVault.getDocument(signers.alice.address);
    expect(doc[0]).to.eq("First Vault");
    expect(doc[1]).to.eq("");
    expect(doc[4]).to.eq(true);
    expect(doc[2]).to.not.eq(ethers.ZeroHash);
  });

  it("grants access and allows edits by a grantee", async function () {
    const randomKeyAddress = ethers.Wallet.createRandom().address;
    const encryptedInput = await fhevm
      .createEncryptedInput(deepVaultAddress, signers.alice.address)
      .addAddress(randomKeyAddress)
      .encrypt();

    await deepVault
      .connect(signers.alice)
      .createDocument("Team Notes", "", encryptedInput.handles[0], encryptedInput.inputProof);

    await deepVault.connect(signers.alice).grantAccess(signers.bob.address);
    const hasAccess = await deepVault.hasAccess(signers.alice.address, signers.bob.address);
    expect(hasAccess).to.eq(true);

    await deepVault.connect(signers.bob).updateDocument(signers.alice.address, "ciphertext");
    const doc = await deepVault.getDocument(signers.alice.address);
    expect(doc[1]).to.eq("ciphertext");
  });
});
