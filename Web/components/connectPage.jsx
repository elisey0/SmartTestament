import home from "../styles/home.module.css";
import { ConnectWallet } from "@thirdweb-dev/react";

export default function ConnectPage() {
  return (
    <main className={home.main} style={{ minHeight: "50vh" }}>
      <p className={home.title}>Платформа для оформления и распределения цифрового наследства</p>
      <ConnectWallet btnTitle="Подключите кошелек" modalTitle="Выберете или уставите новый" />
    </main>
  );
}
