import { useContractRead } from "@thirdweb-dev/react";
import { ethers } from "ethers";
import form from "../styles/home.module.css";

export default function getVotedGuardians({ contract, testamentOwnerAddress, testament }) {
  const {
    data: votedGuardians,
    isLoading: guardiansLoading,
    error,
  } = useContractRead(contract, "getVotedGuardians", [testamentOwnerAddress]);

  const filteredVotedGuardians = votedGuardians?.filter(
    (address) => address !== ethers.constants.AddressZero
  );

  return (
    <>
      {guardiansLoading ? (
        <h1>Подключаемся к контракту</h1>
      ) : (
        <>
          <h1 className={form.h1}>Проголосовавшие доверенные лица</h1>
          {filteredVotedGuardians.length === 0 ? (
            <h2 className={form.h2}>...</h2>
          ) : (
            <div>
              {filteredVotedGuardians.map((guardian, index) => (
                <div key={`votedG ${index}`} className={form["container"]}>
                  <h3 className={form["index"]}>{index + 1})</h3>
                  <h3>{guardian}</h3>
                </div>
              ))}
            </div>
          )}
          <h2 className={form.h2}>
            Необходимый минимум: {testament.voting.neededVotes.toNumber()}
          </h2>
        </>
      )}
    </>
  );
}
