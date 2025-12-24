// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, eaddress, externalEaddress} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title DeepVault encrypted document storage
/// @notice Stores an encrypted document key on-chain and an encrypted document body off-chain.
contract DeepVault is ZamaEthereumConfig {
    struct Document {
        string name;
        string encryptedBody;
        eaddress encryptedKey;
        uint256 updatedAt;
        bool exists;
    }

    mapping(address => Document) private _documents;
    mapping(address => mapping(address => bool)) private _access;

    event DocumentCreated(address indexed owner, string name);
    event DocumentUpdated(address indexed owner, address indexed editor, uint256 timestamp);
    event AccessGranted(address indexed owner, address indexed grantee);

    /// @notice Create a document for the caller with an encrypted key.
    /// @param name Document name stored in plaintext
    /// @param encryptedBody Encrypted document body (empty string allowed)
    /// @param encryptedKey Encrypted address key (eaddress) for client-side encryption
    /// @param inputProof Proof for the encrypted input
    function createDocument(
        string calldata name,
        string calldata encryptedBody,
        externalEaddress encryptedKey,
        bytes calldata inputProof
    ) external {
        require(!_documents[msg.sender].exists, "Document already exists");

        eaddress key = FHE.fromExternal(encryptedKey, inputProof);
        _documents[msg.sender] = Document({
            name: name,
            encryptedBody: encryptedBody,
            encryptedKey: key,
            updatedAt: block.timestamp,
            exists: true
        });

        FHE.allowThis(key);
        FHE.allow(key, msg.sender);

        emit DocumentCreated(msg.sender, name);
    }

    /// @notice Update a document body for an owner, allowed for owner or granted editors.
    /// @param owner Document owner address
    /// @param encryptedBody New encrypted body
    function updateDocument(address owner, string calldata encryptedBody) external {
        require(_documents[owner].exists, "Document not found");
        require(msg.sender == owner || _access[owner][msg.sender], "Not authorized");

        _documents[owner].encryptedBody = encryptedBody;
        _documents[owner].updatedAt = block.timestamp;

        emit DocumentUpdated(owner, msg.sender, block.timestamp);
    }

    /// @notice Grant access to decrypt the encrypted key.
    /// @param grantee Address to grant access
    function grantAccess(address grantee) external {
        require(_documents[msg.sender].exists, "Document not found");
        require(grantee != address(0), "Invalid grantee");
        _access[msg.sender][grantee] = true;
        FHE.allow(_documents[msg.sender].encryptedKey, grantee);

        emit AccessGranted(msg.sender, grantee);
    }

    /// @notice Returns the document data for an owner.
    /// @param owner Document owner address
    function getDocument(
        address owner
    )
        external
        view
        returns (string memory name, string memory encryptedBody, eaddress encryptedKey, uint256 updatedAt, bool exists)
    {
        Document storage doc = _documents[owner];
        return (doc.name, doc.encryptedBody, doc.encryptedKey, doc.updatedAt, doc.exists);
    }

    /// @notice Check if a user has access to a document.
    /// @param owner Document owner address
    /// @param user User address
    function hasAccess(address owner, address user) external view returns (bool) {
        if (owner == user) {
            return true;
        }
        return _access[owner][user];
    }

    /// @notice Returns true if a document exists for the owner.
    /// @param owner Document owner address
    function documentExists(address owner) external view returns (bool) {
        return _documents[owner].exists;
    }
}
