import React, { useState, useEffect, useRef } from "react";
import { doc, getDocs, collection } from "firebase/firestore";
import { db } from "../firebase/initFirebase";

export default function useFetchTestamentsByGuardian(selectedChainName, guardianAddress) {
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
          const guardians = testament.guardians || [];

          if (guardians.find((h) => h.address === guardianAddress)) {
            testamentsList.push({
              testamentOwner: doc.id,
              guardians: guardians,
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
  }, [selectedChainName, guardianAddress]);

  return { dbTestaments, setTestaments, loading, error };
}
