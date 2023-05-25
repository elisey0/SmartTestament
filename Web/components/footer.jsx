import { contractsAddresses } from "../utils/constants/contractsInfo";

export default function Footer() {
  return (
    <p>
      Открытая разработка: <a href="https://github.com/">Github </a>|{" "}
      <a href={`https://mumbai.polygonscan.com/address/${contractsAddresses[80001]}`}>
        Mumbai Contract
      </a>{" "}
      |{" "}
      <a href={`https://testnet.bscscan.com/address/${contractsAddresses[97]}`}>
        BSC Testnet Contract
      </a>{" "}
      |{" "}
      <a href={`https://sepolia.etherscan.io/address/${contractsAddresses[11155111]}`}>
        Sepolia Contract
      </a>
    </p>
  );
}
