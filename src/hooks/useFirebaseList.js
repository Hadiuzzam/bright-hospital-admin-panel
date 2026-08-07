import { useEffect, useState } from 'react';
import { listenList } from '../services/hmsService.js';

export function useFirebaseList(collection, options = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenList(
      collection,
      (items) => {
        setData(items);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
      options,
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection, JSON.stringify(options)]);

  return { data, loading, error };
}
