import { useState } from "react";
import { isAddressValid } from "../isAddressValid";

export const useGuardians = (
  userAddress,
  initialGuardians = [{ address: "" }, { address: "" }]
) => {
  const [guardians, setGuardians] = useState(initialGuardians);
  const [votes, setVotes] = useState(1);
  const [errors, setErrors] = useState({});

  const handleAddGuardian = () => {
    const newGuardian = { address: "" };
    setGuardians([...guardians, newGuardian]);
  };

  const handleRemoveGuardian = (index) => {
    const filteredGuardians = guardians.filter((_, i) => i !== index);
    setGuardians(filteredGuardians);
    if (votes > filteredGuardians.length) {
      setVotes(filteredGuardians.length);
    }
  };

  const handleChangeGuardian = (index, newGuardianAddress) => {
    const newErrors = { ...errors };
    const isAddressExists = guardians.some((item) => item.address === newGuardianAddress);
    if (newGuardianAddress == userAddress) {
      newErrors[`guardianAddress${index}`] = `${index + 1}) Не указывайте свой адрес`;
    } else if (!isAddressValid(newGuardianAddress)) {
      newErrors[`guardianAddress${index}`] = `${index + 1}) Неправильный адрес`;
    } else if (isAddressExists) {
      newErrors[`guardianAddress${index}`] = `${index + 1}) Дублирующийся адрес`;
    } else delete newErrors[`guardianAddress${index}`];
    const newGuardians = [...guardians];
    newGuardians[index].address = newGuardianAddress;
    setErrors(newErrors);
    setGuardians(newGuardians);
  };

  const handleChangeVotes = (votes) => {
    if (votes >= 1 && votes <= guardians.length) {
      setVotes(votes);
    }
  };

  return {
    guardians,
    votes,
    errors,
    setGuardians,
    setVotes,
    handleAddGuardian,
    handleRemoveGuardian,
    handleChangeGuardian,
    handleChangeVotes,
    setErrors,
  };
};
