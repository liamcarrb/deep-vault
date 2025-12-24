import { useEffect, useMemo, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Contract, ethers } from 'ethers';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import {
  decryptWithAddressKey,
  encryptWithAddressKey,
  normalizeDecryptedAddress,
} from '../lib/vaultCrypto';
import '../styles/VaultOpen.css';

type DocumentData = readonly [string, string, `0x${string}`, bigint, boolean];

export function VaultOpen() {
  const { address } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance } = useZamaInstance();

  const [ownerInput, setOwnerInput] = useState('');
  const [decryptedKey, setDecryptedKey] = useState('');
  const [decryptedBody, setDecryptedBody] = useState('');
  const [bodyDraft, setBodyDraft] = useState('');
  const [status, setStatus] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [grantAddress, setGrantAddress] = useState('');
  const [isGranting, setIsGranting] = useState(false);

  const contractAddress = useMemo(() => {
    if (!ethers.isAddress(CONTRACT_ADDRESS) || CONTRACT_ADDRESS === ethers.ZeroAddress) {
      return undefined;
    }
    return CONTRACT_ADDRESS as `0x${string}`;
  }, []);

  useEffect(() => {
    if (address && !ownerInput) {
      setOwnerInput(address);
    }
  }, [address, ownerInput]);

  const normalizedOwnerInput = ownerInput.trim();
  const ownerAddress = ethers.isAddress(normalizedOwnerInput)
    ? (normalizedOwnerInput as `0x${string}`)
    : undefined;

  useEffect(() => {
    setDecryptedKey('');
    setDecryptedBody('');
    setBodyDraft('');
    setStatus('');
  }, [ownerAddress]);

  const { data: docData, refetch: refetchDocument } = useReadContract({
    address: contractAddress,
    abi: CONTRACT_ABI,
    functionName: 'getDocument',
    args: ownerAddress ? [ownerAddress] : undefined,
    query: {
      enabled: !!contractAddress && !!ownerAddress,
    },
  });

  const { data: accessData } = useReadContract({
    address: contractAddress,
    abi: CONTRACT_ABI,
    functionName: 'hasAccess',
    args: ownerAddress && address ? [ownerAddress, address] : undefined,
    query: {
      enabled: !!contractAddress && !!ownerAddress && !!address,
    },
  });

  const document = docData as DocumentData | undefined;
  const exists = document?.[4] ?? false;
  const encryptedBody = document?.[1] ?? '';
  const encryptedKey = document?.[2] ?? '0x';
  const updatedAt = document?.[3] ?? 0n;
  const hasAccess = accessData ? (accessData as boolean) : false;
  const isOwner = address && ownerAddress ? address.toLowerCase() === ownerAddress.toLowerCase() : false;
  const accessLabel = !address ? 'Connect wallet' : isOwner ? 'Owner' : hasAccess ? 'Allowed' : 'Not granted';

  const handleDecrypt = async () => {
    setStatus('');
    setDecryptedKey('');
    setDecryptedBody('');

    if (!instance || !address || !signerPromise || !contractAddress) {
      setStatus('Connect your wallet and wait for encryption to initialize.');
      return;
    }
    if (!exists || !encryptedKey || encryptedKey === ethers.ZeroHash) {
      setStatus('No encrypted key found for this address.');
      return;
    }

    setIsDecrypting(true);
    try {
      const keypair = instance.generateKeypair();
      const handleContractPairs = [
        {
          handle: encryptedKey,
          contractAddress,
        },
      ];
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [contractAddress];

      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
      const signer = await signerPromise;
      if (!signer) {
        setStatus('Signer not available.');
        return;
      }

      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays
      );

      const decryptedValue = result[encryptedKey as string];
      const keyAddress = normalizeDecryptedAddress(decryptedValue);
      if (!keyAddress) {
        setStatus('Unable to decode the decrypted key.');
        return;
      }

      setDecryptedKey(keyAddress);
      if (encryptedBody) {
        const clearText = await decryptWithAddressKey(encryptedBody, keyAddress);
        setDecryptedBody(clearText);
        setBodyDraft(clearText);
      } else {
        setDecryptedBody('');
        setBodyDraft('');
      }
      setStatus('Key decrypted successfully.');
    } catch (err) {
      console.error('Decrypt failed:', err);
      setStatus('Decryption failed. Make sure you have access.');
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleUpdate = async () => {
    setStatus('');
    if (!ownerAddress || !decryptedKey || !contractAddress || !signerPromise) {
      setStatus('Decrypt the key before updating the document.');
      return;
    }

    setIsUpdating(true);
    try {
      const encrypted = await encryptWithAddressKey(bodyDraft, decryptedKey);
      const signer = await signerPromise;
      const vaultContract = new Contract(contractAddress, CONTRACT_ABI, signer);
      const tx = await vaultContract.updateDocument(ownerAddress, encrypted);
      setStatus('Waiting for confirmation...');
      await tx.wait();
      await refetchDocument();
      setDecryptedBody(bodyDraft);
      setStatus('Document updated.');
    } catch (err) {
      console.error('Update failed:', err);
      setStatus('Update failed. Check access and try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleGrant = async () => {
    setStatus('');
    const normalizedGrant = grantAddress.trim();
    if (!isOwner || !contractAddress || !signerPromise) {
      setStatus('Only the owner can grant access.');
      return;
    }
    if (!ethers.isAddress(normalizedGrant)) {
      setStatus('Enter a valid address to grant access.');
      return;
    }

    setIsGranting(true);
    try {
      const signer = await signerPromise;
      const vaultContract = new Contract(contractAddress, CONTRACT_ABI, signer);
      const tx = await vaultContract.grantAccess(normalizedGrant);
      setStatus('Waiting for confirmation...');
      await tx.wait();
      setStatus('Access granted.');
      setGrantAddress('');
    } catch (err) {
      console.error('Grant access failed:', err);
      setStatus('Grant failed. Check wallet and try again.');
    } finally {
      setIsGranting(false);
    }
  };

  const updatedLabel = updatedAt ? new Date(Number(updatedAt) * 1000).toLocaleString() : 'Not updated';

  return (
    <section className="vault-card open-card">
      <div className="card-header">
        <h3>Open and Edit a Vault</h3>
        <p>Decrypt the key, unlock the body, and publish encrypted changes.</p>
      </div>

      {!contractAddress && (
        <p className="vault-hint error">Contract address is missing. Update it after deployment.</p>
      )}

      <label className="vault-label">
        Document owner address
        <input
          className="vault-input"
          value={ownerInput}
          onChange={(event) => setOwnerInput(event.target.value)}
          placeholder="0x..."
        />
      </label>

      {!exists && ownerAddress && contractAddress && (
        <p className="vault-hint">No document found for this address.</p>
      )}

      {exists && (
        <div className="vault-meta">
          <div>
            <span>Document name</span>
            <strong>{document?.[0] || 'Untitled'}</strong>
          </div>
          <div>
            <span>Last update</span>
            <strong>{updatedLabel}</strong>
          </div>
          <div>
            <span>Access</span>
            <strong>{accessLabel}</strong>
          </div>
        </div>
      )}

      <div className="vault-actions">
        <button className="vault-button ghost" onClick={handleDecrypt} disabled={isDecrypting || !exists}>
          {isDecrypting ? 'Decrypting...' : 'Decrypt Key'}
        </button>
        {decryptedKey && <span className="vault-chip">Key: {decryptedKey}</span>}
      </div>

      <label className="vault-label">
        Document body
        <textarea
          className="vault-textarea"
          rows={6}
          value={bodyDraft}
          onChange={(event) => setBodyDraft(event.target.value)}
          placeholder={decryptedKey ? 'Write your update here...' : 'Decrypt the key to view or edit.'}
          disabled={!decryptedKey}
        />
      </label>

      {exists && !encryptedBody && (
        <p className="vault-hint subtle">No encrypted body stored yet. Save an update to write the first version.</p>
      )}
      {decryptedBody && (
        <p className="vault-hint subtle">Decrypted preview loaded. Edit and encrypt to publish updates.</p>
      )}

      <button
        className="vault-button primary"
        onClick={handleUpdate}
        disabled={isUpdating || !decryptedKey || !exists}
      >
        {isUpdating ? 'Encrypting...' : 'Encrypt and Save'}
      </button>

      {isOwner && exists && (
        <div className="vault-share">
          <h4>Grant access</h4>
          <p>Allow another address to decrypt the key and edit this document.</p>
          <div className="vault-share-row">
            <input
              className="vault-input"
              value={grantAddress}
              onChange={(event) => setGrantAddress(event.target.value)}
              placeholder="0x..."
            />
            <button className="vault-button ghost" onClick={handleGrant} disabled={isGranting}>
              {isGranting ? 'Granting...' : 'Grant'}
            </button>
          </div>
        </div>
      )}

      {status && <p className="vault-hint">{status}</p>}
    </section>
  );
}
