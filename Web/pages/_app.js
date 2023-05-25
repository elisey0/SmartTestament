import { ThirdwebProvider, useActiveChain } from "@thirdweb-dev/react";
import { Mumbai, BinanceTestnet, Sepolia, Localhost } from "@thirdweb-dev/chains";
import Layout from "../components/layout";
import { useMoralisInitialize } from "../utils/moralis/useMoralisInit";
import { useState } from "react";
import ChainContext from "../utils/chainContext";
import "../styles/globals.css";
function MyApp({ Component, pageProps }) {
  const [selectedChain, setSelectedChain] = useState(Mumbai);
  useMoralisInitialize();

  return (
    <ChainContext.Provider value={{ selectedChain, setSelectedChain }}>
      <ThirdwebProvider
        activeChain={selectedChain}
        supportedChains={[Mumbai, BinanceTestnet, Sepolia, Localhost]}
        autoConnect={true}
      >
        <Layout selectedChain={selectedChain}>
          <Component {...pageProps} setSelectedChain={setSelectedChain} />
        </Layout>
      </ThirdwebProvider>
    </ChainContext.Provider>
  );
}

export default MyApp;
