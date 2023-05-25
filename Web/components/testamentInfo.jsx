import { Web3Button, useContractRead } from "@thirdweb-dev/react";
import { useState, useEffect } from "react";
import Slider from "react-slider";
import ReactSelect from "react-select";
import { useHeirs } from "../utils/hooks/useHeirs";
import { useGuardians } from "../utils/hooks/useGuardians";
import { useErc20Tokens } from "../utils/hooks/useErc20Tokens";
import { isAddressValid } from "../utils/isAddressValid";

import { localAbi, tokenAbi, approveMax } from "../utils/constants/contractsInfo";
import { defaultTokensByChain } from "../utils/constants/defaultTokensByChain";
import getErc20Approvals from "../utils/moralis/getErc20Approvals";
import makeMerkleTree from "../utils/makeMerkleTree";
import countdownTimer from "../utils/countdownTimer";

import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../utils/firebase/initFirebase";
import useFetchTestamentByOwner from "../utils/firebase/fetchTestamentByOwner";

import VotedGuardiansList from "../components/votedGuardiansList";
import form from "../styles/home.module.css";
import info from "../styles/info.module.css";

export default function TestamentInfo({
  selectedChain,
  userAddress,
  contractAddress,
  contract,
  testament,
}) {
  const [editHidden, setEditHidden] = useState(true);
  const toggleEditHidden = () => {
    setEditHidden(!editHidden);
  };
  const [removeHidden, setRemoveHidden] = useState(true);
  const toggleRemoveHidden = () => {
    setRemoveHidden(!removeHidden);
  };

  const [lockTime, setLockTime] = useState(1);
  const handleLockTimeChanged = (value) => {
    setLockTime(value);
  };

  const [confState, setConfState] = useState(false);
  const [unlockTime, setUnlockTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  const handleTestamentTimeChanged = (value) => {
    setUnlockTime(value);
    setTimeLeft(value);
  };

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
    }

    async function fetchErc20Approvals() {
      try {
        const response = await getErc20Approvals(selectedChain, userAddress, contractAddress);
        setErc20Tokens(
          response.map((token) => ({
            address: token.erc20Address,
            name: token.erc20Symbol,
            allowance: token.allowance,
          }))
        );
      } catch (e) {
        console.error(e);
      }
    }
    fetchErc20Approvals();
  }, [testament]);

  const { dbTestament, dbLoading, dbError } = useFetchTestamentByOwner(
    selectedChain.name,
    userAddress
  );

  useEffect(() => {
    if (dbTestament) {
      const jsxHeirs = dbTestament.heirs.map((heir) => ({
        ...heir,
        erc20Share: heir.erc20Share / 100,
      }));
      setHeirs(jsxHeirs);
      setGuardians(dbTestament.guardians);
    }
  }, [dbTestament]);

  const {
    heirs,
    setHeirs,
    handleAddHeir,
    handleRemoveHeir,
    handleChangeHeirAddress,
    handleChangePercentage,
    errors: heirsErrors,
  } = useHeirs(userAddress, dbTestament?.heirs);

  const {
    guardians,
    votes,
    errors: guardiansErrors,
    setGuardians,
    handleAddGuardian,
    handleRemoveGuardian,
    handleChangeGuardian,
    handleChangeVotes,
  } = useGuardians(userAddress, testament?.voting.guardians);

  const {
    erc20Tokens,
    errors: erc20TokensErrors,
    setErc20Tokens,
    handleAddErc20Token,
    handleChangeErc20Token,
    handleRemoveErc20Token,
  } = useErc20Tokens(selectedChain, userAddress, contractAddress);
  const defaultTokens = defaultTokensByChain[selectedChain.chainId];
  const [selectedToken, setSelectedToken] = useState("");
  const invalidInputClassName = form["invalid-input"];

  const [invalidInputsCount, setInvalidInputCount] = useState(0);

  useEffect(() => {
    const invalidsInputs = document.querySelectorAll(`.${invalidInputClassName}`);
    setInvalidInputCount(invalidsInputs.length);
  });

  return (
    <>
      <h1>Ваше завещание 📝</h1>
      {confState ? (
        timeLeft != "0 сек." ? (
          <>
            <h1 className={form.h1}>Голосование завершено</h1>
            <h2>Через {timeLeft} наследники смогут забрать активы</h2>
            <h2>Можете удалить завещание, если что-то пошло не так!</h2>
          </>
        ) : (
          <>
            <h1 className={form.h1}>Наследники могут забрать ваши активы</h1>
            <h2>Можете удалить завещание, если что-то пошло не так!</h2>
          </>
        )
      ) : timeLeft != "0 сек." ? (
        <div>
          <h2 className={form.h2}>До начала голосования: {timeLeft}</h2>
          <Web3Button
            contractAddress={contractAddress}
            contractAbi={localAbi}
            action={async (contract) => {
              try {
                await contract.call("imAlive", [lockTime * 360 * 24 * 60 * 60]);
                handleTestamentTimeChanged(lockTime * 360 * 24 * 60 * 60);
              } catch (error) {
                console.log(error);
              }
            }}
            onSubmit={() => console.log("Транзакция отправлена")}
            className={`${form["form-button"]} }`}
          >
            Я живой
          </Web3Button>
          <div className={form["time"]}>
            <div className={form.slider}>
              <Slider
                min={1}
                max={5}
                step={0.5}
                value={lockTime}
                onChange={handleLockTimeChanged}
                renderTrack={(props, state) => <div {...props} className={form["slider-track"]} />}
                renderThumb={(props, state) => <div {...props} className={form["slider-thumb"]} />}
              />
            </div>
            {lockTime == 1 ? (
              <h3 style={{ marginBottom: "30px" }}>Отдалит голосование на {lockTime} год</h3>
            ) : lockTime == 5 ? (
              <h3 style={{ marginBottom: "30px" }}>Отдалит голосование на {lockTime} лет</h3>
            ) : (
              <h3 style={{ marginBottom: "30px" }}>Отдалит голосование на {lockTime} года</h3>
            )}
          </div>

          <h1 onClick={toggleEditHidden} className={` ${info.button} ${form.h1}`}>
            ✏️ Редактирование завещания ✏️
          </h1>
          <div className={`${info.content} ${editHidden ? info.hidden : info.visible}`}>
            <div>
              <h1 className={form.h1}>Обновите список наследников и их долей</h1>
              {heirs.map((heir, index) => (
                <div key={`heir ${index}`} className={form["container"]}>
                  <h3 className={form["index"]}>{index + 1})</h3>
                  <input
                    type="text"
                    value={heir.heirAddress}
                    onChange={(event) => handleChangeHeirAddress(index, event.target.value)}
                    placeholder={`Адрес наследника `}
                    className={`${form["input"]} ${
                      heir.heirAddress === userAddress ||
                      !isAddressValid(heir.heirAddress) ||
                      heirs.some((e, i) => i !== index && e.heirAddress === heir.heirAddress)
                        ? invalidInputClassName
                        : ""
                    }`}
                  />
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={heir.erc20Share}
                      onChange={(event) =>
                        handleChangePercentage(index, parseInt(event.target.value, 10))
                      }
                      placeholder="Процент"
                      className={`${form["input"]} ${form["percentage"]}`}
                    />
                    <span className={form["percent"]}>%</span>
                  </div>

                  {heirs.length > 1 && (
                    <button
                      onClick={() => handleRemoveHeir(index)}
                      className={form["remove-button"]}
                    ></button>
                  )}
                </div>
              ))}

              <button onClick={handleAddHeir} className={form["form-button"]}>
                Добавить наследника
              </button>
              {heirsErrors.erc20Share && <p className={form["error"]}>{heirsErrors.erc20Share}</p>}
              {heirs.map(
                (heir, index) =>
                  heirsErrors[`heirAddress${index}`] && (
                    <p key={`heirError ${index}`} className={form["error"]}>
                      {heirsErrors[`heirAddress${index}`]}
                    </p>
                  )
              )}
            </div>
            {invalidInputsCount > 0 || heirsErrors.erc20Share ? (
              <p className={form["error"]}>Заполните все поля корректно!</p>
            ) : (
              <div className={form["container"]} style={{ margin: "20px" }}>
                <Web3Button
                  contractAddress={contractAddress}
                  contractAbi={localAbi}
                  action={async (contract) => {
                    try {
                      const web3Heirs = heirs.map((heir) => ({
                        ...heir,
                        erc20Share: heir.erc20Share * 100,
                      }));
                      const merkleTreeData = await makeMerkleTree(web3Heirs);
                      const { root } = merkleTreeData;

                      const userRef = doc(db, `${selectedChain.name}`, userAddress);
                      await updateDoc(userRef, {
                        heirs: web3Heirs,
                      });
                      await contract.call("updateHeirs", [root]);
                    } catch (error) {
                      console.log(error);
                    }
                  }}
                  onSubmit={() => console.log("Транзакция отправлена")}
                  className={form["form-button"]}
                >
                  Обновить наследников
                </Web3Button>
              </div>
            )}
            <div>
              <h1 className={form.h1}>Укажите новых доверенных лиц</h1>
              {guardians.map((guardian, index) => (
                <div key={`guardian ${index}`} className={form["container"]}>
                  <h3 className={form["index"]}>{index + 1})</h3>
                  <input
                    type="text"
                    value={guardian.address}
                    placeholder={`Адрес доверенного лица `}
                    onChange={(event) => handleChangeGuardian(index, event.target.value)}
                    className={`${form["input"]} ${
                      guardian.address === userAddress ||
                      !isAddressValid(guardian.address) ||
                      guardians.some((e, i) => i !== index && e.address === guardian.address)
                        ? invalidInputClassName
                        : ""
                    }`}
                  />
                  {guardians.length > 2 && (
                    <button
                      onClick={() => handleRemoveGuardian(index)}
                      className={form["remove-button"]}
                    ></button>
                  )}
                </div>
              ))}
              {guardians.length < 21 && (
                <button onClick={handleAddGuardian} className={form["form-button"]}>
                  Добавить доверенное лицо
                </button>
              )}
              {guardians.map(
                (guardian, index) =>
                  guardiansErrors[`guardianAddress${index}`] && (
                    <p key={`guardianError ${index}`} className={form["error"]}>
                      {guardiansErrors[`guardianAddress${index}`]}
                    </p>
                  )
              )}
            </div>
            <div>
              <h1 className={form.h1}>Необходимое количество голосов</h1>
              <div className={form["container"]}>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={votes}
                  onChange={(event) => handleChangeVotes(parseInt(event.target.value, 10))}
                  className={form["input"]}
                  style={{ width: "50px" }}
                />
                <h3 style={{ padding: "10px", margin: "0" }}>Минимум доверенных лиц должно</h3>
              </div>
              <h3 style={{ margin: "0" }}>проголосовать за распределение наследства</h3>
            </div>
            {invalidInputsCount > 0 ? (
              <p className={form["error"]}>Заполните все поля корректно!</p>
            ) : (
              <div className={form["container"]} style={{ margin: "20px" }}>
                <Web3Button
                  contractAddress={contractAddress}
                  contractAbi={localAbi}
                  action={async (contract) => {
                    try {
                      const userRef = doc(db, `${selectedChain.name}`, userAddress);
                      await updateDoc(userRef, {
                        guardians: guardians,
                      });
                      await contract.call("updateGuardians", [
                        votes,
                        guardians.map((item) => item.address),
                      ]);
                    } catch (error) {
                      console.log(error);
                    }
                  }}
                  onSubmit={() => console.log("Транзакция отправлена")}
                  className={form["form-button"]}
                >
                  Обновить доверенных лиц
                </Web3Button>
              </div>
            )}
            <div className={form["erc20Tokens"]}>
              <h1 className={form.h1}>ERC-20 токены в завещании</h1>
              <div className={form["container"]}>
                <ReactSelect
                  className={`${form.input} ${form["react-select"]}`}
                  value={selectedToken}
                  placeholder="Токены по умолчанию"
                  options={defaultTokens.map((token) => ({
                    value: token.address,
                    label: token.name,
                  }))}
                  onChange={(selectedOption) => {
                    handleAddErc20Token(selectedOption.value, selectedOption.label);
                    setSelectedToken("");
                  }}
                />
              </div>

              {erc20Tokens.map((token, index) => (
                <div key={`token ${index}`} className={form["container"]}>
                  <h3 className={form["index"]}>
                    {token.name ? token.name : <>Токен #{index + 1}</>}
                  </h3>
                  <input
                    type="text"
                    value={token.address}
                    placeholder={`Контракт ERC-20 токена `}
                    onChange={(event) =>
                      handleChangeErc20Token(index, event.target.value, token.name)
                    }
                    className={`${form["input"]} ${
                      token.address === userAddress ||
                      !isAddressValid(token.address) ||
                      erc20Tokens.some(
                        (e, i) =>
                          i !== index && e.address.toLowerCase() === token.address.toLowerCase()
                      )
                        ? invalidInputClassName
                        : ""
                    }`}
                  />

                  {token.allowance > 0 ? (
                    <Web3Button
                      contractAddress={token.address}
                      contractAbi={tokenAbi}
                      action={async (contract) => {
                        try {
                          await contract.call("approve", [contractAddress, 0]);
                          handleRemoveErc20Token(index);
                        } catch (error) {
                          console.error(error);
                        }
                      }}
                      className={`${form["form-button"]} ${form["web3button"]} ${form["error-button"]}`}
                    >
                      Удалить
                    </Web3Button>
                  ) : token.address === userAddress ||
                    !isAddressValid(token.address) ||
                    erc20Tokens.some(
                      (e, i) =>
                        i !== index && e.address.toLowerCase() === token.address.toLowerCase()
                    ) ? (
                    <button
                      disabled={true}
                      className={`${form["form-button"]} ${form["web3button"]}`}
                      style={{ cursor: "not-allowed" }}
                    >
                      ...
                    </button>
                  ) : (
                    <Web3Button
                      contractAddress={token.address}
                      contractAbi={tokenAbi}
                      action={async (contract) => {
                        try {
                          await contract.call("approve", [contractAddress, approveMax]);
                          const allowance = await getErc20Approvals(
                            selectedChain,
                            userAddress,
                            token.address,
                            contractAddress
                          );
                          token.allowance = allowance[0]?.value || 0;
                        } catch (error) {
                          console.error(error);
                        }
                      }}
                      className={form["web3button"]}
                    >
                      Дать доступ контракту
                    </Web3Button>
                  )}
                </div>
              ))}

              <button
                onClick={() => handleAddErc20Token("")}
                className={form["form-button"]}
                style={{ marginBottom: "30px" }}
              >
                Добавить ERC-20 токен
              </button>
              {erc20Tokens.map(
                (erc20, index) =>
                  erc20TokensErrors[`erc20Address${index}`] && (
                    <p key={`tokenError ${index}`} className={form["error"]}>
                      {erc20TokensErrors[`erc20Address${index}`]}
                    </p>
                  )
              )}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <h2 className={form.h2}>Голосование открыто</h2>
          <Web3Button
            contractAddress={contractAddress}
            contractAbi={localAbi}
            action={async (contract) => {
              try {
                await contract.call("imAlive", [lockTime * 360 * 24 * 60 * 60]);
                handleTestamentTimeChanged(lockTime * 360 * 24 * 60 * 60);
              } catch (error) {
                console.log(error);
              }
            }}
            onSubmit={() => console.log("Транзакция отправлена")}
            className={`${form["form-button"]} }`}
          >
            Я живой
          </Web3Button>
          <div className={form["time"]}>
            <div className={form.slider}>
              <Slider
                min={1}
                max={5}
                step={0.5}
                value={lockTime}
                onChange={handleLockTimeChanged}
                renderTrack={(props, state) => <div {...props} className={form["slider-track"]} />}
                renderThumb={(props, state) => <div {...props} className={form["slider-thumb"]} />}
              />
            </div>
            {lockTime == 1 ? (
              <h3 style={{ marginBottom: "30px" }}>
                Отменит голоса и сдвинет голосование на {lockTime} год
              </h3>
            ) : lockTime == 5 ? (
              <h3 style={{ marginBottom: "30px" }}>
                Отменит голоса и сдвинет голосование на {lockTime} лет
              </h3>
            ) : (
              <h3 style={{ marginBottom: "30px" }}>
                Отменит голоса и сдвинет голосование на {lockTime} года
              </h3>
            )}
          </div>
        </div>
      )}
      {dbLoading ? <h1>Подключаемся к БД</h1> : <div></div>}
      <VotedGuardiansList
        contract={contract}
        testamentOwnerAddress={userAddress}
        testament={testament}
      />
      <h2
        onClick={toggleRemoveHidden}
        className={` ${info.button} ${form.h1}`}
        style={{ marginBottom: "10px" }}
      >
        ❌ Удаление завещания ❌
      </h2>

      <div className={`${info.content} ${removeHidden ? info.hidden : info.visible}`}>
        <Web3Button
          contractAddress={contractAddress}
          contractAbi={localAbi}
          action={async (contract) => {
            try {
              await contract.call("deleteTestament");
              await deleteDoc(doc(db, `${selectedChain.name}`, userAddress));
            } catch (error) {
              console.log(error);
            }
          }}
          onSubmit={() => console.log("Транзакция отправлена")}
          className={`${form["form-button"]} ${form["error-button"]}`}
          style={{ margin: "10px" }}
        >
          Удалить завещание
        </Web3Button>
      </div>
    </>
  );
}
