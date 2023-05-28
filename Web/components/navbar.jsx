import { ConnectWallet, useChainId } from "@thirdweb-dev/react";
import Link from "next/link";
import { useRouter } from "next/router";

import header from "../styles/navbar.module.css";
import common from "../styles/common.module.css";

export default function Navbar({ selectedChain }) {
  const router = useRouter();
  const selectedChainId = selectedChain?.chainId;
  const buttonClassName = `${header["button"]} ${header[`button-${selectedChainId}`]}`;
  return (
    <>
      <header className={`${header["header"]} ${common[`color-${selectedChainId}`]}`}>
        <div className={header.site}>
          <b>Смарт.Наследие</b>
        </div>
        <div className={header.navigation}>
          <Link href={"/guardian"}>
            <button
              className={
                buttonClassName + [router.pathname == "/guardian" ? ` ${header[`active`]}` : ""]
              }
            >
              Голосования
            </button>
          </Link>
          <Link href={"/"}>
            <button
              className={buttonClassName + [router.pathname == "/" ? ` ${header[`active`]}` : ""]}
            >
              Завещания
            </button>
          </Link>

          <Link href={"/heir"}>
            <button
              className={
                buttonClassName + [router.pathname == "/heir" ? ` ${header[`active`]}` : ""]
              }
            >
              Наследства
            </button>
          </Link>
        </div>
        <div className={header.wallet}>
          <ConnectWallet btnTitle="Подключите кошелек" modalTitle="Выберете или уставите новый" />
        </div>
      </header>
    </>
  );
}
