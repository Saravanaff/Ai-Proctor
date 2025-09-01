import { useState, useEffect } from "react";
import axios from "axios";

const baseURL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://172.16.105.211:3002";

export function useFetch<T = any>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get<T>(`${baseURL}${url}`);
      setData(response.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (url) {
      fetchData();
    }
  }, [url]);

  return { data, loading, error, refetch: fetchData };
}
