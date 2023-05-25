import br from "../styles/button.row.module.css";
import form from "../styles/home.module.css";
import common from "../styles/common.module.css";
import { useEffect } from "react";
import { MediaRenderer, useSwitchChain, useActiveChain } from "@thirdweb-dev/react";
import { Mumbai, BinanceTestnet, Ethereum, Sepolia, Localhost } from "@thirdweb-dev/chains";

export default function ChainsBlock({ title, selectedChain, setSelectedChain, children }) {
  const switchChain = useSwitchChain();
  const selectedChainId = selectedChain.chainId;
  const activeChain = useActiveChain();

  useEffect(() => {
    if (activeChain.chainId !== selectedChainId) {
      setSelectedChain(activeChain);
    }
  }, [activeChain, selectedChain]);

  return (
    <>
      <p className={form.title}>{title}</p>
      <div id="testamentForm" className={form["form-wrapper"]}>
        <div className={`${form["form-border"]} ${common[`color-${selectedChainId}`]}`}>
          <div className={br["button-row"]}>
            <button
              onClick={() => {
                switchChain(Mumbai.chainId);
              }}
              className={br["left-button"] + [selectedChainId == 80001 ? ` ${br[`active`]}` : ""]}
            >
              <div className={br["image"]}>
                <MediaRenderer src={Mumbai.icon.url} width="40px" height="40px" />
              </div>
              Polygon Mumbai
            </button>
            <button
              onClick={() => {
                switchChain(BinanceTestnet.chainId);
              }}
              className={
                br["center-button"] +
                [selectedChainId == 97 ? ` ${br[`active`]} ${br[`disabled`]}` : ""]
              }
            >
              <div className={br["image"]}>
                <MediaRenderer src={BinanceTestnet.icon.url} width="40px" height="40px" />
              </div>
              BSC Testnet
            </button>
            <button
              onClick={() => {
                switchChain(Sepolia.chainId);
              }}
              className={
                br["right-button"] + [selectedChainId == 11155111 ? ` ${br[`active`]}` : ""]
              }
            >
              <div className={br["image"]}>
                <MediaRenderer src={Ethereum.icon.url} width="40px" height="40px" />
              </div>
              Sepolia Ethereum
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
