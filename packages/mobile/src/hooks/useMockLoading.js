import { useEffect, useState } from 'react';
import { MOCK_LOADING_DELAY_MS } from '../config/loading';

export default function useMockLoading() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setIsLoading(false), MOCK_LOADING_DELAY_MS);
    return () => clearTimeout(timeout);
  }, []);

  return isLoading;
}
