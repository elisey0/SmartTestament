export default function convertChainToMoralis(chainId) {
  switch (chainId) {
    case 80001:
      return "0x13881";
    case 97:
      return "0x61";
    case 11155111:
      return "0xaa36a7";
    default:
      return "";
  }
}
