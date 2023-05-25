import { useState, useEffect } from "react";
import { isAddressValid } from "../isAddressValid";

export const useHeirs = (userAddress, initialHeirs = [{ heirAddress: "", erc20Share: 100 }]) => {
  const [heirs, setHeirs] = useState(initialHeirs);
  const [errors, setErrors] = useState({});

  const handleAddHeir = () => {
    const newHeir = { heirAddress: "", erc20Share: 1 };
    setHeirs([...heirs, newHeir]);
  };

  const handleRemoveHeir = (index) => {
    const filteredHeirs = heirs.filter((_, i) => i !== index);
    setHeirs(filteredHeirs);
  };

  const handleChangeHeirAddress = (index, newHeirAddress) => {
    const newErrors = { ...errors };
    const isAddressExists = heirs.some((item) => item.heirAddress === newHeirAddress);
    if (newHeirAddress == userAddress) {
      newErrors[`heirAddress${index}`] = `${index + 1}) Не указывайте свой адрес `;
    } else if (!isAddressValid(newHeirAddress)) {
      newErrors[`heirAddress${index}`] = `${index + 1}) Неправильный адрес `;
    } else if (isAddressExists) {
      newErrors[`heirAddress${index}`] = `${index + 1}) Дублирующийся адрес `;
    } else delete newErrors[`heirAddress${index}`];
    const newHeirs = [...heirs];
    newHeirs[index].heirAddress = newHeirAddress;
    setHeirs(newHeirs);
    setErrors(newErrors);
  };

  const handleChangePercentage = (index, erc20Share) => {
    const newHeirs = [...heirs];
    newHeirs[index].erc20Share = erc20Share;
    setHeirs(newHeirs);
  };

  useEffect(() => {
    const totalPercentage = heirs.reduce((sum, heir) => sum + Number(heir.erc20Share || 0), 0);

    if (totalPercentage !== 100) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        erc20Share: "Сумма процентов должна быть 100%",
      }));
    } else {
      setErrors((prevErrors) => ({ ...prevErrors, erc20Share: undefined }));
    }
  }, [heirs]);

  return {
    heirs,
    errors,
    setHeirs,
    setErrors,
    handleAddHeir,
    handleRemoveHeir,
    handleChangeHeirAddress,
    handleChangePercentage,
  };
};
