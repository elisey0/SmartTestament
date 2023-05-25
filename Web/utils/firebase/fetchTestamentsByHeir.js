import React, { useState, useEffect, useRef } from "react";
import { doc, getDocs, collection } from "firebase/firestore";
import { db } from "../firebase/initFirebase";

export default function useFetchTestamentsByHeir(selectedChainName, heirAddress) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dbTestaments, setTestaments] = useState(null);

  useEffect(() => {
    async function fetchTestamentsByHeir() {
      try {
        const querySnapshot = await getDocs(collection(db, selectedChainName));
        const testamentsList = [];

        querySnapshot.forEach((doc) => {
          const testament = doc.data();
          const heirs = testament.heirs || [];

          if (heirs.find((h) => h.heirAddress === heirAddress)) {
            testamentsList.push({
              testamentOwner: doc.id,
              heirs: heirs,
            });
          }
        });
        setTestaments(testamentsList);
      } catch (err) {
        setError("Не получилось загрузить завещания!");
        console.log(err);
      } finally {
        setLoading(false);
      }
    }
    fetchTestamentsByHeir();
  }, [selectedChainName, heirAddress]);

  return { dbTestaments, setTestaments, loading, error };
}
