import ConnectPage from "./connectPage";
import ChainsBlock from "./chainsBlock";
import { contractsAddresses } from "../utils/constants/contractsInfo";

export default function NetworkCheck({
  title,
  address,
  selectedChain,
  setSelectedChain,
  children,
}) {
  if (!address) {
    return <ConnectPage />;
  } else if (
    typeof selectedChain === "undefined" ||
    !(selectedChain.chainId in contractsAddresses)
  ) {
    return (
      <ChainsBlock
        title="Подключите одну из поддерживаемых сетей"
        selectedChain={selectedChain}
        setSelectedChain={setSelectedChain}
      />
    );
  } else {
    return (
      <ChainsBlock title={title} selectedChain={selectedChain} setSelectedChain={setSelectedChain}>
        {children}
      </ChainsBlock>
    );
  }
}
