import { useState } from "react";
import { isAddressValid } from "../isAddressValid";
import getErc20Approvals from "../moralis/getErc20Approvals";
import { isLastDayOfMonth } from "date-fns";

export const useErc20Tokens = (
  selectedChain,
  userAddress,
  contractAddress,
  initialErc20Tokens = [{ address: "", name: "", allowance: 0 }]
) => {
  const [erc20Tokens, setErc20Tokens] = useState(initialErc20Tokens);
  const [errors, setErrors] = useState({});

  const handleAddErc20Token = async (newErc20Address, name) => {
    let erc20Info = 0;
    if (isAddressValid(newErc20Address)) {
      erc20Info = await getErc20Approvals(
        selectedChain,
        userAddress,
        contractAddress,
        newErc20Address
      );
    }
    const newErc20 = {
      address: newErc20Address,
      name: name,
      allowance: erc20Info[0]?.allowance || 0,
    };

    if (newErc20Address == "") {
      setErc20Tokens([...erc20Tokens, newErc20]);
    } else {
      const isAddressExists = erc20Tokens.some(
        (item) => item.address.toLowerCase() === newErc20Address.toLowerCase()
      );
      const emptyIndex = erc20Tokens.findIndex((item) => item.address === "");
      if (!isAddressExists) {
        if (emptyIndex === -1) {
          setErc20Tokens([...erc20Tokens, newErc20]);
        } else {
          handleChangeErc20Token(emptyIndex, newErc20Address, name);
        }
      }
    }
  };

  const handleChangeErc20Token = async (index, newErc20Address, name) => {
    const newErrors = { ...errors };
    const isAddressExists = erc20Tokens.some((item) => item.address === newErc20Address);
    if (newErc20Address == userAddress) {
      newErrors[`erc20Address${index}`] = `${index + 1}) Не указывайте свой адрес `;
    } else if (!isAddressValid(newErc20Address)) {
      newErrors[`erc20Address${index}`] = `${index + 1}) Неправильный адрес `;
    } else if (isAddressExists) {
      newErrors[`erc20Address${index}`] = `${index + 1}) Дублирующийся адрес `;
    } else delete newErrors[`erc20Address${index}`];

    setErrors(newErrors);
    const newErc20Tokens = [...erc20Tokens];
    newErc20Tokens[index].address = newErc20Address;
    newErc20Tokens[index].name = name;
    let erc20Info = 0;
    if (isAddressValid(newErc20Address)) {
      erc20Info = await getErc20Approvals(
        selectedChain,
        userAddress,
        contractAddress,
        newErc20Address
      );
    }
    newErc20Tokens[index].allowance = erc20Info[0]?.allowance || 0;
    setErc20Tokens(newErc20Tokens);
  };

  const handleRemoveErc20Token = (index) => {
    const filteredErc20 = erc20Tokens.filter((_, i) => i !== index);
    setErc20Tokens(filteredErc20);
  };

  return {
    erc20Tokens,
    errors,
    setErc20Tokens,
    setErrors,
    handleAddErc20Token,
    handleChangeErc20Token,
    handleRemoveErc20Token,
  };
};
