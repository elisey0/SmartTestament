import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/initFirebase";

export default function useFetchTestamentByOwner(selectedChainName, ownerAddress) {
  const [dbLoading, setLoading] = useState(true);
  const [dbError, setError] = useState(null);
  const [dbTestament, setTestament] = useState(null);

  useEffect(() => {
    async function fetchTestament() {
      try {
        const docSnap = await getDoc(doc(db, selectedChainName, ownerAddress));
        const dbTestament = docSnap.data();
        setTestament(dbTestament);
      } catch (err) {
        setError("Не получилось загрузить завещания!");
        console.log(err);
      } finally {
        setLoading(false);
      }
    }
    fetchTestament();
  }, [selectedChainName, ownerAddress]);

  return { dbTestament, setTestament, dbLoading, dbError };
}
