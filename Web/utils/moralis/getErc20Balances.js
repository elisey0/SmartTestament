import convertChainToMoralis from "./convertChainToMoralis";
import Moralis from "moralis";

export default async function getErc20Balances(selectedChain, tokenAddresses, testamentOwner) {
  try {
    console.log(convertChainToMoralis(selectedChain.chainId), tokenAddresses, testamentOwner);
    const response = await Moralis.EvmApi.token.getWalletTokenBalances({
      chain: convertChainToMoralis(selectedChain.chainId),
      tokenAddresses: tokenAddresses,
      address: testamentOwner,
    });

    return response.raw;
  } catch (e) {
    console.error(e);
  }
}
