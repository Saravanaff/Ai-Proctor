import { useState } from "react";
import axios from "axios";

const baseURL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://172.16.10.185:3001";

export function usePost<T = any>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (payload: any) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post<T>(`${baseURL}${url}`, payload);
      setData(response.data);
      console.log(response.data);
      return response.data;
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || err.message || "Something went wrong";
      console.log(errorMsg);
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, execute };
}
