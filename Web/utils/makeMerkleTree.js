import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

async function makeMerkleTree(heirsWithShares) {
  const test = heirsWithShares.map(({ heirAddress, erc20Share }) => [heirAddress, erc20Share]);
  const tree = StandardMerkleTree.of(test, ["address", "uint256"]);

  let proofs = {};
  for (const [i, v] of tree.entries()) {
    const address = v[0];
    const proof = tree.getProof(i);
    proofs[address] = proof;
  }
  const root = tree.root;

  return {
    root,
    proofs,
  };
}

export default makeMerkleTree;
