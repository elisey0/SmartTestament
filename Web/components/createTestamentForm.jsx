import { Web3Button } from "@thirdweb-dev/react";
import { useEffect, useState } from "react";
import Slider from "react-slider";
import ReactSelect from "react-select";
import { useHeirs } from "../utils/hooks/useHeirs";
import { useGuardians } from "../utils/hooks/useGuardians";
import { useErc20Tokens } from "../utils/hooks/useErc20Tokens";
import { isAddressValid } from "../utils/isAddressValid";

import { localAbi, tokenAbi, approveMax } from "../utils/constants/contractsInfo";
import { defaultTokensByChain } from "../utils/constants/defaultTokensByChain";
import getErc20Approvals from "../utils/moralis/getErc20Approvals";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../utils/firebase/initFirebase";

import makeMerkleTree from "../utils/makeMerkleTree";
import form from "../styles/home.module.css";
import info from "../styles/info.module.css";

export default function CreateTestamentForm({ selectedChain, userAddress, contractAddress }) {
  const [editHidden, setEditHidden] = useState(true);
  const toggleEditHidden = () => {
    setEditHidden(!editHidden);
  };

  const {
    heirs,
    handleAddHeir,
    handleRemoveHeir,
    handleChangeHeirAddress,
    handleChangePercentage,
    errors: heirsErrors,
  } = useHeirs(userAddress);
  const {
    guardians,
    votes,
    errors: guardiansErrors,
    handleAddGuardian,
    handleRemoveGuardian,
    handleChangeGuardian,
    handleChangeVotes,
  } = useGuardians(userAddress);

  const {
    erc20Tokens,
    errors: erc20TokensErrors,
    handleAddErc20Token,
    handleChangeErc20Token,
    handleRemoveErc20Token,
  } = useErc20Tokens(selectedChain, userAddress, contractAddress);
  const defaultTokens = defaultTokensByChain[selectedChain.chainId];
  const [selectedToken, setSelectedToken] = useState("");
  const invalidInputClassName = form["invalid-input"];

  const [time, setTime] = useState(1);
  const handleTimeChange = (value) => {
    setTime(value);
  };

  const [invalidInputsCount, setInvalidInputCount] = useState(0);

  useEffect(() => {
    const invalidsInputs = document.querySelectorAll(`.${invalidInputClassName}`);
    setInvalidInputCount(invalidsInputs.length);
  });
  return (
    <>
      <h1 className={form.h1}>У вас нет завещания в этой сети</h1>
      <h1
        onClick={toggleEditHidden}
        className={` ${info.button} ${form.h1}`}
        style={{ marginTop: "2px" }}
      >
        📜 Создать новое📜
      </h1>
      <div className={`${info.content} ${editHidden ? info.hidden : info.visible}`}>
        <div>
          <h1 className={form.h1}>Составьте список наследников и их долей</h1>
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

        <div>
          <h1 className={form.h1}>Укажите доверенных лиц</h1>
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

        <div className={form["time"]}>
          <h1 className={form.h1}>Выберите период до начала голосования</h1>
          <div className={form.slider}>
            <Slider
              min={1}
              max={5}
              step={0.5}
              value={time}
              onChange={handleTimeChange}
              renderTrack={(props, state) => <div {...props} className={form["slider-track"]} />}
              renderThumb={(props, state) => <div {...props} className={form["slider-thumb"]} />}
            />
          </div>
          {time == 1 ? (
            <h3 className={form.h3}>Период: {time} год</h3>
          ) : time == 5 ? (
            <h3 className={form.h3}>Период: {time} лет</h3>
          ) : (
            <h3 className={form.h3}>Период: {time} года</h3>
          )}
        </div>
        <div className={form["erc20Tokens"]}>
          <h1 className={form.h1}>Добавьте токены ERC-20 в завещание</h1>
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
              <h3 className={form["index"]}>{token.name ? token.name : <>Токен #{index + 1}</>}</h3>
              <input
                type="text"
                value={token.address}
                placeholder={`Контракт ERC-20 токена `}
                onChange={(event) => handleChangeErc20Token(index, event.target.value, token.name)}
                className={`${form["input"]} ${
                  token.address === userAddress ||
                  !isAddressValid(token.address) ||
                  erc20Tokens.some((e, i) => i !== index && e.address === token.address)
                    ? invalidInputClassName
                    : ""
                }`}
              />

              {token.allowance > 0 ? (
                <button
                  disabled={true}
                  className={`${form["form-button"]} ${form["web3button"]}`}
                  style={{ background: "green", cursor: "not-allowed" }}
                >
                  Готово
                </button>
              ) : token.address === userAddress ||
                !isAddressValid(token.address) ||
                erc20Tokens.some((e, i) => i !== index && e.address === token.address) ? (
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
                        contractAddress,
                        token.address
                      );
                      token.allowance = allowance[0]?.allowance;
                    } catch (error) {
                      console.error(error);
                    }
                  }}
                  className={form["web3button"]}
                >
                  Дать доступ контракту
                </Web3Button>
              )}
              {erc20Tokens.length > 1 && (
                <button
                  onClick={() => handleRemoveErc20Token(index)}
                  className={form["remove-button"]}
                ></button>
              )}
            </div>
          ))}

          <button onClick={() => handleAddErc20Token("")} className={form["form-button"]}>
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
        {invalidInputsCount > 0 || heirsErrors.erc20Share ? (
          <p className={form["error"]}>Заполните все поля корректно!</p>
        ) : erc20Tokens.every((token) => token.allowance > 0) || selectedChain.chainId === 1337 ? (
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
                  const { root, proofs } = merkleTreeData;
                  console.log("creation", merkleTreeData);
                  const userRef = doc(db, `${selectedChain.name}`, userAddress);
                  await setDoc(userRef, {
                    heirs: web3Heirs,
                    guardians: guardians,
                  });
                  await contract.call("createTestament", [
                    time * 360 * 24 * 60 * 60,
                    votes,
                    guardians.map((item) => item.address),
                    root,
                  ]);
                } catch (error) {
                  console.log(error);
                }
              }}
              onSubmit={() => console.log("Транзакция отправлена")}
              className={form["form-button"]}
            >
              Создать завещание
            </Web3Button>
          </div>
        ) : (
          <p className={form["error"]}>Дайте разрешение на все токены!</p>
        )}
      </div>
    </>
  );
}
