import { createContext } from "react";
import { Mumbai } from "@thirdweb-dev/chains";

const ChainContext = createContext({
  selectedChain: Mumbai,
  setSelectedChain: (chain) => {},
});

export default ChainContext;
