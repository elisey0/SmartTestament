import { useAddress, useContract, useContractRead } from "@thirdweb-dev/react";
import { useContext } from "react";
import { contractsAddresses, localAbi } from "../utils/constants/contractsInfo";

import ChainContext from "../utils/chainContext";

import NetworkRender from "../components/networkRender";
import CreateTestamentForm from "../components/createTestamentForm";
import TestamentInfo from "../components/testamentInfo";

import form from "../styles/home.module.css";

export default function Home() {
  const { selectedChain, setSelectedChain } = useContext(ChainContext);
  const userAddress = useAddress();
  const contractAddress = contractsAddresses[selectedChain?.chainId] || null;
  const { contract } = useContract(contractAddress, localAbi);
  const {
    data: testament,
    isLoading: testamentLoading,
    error,
  } = useContractRead(contract, "testaments", [userAddress]);

  const expirationTime = testament?.expirationTime.toNumber();

  return (
    <main className={form.main}>
      <NetworkRender
        title={"Просмотр и редактирование своих завещаний"}
        address={userAddress}
        selectedChain={selectedChain}
        setSelectedChain={setSelectedChain}
      >
        <div className={form["form-container"]}>
          {testamentLoading ? (
            <h1>Подключаемся к контракту</h1>
          ) : expirationTime === 0 ? (
            <CreateTestamentForm
              selectedChain={selectedChain}
              userAddress={userAddress}
              contractAddress={contractAddress}
            />
          ) : (
            <TestamentInfo
              selectedChain={selectedChain}
              userAddress={userAddress}
              contractAddress={contractAddress}
              contract={contract}
              testament={testament}
            />
          )}
        </div>
      </NetworkRender>
    </main>
  );
}
