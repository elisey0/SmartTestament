const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { makeMerkleTree } = require("../utils/makeMerkleTree");
const { expect } = require("chai");

const approveMax = "115792089237316195423570985008687907853269984665640564039457584007913129639935"; //(2^256 - 1 )
const BASE_POINT = 10000;
const FEE_BP = 100;
const MIN_TESTAMENT_LOCK = 31104000;
const erc20Shares = [1000, 3000, 6000];
const neededVotes = 2;

function inheritanceAmount(tokenAmount, share) {
  return tokenAmount
    .mul(BASE_POINT - FEE_BP)
    .mul(share)
    .div(BASE_POINT)
    .div(BASE_POINT);
}

async function skipToUnlock(testamentContract, owner) {
  await time.increaseTo((await testamentContract.testaments(owner)).expirationTime);
  await time.increase((await testamentContract.CONTINGENCY_PERIOD()).add(1));
}

async function createTestament(testamentContract, owner, heir, guardian2, feeAddress) {
  const heirsWithShares = [
    {
      heirAddress: heir.address,
      erc20Share: erc20Shares[0],
    },
    {
      heirAddress: guardian2.address,
      erc20Share: erc20Shares[1],
    },
    {
      heirAddress: feeAddress.address,
      erc20Share: erc20Shares[2],
    },
  ];

  const merkleTreeData = await makeMerkleTree(heirsWithShares);
  const { root, proofs } = merkleTreeData;

  await testamentContract
    .connect(owner)
    .createTestament(MIN_TESTAMENT_LOCK, neededVotes, [heir.address, guardian2.address], root);
  return { heirsWithShares, merkleTreeData };
}

describe("Testing SmartTestament", function () {
  async function deployTestamentCryptoFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, heir, guardian2, feeAddress] = await ethers.getSigners();

    const TestamentContract = await hre.ethers.getContractFactory("SmartTestament");
    const testamentContract = await TestamentContract.connect(feeAddress).deploy();
    await testamentContract.deployed();

    const WethContract = await hre.ethers.getContractFactory("WETH");
    const wethContract = await WethContract.deploy("WETH", "WETH");
    await wethContract.deployed();
    await wethContract.approve(testamentContract.address, approveMax);
    await wethContract.connect(guardian2).approve(testamentContract.address, approveMax);

    let otherWethContractsAddresses = [];
    for (let i = 0; i < 20; i++) {
      const wethContract = await WethContract.deploy(`${i}`, `${i}`);
      wethContract.deployed();
      await wethContract.approve(testamentContract.address, approveMax);
      await wethContract.connect(guardian2).approve(testamentContract.address, approveMax);
      otherWethContractsAddresses.push(wethContract.address);
    }

    // Fixtures can return anything you consider useful for your tests
    return {
      testamentContract,
      wethContract,
      otherWethContractsAddresses,
      owner,
      heir,
      guardian2,
      feeAddress,
    };
  }

  beforeEach(async function () {
    const {
      testamentContract,
      wethContract,
      otherWethContractsAddresses,
      owner,
      heir,
      guardian2,
      feeAddress,
    } = await loadFixture(deployTestamentCryptoFixture);

    this.testamentContract = testamentContract;
    this.wethContract = wethContract;
    this.otherWethContractsAddresses = otherWethContractsAddresses;
    this.owner = owner;
    this.heir = heir;
    this.guardian2 = guardian2;
    this.feeAddress = feeAddress;
  });

  describe("Deployment of contract", function () {
    it("Should set the right feeAddress", async function () {
      expect(await this.testamentContract.feeAddress()).to.equal(this.feeAddress.address);
    });

    it("Owner should not have testament", async function () {
      expect(await this.testamentContract.getTestamentState(this.owner.address)).to.equal(0);
    });
  });

  describe("Contract logic testing", function () {
    beforeEach(async function () {
      const { heirsWithShares, merkleTreeData } = await createTestament(
        this.testamentContract,
        this.owner,
        this.heir,
        this.guardian2,
        this.feeAddress
      );

      this.heirsWithShares = heirsWithShares;
      this.merkleTreeData = merkleTreeData;
      this.proofs = merkleTreeData.proofs;
      this.heirErc20Share = heirsWithShares.find(
        (e) => e.heirAddress == this.heir.address
      ).erc20Share;
    });

    describe("Create Testament", function () {
      it("Owner testament should have OwnerAlive state", async function () {
        expect(await this.testamentContract.getTestamentState(this.owner.address)).to.equal(1);
      });

      it("Owner should don`t have two testaments", async function () {
        await expect(
          createTestament(
            this.testamentContract,
            this.owner,
            this.heir,
            this.guardian2,
            this.feeAddress
          )
        ).to.be.revertedWith("Already exists");
      });

      it("Roots must be equal", async function () {
        const heirsWithShares = [
          {
            heirAddress: this.heir.address,
            erc20Share: erc20Shares[0],
          },
          {
            heirAddress: this.guardian2.address,
            erc20Share: erc20Shares[1],
          },
          {
            heirAddress: this.feeAddress.address,
            erc20Share: erc20Shares[2],
          },
        ];

        const merkleTreeData = await makeMerkleTree(heirsWithShares);
        const { root } = merkleTreeData;
        expect(
          (await this.testamentContract.testaments(this.owner.address)).erc20HeirsMerkleRoot
        ).to.equal(root);
      });
    });

    describe("Withdraw Testament", function () {
      describe("Validations", function () {
        it("Should revert with the death must be confirmed if called too soon", async function () {
          await expect(
            this.testamentContract.connect(this.heir).withdrawTestament(
              this.owner.address,
              {
                erc20Tokens: [this.wethContract.address],
                erc20Share: this.heirErc20Share,
              },
              this.proofs[this.heir.address]
            )
          ).to.be.revertedWith("Testament must be Unlocked");
        });

        it("Shouldn't reverted if the DeathConfirmed", async function () {
          await skipToUnlock(this.testamentContract, this.owner.address);
          await expect(
            this.testamentContract.connect(this.heir).withdrawTestament(
              this.owner.address,
              {
                erc20Tokens: [this.wethContract.address],
                erc20Share: this.heirErc20Share,
              },
              this.proofs[this.heir.address]
            )
          ).not.to.be.reverted;
        });

        it("Should return false to address not in testament", async function () {
          expect(
            await this.testamentContract
              .connect(this.owner)
              .isHeir(this.owner.address, this.heirErc20Share, this.proofs[this.heir.address])
          ).to.equal(false);
        });

        it("Should return true to address in testament", async function () {
          const heirsWithShares = [
            {
              heirAddress: this.heir.address,
              erc20Share: erc20Shares[0],
            },
            {
              heirAddress: this.guardian2.address,
              erc20Share: erc20Shares[1],
            },
            {
              heirAddress: this.feeAddress.address,
              erc20Share: erc20Shares[2],
            },
          ];

          const merkleTreeData = await makeMerkleTree(heirsWithShares);
          const { proofs } = merkleTreeData;

          expect(
            await this.testamentContract
              .connect(this.heir)
              .isHeir(this.owner.address, this.heirErc20Share, proofs[this.heir.address])
          ).to.equal(true);
        });
      });
      describe("Transfers", function () {
        it("Should transfer the funds to the heir", async function () {
          await skipToUnlock(this.testamentContract, this.owner.address);
          const wethAmount = await this.wethContract.balanceOf(this.owner.address);

          await expect(
            this.testamentContract.connect(this.heir).withdrawTestament(
              this.owner.address,
              {
                erc20Tokens: [this.wethContract.address],
                erc20Share: this.heirErc20Share,
              },
              this.proofs[await this.heir.address]
            )
          ).to.changeTokenBalances(
            this.wethContract,
            [this.owner, this.heir],
            [
              "-" +
                wethAmount
                  .mul(FEE_BP)
                  .div(BASE_POINT)
                  .add(inheritanceAmount(wethAmount, this.heirErc20Share)),
              "" + inheritanceAmount(wethAmount, this.heirErc20Share),
            ]
          );
        });

        it("Shouldn`t be exploitable for error merkle root", async function () {
          const heir2Signers = await ethers.getSigners();
          const heirsWithShares = [
            {
              heirAddress: heir2Signers[5].address,
              erc20Share: 9000,
            },
            {
              heirAddress: heir2Signers[6].address,
              erc20Share: 5000,
            },
            {
              heirAddress: heir2Signers[7].address,
              erc20Share: 6000,
            },
          ];

          const merkleTreeData2 = await makeMerkleTree(heirsWithShares);
          const { root } = merkleTreeData2;

          await this.testamentContract
            .connect(this.guardian2)
            .createTestament(
              MIN_TESTAMENT_LOCK,
              neededVotes,
              [this.heir.address, this.guardian2.address],
              root
            );

          await skipToUnlock(this.testamentContract, this.owner.address);

          await this.wethContract.connect(this.guardian2).mint();

          const wethAmount = await this.wethContract.balanceOf(this.owner.address);

          await expect(
            this.testamentContract.connect(this.heir).withdrawTestament(
              this.owner.address,
              {
                erc20Tokens: [this.wethContract.address],
                erc20Share: this.heirErc20Share,
              },
              this.proofs[await this.heir.address]
            )
          ).to.changeTokenBalances(
            this.wethContract,
            [this.owner, this.heir],
            [
              "-" +
                wethAmount
                  .mul(FEE_BP)
                  .div(BASE_POINT)
                  .add(inheritanceAmount(wethAmount, this.heirErc20Share)),
              "" + inheritanceAmount(wethAmount, this.heirErc20Share),
            ]
          );

          await expect(
            this.testamentContract.connect(heir2Signers[5]).withdrawTestament(
              this.guardian2.address,
              {
                erc20Tokens: [this.wethContract.address],
                erc20Share: 9000,
              },
              merkleTreeData2.proofs[await heir2Signers[5].address]
            )
          ).not.to.be.reverted;

          await expect(
            this.testamentContract.connect(heir2Signers[6]).withdrawTestament(
              this.guardian2.address,
              {
                erc20Tokens: [this.wethContract.address],
                erc20Share: 5000,
              },
              merkleTreeData2.proofs[await heir2Signers[6].address]
            )
          ).to.be.reverted;
        });

        it("Mass tokens withdraw checking", async function () {
          await skipToUnlock(this.testamentContract, this.owner.address);
          const wethAmount = await this.wethContract.balanceOf(this.owner.address);

          await expect(
            this.testamentContract.connect(this.heir).withdrawTestament(
              this.owner.address,
              {
                erc20Tokens: [this.wethContract.address].concat(this.otherWethContractsAddresses),
                erc20Share: this.heirErc20Share,
              },
              this.proofs[await this.heir.address]
            )
          ).to.changeTokenBalances(
            this.wethContract,
            [this.owner, this.heir],
            [
              "-" +
                wethAmount
                  .mul(FEE_BP)
                  .div(BASE_POINT)
                  .add(inheritanceAmount(wethAmount, this.heirErc20Share)),
              "" + inheritanceAmount(wethAmount, this.heirErc20Share),
            ]
          );

          await expect(
            this.testamentContract.connect(this.guardian2).withdrawTestament(
              this.owner.address,
              {
                erc20Tokens: [this.wethContract.address].concat(this.otherWethContractsAddresses),
                erc20Share: erc20Shares[1],
              },
              this.proofs[await this.guardian2.address]
            )
          ).to.changeTokenBalances(
            this.wethContract,
            [this.owner, this.guardian2],
            [
              "-" + inheritanceAmount(wethAmount, erc20Shares[1]),
              "" + inheritanceAmount(wethAmount, erc20Shares[1]),
            ]
          );

          await expect(
            this.testamentContract.connect(this.feeAddress).withdrawTestament(
              this.owner.address,
              {
                erc20Tokens: [this.wethContract.address].concat(this.otherWethContractsAddresses),
                erc20Share: erc20Shares[2],
              },
              this.proofs[await this.feeAddress.address]
            )
          ).to.changeTokenBalances(
            this.wethContract,
            [this.owner, this.feeAddress],
            [
              "-" + inheritanceAmount(wethAmount, erc20Shares[2]),
              "" + inheritanceAmount(wethAmount, erc20Shares[2]),
            ]
          );
        });
      });
    });

    describe("Voting System", function () {
      it("Get Voted Guardians", async function () {
        await time.increaseTo(
          (await this.testamentContract.testaments(this.owner.address)).expirationTime.add(1)
        );
        await this.testamentContract.connect(this.guardian2).voteForUnlock(this.owner.address);
        expect(await this.testamentContract.getVotedGuardians(this.owner.address)).to.eql([
          this.guardian2.address,
        ]);
      });

      it("Right voting amount", async function () {
        await time.increaseTo(
          (await this.testamentContract.testaments(this.owner.address)).expirationTime.add(1)
        );
        await this.testamentContract.connect(this.guardian2).voteForUnlock(this.owner.address);
        await this.testamentContract.connect(this.heir).voteForUnlock(this.owner.address);
        expect(await this.testamentContract.getApproveVotesAmount(this.owner.address)).to.eql(
          ethers.BigNumber.from("2")
        );
      });
    });
  });
});
