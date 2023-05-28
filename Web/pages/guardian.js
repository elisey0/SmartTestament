import {
  Web3Button,
  useActiveChain,
  useAddress,
  useContract,
  useContractRead,
} from "@thirdweb-dev/react";
import { ethers } from "ethers";
import { useEffect, useState, useContext } from "react";
import useFetchTestamentsByGuardian from "../utils/firebase/fetchTestamentsByGuardian";

import { contractsAddresses, localAbi } from "../utils/constants/contractsInfo";
import ChainContext from "../utils/chainContext";

import VotedGuardiansList from "../components/votedGuardiansList";
import NetworkRender from "../components/networkRender";
import form from "../styles/home.module.css";

import countdownTimer from "../utils/countdownTimer";

function TestamentVoteItem({ dbTestament, contractAddress, contract, userAddress }) {
  const testamentOwnerAddress = dbTestament.testamentOwner;
  const {
    data: testament,
    isLoading: testamentLoading,
    error,
  } = useContractRead(contract, "testaments", [testamentOwnerAddress]);

  const [unlockTime, setUnlockTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!testamentLoading && testament) {
      const confTime = testament?.voting.confirmationTime.toNumber();
      if (confTime > 0) {
        setUnlockTime(0);
      } else {
        const expTime = testament?.expirationTime.toNumber();
        setUnlockTime(expTime);
        setTimeLeft(countdownTimer(expTime));
      }
    }
  }, [testamentLoading, testament]);

  const handleTimeChange = (value) => {
    setUnlockTime(value);
    setTimeLeft(countdownTimer(value));
  };

  const { data: votedGuardians, isLoading: guardiansLoading } = useContractRead(
    contract,
    "getVotedGuardians",
    [testamentOwnerAddress]
  );

  const filteredVotedGuardians = votedGuardians?.filter(
    (address) => address !== ethers.constants.AddressZero
  );

  if (testamentLoading || guardiansLoading) {
    return <h1>Подключаемся к контракту</h1>;
  }

  return (
    <div className={form.testamentFrame}>
      <h1>Завещание {testamentOwnerAddress}</h1>
      {unlockTime === 0 ? (
        <h1 className={form.h1}>Голосование завершено</h1>
      ) : filteredVotedGuardians.includes(userAddress) ? (
        <h1 className={form.h1}>Вы успешно проголосовали</h1>
      ) : timeLeft ? (
        <h1>Голосовать можно через {timeLeft}</h1>
      ) : (
        <>
          <Web3Button
            contractAddress={contractAddress}
            contractAbi={localAbi}
            action={async (contract) => {
              try {
                await contract.call("voteForUnlock", [testamentOwnerAddress]);
                handleTimeChange(unlockTime + 360 * 24 * 60 * 60);
              } catch (error) {
                console.log(error);
              }
            }}
            onSubmit={() => console.log("Транзакция отправлена")}
            className={`${form["form-button"]} }`}
          >
            Проголосовать
          </Web3Button>
          <h3 style={{ marginBottom: "0" }}>
            Инициируя транзакцию, вы подтверждаете смерть завещателя.
          </h3>
          <h3 style={{ margin: "0" }}>
            Если через полгода, после достижения консенсуса, завещание не будет удалено
          </h3>
          <h3 style={{ margin: "0" }}>тогда наследники смогут забрать средства.</h3>
        </>
      )}
      <VotedGuardiansList
        contract={contract}
        testamentOwnerAddress={testamentOwnerAddress}
        testament={testament}
      />
    </div>
  );
}

export default function Guardian() {
  const { selectedChain, setSelectedChain } = useContext(ChainContext);
  const userAddress = useAddress();
  const contractAddress = contractsAddresses[selectedChain?.chainId] || null;
  const { contract } = useContract(
    contractAddress,
    // selectedChain?.chainId === 1337 ? localAbi : undefined
    localAbi
  );

  const { dbTestaments, setTestaments, loading } = useFetchTestamentsByGuardian(
    selectedChain.name,
    userAddress
  );

  return (
    <main className={form.main}>
      <NetworkRender
        title="Список завещаний, в которых вы доверенное лицо"
        selectedChain={selectedChain}
        address={userAddress}
        setSelectedChain={setSelectedChain}
      >
        <div className={form["form-container"]}>
          {loading ? (
            <h1>Подключаемся к БД</h1>
          ) : dbTestaments.length === 0 ? (
            <h1>Вы не подключены ни к одному завещанию в этой сети</h1>
          ) : (
            <>
              {dbTestaments.map((dbTestament, index) => (
                <TestamentVoteItem
                  key={`testamentVote ${index}`}
                  dbTestament={dbTestament}
                  contractAddress={contractAddress}
                  contract={contract}
                  userAddress={userAddress}
                />
              ))}
            </>
          )}
        </div>
      </NetworkRender>
    </main>
  );
}
