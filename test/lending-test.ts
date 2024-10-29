const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFT Lending Platform", function () {
  let diamond;
  let nftVaultFacet;
  let lendingFacet;
  let mockNFT;
  let owner;
  let borrower;

  beforeEach(async function () {
    [owner, borrower] = await ethers.getSigners();

    // Deploy Mock NFT
    const MockNFT = await ethers.getContractFactory("MockNFT");
    mockNFT = await MockNFT.deploy();
    await mockNFT.deployed();

    // Deploy Diamond
    const Diamond = await ethers.getContractFactory("Diamond");
    diamond = await Diamond.deploy(owner.address);
    await diamond.deployed();

    // Deploy Facets
    const NFTVaultFacet = await ethers.getContractFactory("NFTVaultFacet");
    nftVaultFacet = await NFTVaultFacet.deploy();
    await nftVaultFacet.deployed();

    const LendingFacet = await ethers.getContractFactory("LendingFacet");
    lendingFacet = await LendingFacet.deploy();
    await lendingFacet.deployed();

    // Add facets to diamond
    const selectors = {
      NFTVaultFacet: Object.keys(NFTVaultFacet.interface.functions).map(
        (fn) => NFTVaultFacet.interface.getSighash(fn)
      ),
      LendingFacet: Object.keys(LendingFacet.interface.functions).map(
        (fn) => LendingFacet.interface.getSighash(fn)
      ),
    };

    await diamond.diamondCut(
      [
        {
          facetAddress: nftVaultFacet.address,
          action: 0, // add
          functionSelectors: selectors.NFTVaultFacet,
        },
        {
          facetAddress: lendingFacet.address,
          action: 0,
          functionSelectors: selectors.LendingFacet,
        },
      ],
      ethers.constants.AddressZero,
      "0x"
    );

    // Get facets from diamond
    nftVaultFacet = await ethers.getContractAt("NFTVaultFacet", diamond.address);
    lendingFacet = await ethers.getContractAt("LendingFacet", diamond.address);
  });

  describe("NFT Vault", function () {
    it("Should add supported NFT", async function () {
      await nftVaultFacet.addSupportedNFT(mockNFT.address, 7000); // 70% collateral factor
      expect(await nftVaultFacet.isNFTSupported(mockNFT.address)).to.be.true;
      expect(await nftVaultFacet.getCollateralFactor(mockNFT.address)).to.equal(7000);
    });

    it("Should deposit NFT", async function () {
      // Add NFT support
      await nftVaultFacet.addSupportedNFT(mockNFT.address, 7000);

      // Mint NFT to borrower
      await mockNFT.mint(borrower.address, 1);
      
      // Approve and deposit
      await mockNFT.connect(borrower).approve(diamond.address, 1);
      await nftVaultFacet.connect(borrower).depositNFT(mockNFT.address, 1);
      
      expect(await mockNFT.ownerOf(1)).to.equal(diamond.address);
    });
  });
});