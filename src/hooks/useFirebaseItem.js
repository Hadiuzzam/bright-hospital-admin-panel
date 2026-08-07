import { useEffect, useState } from 'react';
import { listenItem } from '../services/hmsService.js';

export function useFirebaseItem(collection, id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setData(null);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const unsubscribe = listenItem(
      collection,
      id,
      (item) => {
        setData(item);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [collection, id]);

  return { data, loading, error };
}
