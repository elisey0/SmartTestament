import styles from "../styles/home.module.css";
import { ConnectWallet } from "@thirdweb-dev/react";

export default function ConnectPage() {
  return (
    <main className={styles.main}>
      <p className={styles.title}>Платформа для оформления и распределения цифрового наследства</p>
      <ConnectWallet />
    </main>
  );
}
