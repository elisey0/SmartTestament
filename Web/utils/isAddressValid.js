import { ethers } from "ethers";

export const isAddressValid = (address) => {
  return ethers.utils.isAddress(address);
};
