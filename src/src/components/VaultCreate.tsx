import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Contract, ethers } from 'ethers';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import { generateRandomAddress } from '../lib/vaultCrypto';
import '../styles/VaultCreate.css';

export function VaultCreate() {
  const { address } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading, error } = useZamaInstance();

  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [txHash, setTxHash] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contractReady = ethers.isAddress(CONTRACT_ADDRESS) && CONTRACT_ADDRESS !== ethers.ZeroAddress;

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('');
    setTxHash('');
    setGeneratedKey('');

    if (!contractReady) {
      setStatus('Contract address is missing. Update it after deployment.');
      return;
    }
    if (!instance || !address || !signerPromise) {
      setStatus('Connect your wallet and wait for encryption to initialize.');
      return;
    }
    if (!name.trim()) {
      setStatus('Enter a document name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const keyAddress = generateRandomAddress();
      const input = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
      input.addAddress(keyAddress);
      const encryptedInput = await input.encrypt();

      const signer = await signerPromise;
      const vaultContract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const tx = await vaultContract.createDocument(
        name.trim(),
        '',
        encryptedInput.handles[0],
        encryptedInput.inputProof
      );
      setStatus('Waiting for confirmation...');
      await tx.wait();

      setStatus('Document created and key encrypted on-chain.');
      setTxHash(tx.hash);
      setGeneratedKey(keyAddress);
      setName('');
    } catch (err) {
      console.error('Create document failed:', err);
      setStatus('Create failed. Check wallet or network and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="vault-card create-card">
      <div className="card-header">
        <h3>Create a Vault Document</h3>
        <p>Generate a random key, encrypt it with Zama, and register your document.</p>
      </div>

      <form onSubmit={handleCreate} className="vault-form">
        <label className="vault-label">
          Document name
          <input
            className="vault-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Quarterly research notes"
            maxLength={80}
          />
        </label>

        <button
          className="vault-button primary"
          type="submit"
          disabled={isSubmitting || isLoading || !contractReady}
        >
          {isLoading ? 'Initializing encryption...' : isSubmitting ? 'Creating...' : 'Create Vault Document'}
        </button>
      </form>

      {error && <p className="vault-hint error">{error}</p>}
      {status && <p className="vault-hint">{status}</p>}

      {generatedKey && (
        <div className="vault-pill">
          <span>Generated key address</span>
          <strong>{generatedKey}</strong>
        </div>
      )}
      {txHash && (
        <div className="vault-pill">
          <span>Transaction</span>
          <strong>{txHash}</strong>
        </div>
      )}
    </section>
  );
}
