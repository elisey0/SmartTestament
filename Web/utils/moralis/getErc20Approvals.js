import convertChainToMoralis from "./convertChainToMoralis";
import Moralis from "moralis";

export default async function getErc20Approvals(
  selectedChain,
  testamentOwner,
  contractAddress,
  erc20Address = undefined
) {
  try {
    let response;
    if (erc20Address) {
      response = await Moralis.EvmApi.token.getErc20Approvals({
        chain: convertChainToMoralis(selectedChain.chainId),
        contractAddresses: [erc20Address],
        walletAddresses: [testamentOwner],
      });
    } else {
      response = await Moralis.EvmApi.token.getErc20Approvals({
        chain: convertChainToMoralis(selectedChain.chainId),
        walletAddresses: [testamentOwner],
      });
    }
    const result = [];
    const erc20Addresses = new Set();
    for (const obj of response.raw.result) {
      if (
        obj.to_wallet === contractAddress.toLowerCase() &&
        !erc20Addresses.has(obj.contract_address)
      ) {
        if (obj.value !== "0") {
          result.push({
            erc20Address: obj.contract_address,
            testamentOwnerAddress: obj.from_wallet,
            erc20Symbol: obj.token_symbol,
            erc20Logo: obj.token_logo,
            allowance: obj.value,
          });
          erc20Addresses.add(obj.contract_address);
        } else erc20Addresses.add(obj.contract_address);
      }
    }

    return result;
  } catch (e) {
    console.error(e);
  }
}
