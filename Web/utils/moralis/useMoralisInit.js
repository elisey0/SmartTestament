import { useEffect } from "react";
import Moralis from "moralis";

export const useMoralisInitialize = () => {
  useEffect(() => {
    const initializeMoralis = async () => {
      await Moralis.start({
        apiKey: process.env.NEXT_PUBLIC_MORALIS_API_KEY,
      });

      console.log("Moralis initialized");
    };

    initializeMoralis();
  }, []);
};
