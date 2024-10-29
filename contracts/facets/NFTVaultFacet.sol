// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libraries/LibDiamond.sol";

contract NFTVaultFacet is ReentrancyGuard {
    event NFTDeposited(address indexed nft, uint256 indexed tokenId, address indexed owner);
    event NFTWithdrawn(address indexed nft, uint256 indexed tokenId, address indexed owner);
    event NFTSupported(address indexed nft, uint256 collateralFactor);

    function addSupportedNFT(address nftAddress, uint256 collateralFactor) external {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        ds.supportedNFTs[nftAddress] = true;
        ds.collateralFactors[nftAddress] = collateralFactor;
        emit NFTSupported(nftAddress, collateralFactor);
    }

    function depositNFT(address nftAddress, uint256 tokenId) external nonReentrant {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        require(ds.supportedNFTs[nftAddress], "NFT not supported");
        
        IERC721(nftAddress).transferFrom(msg.sender, address(this), tokenId);
        emit NFTDeposited(nftAddress, tokenId, msg.sender);
    }

    function withdrawNFT(address nftAddress, uint256 tokenId) external nonReentrant {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        require(ds.loans[nftAddress][tokenId].borrower == msg.sender, "Not the owner");
        require(!ds.loans[nftAddress][tokenId].active, "Loan still active");

        IERC721(nftAddress).transferFrom(address(this), msg.sender, tokenId);
        emit NFTWithdrawn(nftAddress, tokenId, msg.sender);
    }

    function isNFTSupported(address nftAddress) external view returns (bool) {
        return LibDiamond.diamondStorage().supportedNFTs[nftAddress];
    }

    function getCollateralFactor(address nftAddress) external view returns (uint256) {
        return LibDiamond.diamondStorage().collateralFactors[nftAddress];
    }
}