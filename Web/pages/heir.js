import {
  Web3Button,
  useActiveChain,
  useAddress,
  useContract,
  useContractRead,
} from "@thirdweb-dev/react";
import { useEffect, useState, useContext } from "react";
import { ethers } from "ethers";
import useFetchTestamentsByHeir from "../utils/firebase/fetchTestamentsByHeir";
import NetworkRender from "../components/networkRender";

import { contractsAddresses, localAbi } from "../utils/constants/contractsInfo";
import ChainContext from "../utils/chainContext";
import countdownTimer from "../utils/countdownTimer";
import makeMerkleTree from "../utils/makeMerkleTree";
import getErc20Approvals from "../utils/moralis/getErc20Approvals";
import getErc20Balances from "../utils/moralis/getErc20Balances";
import form from "../styles/home.module.css";

const TokenGrid = ({ tokens }) => {
  return (
    <>
      <h2 style={{ marginBottom: "-10px" }}> Токены в завещании</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "10px",
          marginTop: "20px",
        }}
      >
        {tokens.map(
          (token) =>
            token.balance > 0 && (
              <div
                key={token.erc20Address}
                style={{
                  border: "1px solid #ccc",
                  padding: "10px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div>{token.erc20Symbol}</div>
                <div>
                  {ethers.utils.formatEther(
                    token.balance < token.allowance ? token.balance : token.allowance
                  )}
                </div>
              </div>
            )
        )}
      </div>
    </>
  );
};

function TestamentWithdrawItem({
  dbTestament,
  userAddress,
  selectedChain,
  contractAddress,
  contract,
}) {
  const testamentOwnerAddress = dbTestament.testamentOwner;
  const {
    data: testament,
    isLoading: testamentLoading,
    error,
  } = useContractRead(contract, "testaments", [testamentOwnerAddress]);

  const [confState, setConfState] = useState(false);
  const [unlockTime, setUnlockTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [erc20Info, setErc20Info] = useState(null);
  const handleTimeChange = (value) => {
    setUnlockTime(value);
    setTimeLeft(countdownTimer(value));
  };

  const [heirShare, setHeirShare] = useState(0);
  useEffect(() => {
    if (testament) {
      const confTime = testament.voting.confirmationTime.toNumber();
      if (confTime > 0) {
        setUnlockTime(confTime);
        setTimeLeft(countdownTimer(confTime));
        setConfState(true);
      } else {
        const expTime = testament.expirationTime.toNumber();
        setUnlockTime(expTime);
        setTimeLeft(countdownTimer(expTime));
      }
      if (dbTestament) {
        setHeirShare(
          dbTestament.heirs.find((heir) => heir.heirAddress === userAddress).erc20Share / 100
        );
      }
    }
  }, [testamentLoading, testament]);

  useEffect(() => {
    async function fetchErc20Info() {
      try {
        const responseApprovals = await getErc20Approvals(
          selectedChain,
          testamentOwnerAddress,
          contractAddress
        );
        console.log(responseApprovals.map((item) => item.erc20Address));
        const responseBalances = await getErc20Balances(
          selectedChain,
          responseApprovals.map((item) => item.erc20Address),
          testamentOwnerAddress
        );
        console.log(responseBalances);

        const erc20Info = responseApprovals.map((item) => {
          const matchingObject = responseBalances.find(
            (obj) => obj.token_address === item.erc20Address
          );
          return matchingObject
            ? { ...item, balance: matchingObject.balance }
            : { ...item, balance: 0 };
        });

        setErc20Info(erc20Info);
      } catch (e) {
        console.error(e);
      }
    }
    console.log("fetching");
    fetchErc20Info();
  }, []);

  return (
    <>
      {testamentLoading ? (
        <h1>Подключаемся к контракту</h1>
      ) : (
        <div className={form.testamentFrame}>
          <h1>Завещание {testamentOwnerAddress}</h1>
          {!confState && false ? (
            <>
              <h1 className={form.h1}>Ожидаем консенсуса от доверенных лиц</h1>
              <h3 style={{ marginBottom: "0" }}>
                Через {timeLeft} они смогут запустить голосование, спустя полгода после
              </h3>
              <h3 style={{ margin: "0" }}>
                достижения нужного количества голосов, если завещание не будет удалено
              </h3>
              <h3 style={{ margin: "0" }}>
                вы сможете забрать {heirShare}% ERC-20 токенов от выделенных в наследство.
              </h3>
              <h3 style={{ margin: "0" }}>(после вычета комиссии контракта)</h3>

              {erc20Info ? (
                <TokenGrid tokens={erc20Info} />
              ) : (
                <h3>Загрузка токенов из завещания</h3>
              )}
            </>
          ) : timeLeft && false ? (
            <>
              <h1>Если завещание не отменят через {timeLeft}</h1>
              <h3 style={{ marginBottom: "0" }}>
                Вы сможете забрать {heirShare}% ERC-20 токенов от выделенных в наследство.
              </h3>
              <h3 style={{ margin: "0" }}>(после вычета комиссии контракта)</h3>
              {erc20Info ? (
                <TokenGrid tokens={erc20Info} />
              ) : (
                <h3>Загрузка токенов из завещания</h3>
              )}
            </>
          ) : (
            <>
              <h1 className={form.h1}>Вы можете забрать свою долю токенов</h1>
              <h3 style={{ margin: "0" }}>
                Вы получите {heirShare}% ERC-20 токенов от выделенных в наследство.
              </h3>
              <h3 style={{ margin: "0" }}>(после вычета комиссии контракта)</h3>

              {erc20Info ? (
                <TokenGrid tokens={erc20Info} />
              ) : (
                <h3>Загрузка токенов из завещания</h3>
              )}
              <Web3Button
                contractAddress={contractAddress}
                contractAbi={localAbi}
                action={async (contract) => {
                  try {
                    const merkleTreeData = await makeMerkleTree(dbTestament.heirs);
                    const { root, proofs } = merkleTreeData;
                    await contract.call("withdrawTestament", [
                      testamentOwnerAddress,
                      {
                        erc20Tokens: [
                          "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
                          "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
                        ],
                        erc20Share: heirShare * 100,
                      },
                      proofs[userAddress],
                    ]);
                  } catch (error) {
                    console.log(error);
                  }
                }}
                onSubmit={() => console.log("Транзакция отправлена")}
                className={`${form["form-button"]} }`}
                style={{ marginTop: "20px" }}
              >
                Получить наследство
              </Web3Button>
            </>
          )}
        </div>
      )}
    </>
  );
}

export default function Heir() {
  const { selectedChain, setSelectedChain } = useContext(ChainContext);
  const userAddress = useAddress();
  const contractAddress = contractsAddresses[selectedChain?.chainId] || null;
  const { contract } = useContract(
    contractAddress,
    // selectedChain?.chainId === 1337 ? localAbi : undefined
    localAbi
  );
  const { dbTestaments, loading, error } = useFetchTestamentsByHeir(
    selectedChain.name,
    userAddress
  );

  return (
    <main className={form.main}>
      <NetworkRender
        title="Список завещаний, в которых вы наследник"
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
                <TestamentWithdrawItem
                  key={`testamentVote ${index}`}
                  dbTestament={dbTestament}
                  userAddress={userAddress}
                  selectedChain={selectedChain}
                  contractAddress={contractAddress}
                  contract={contract}
                />
              ))}
            </>
          )}
        </div>
      </NetworkRender>
    </main>
  );
}
