import { useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import styles from "../styles/Auth.module.css";
import { setGlobalIdentity } from "@/constants/AuthStore";

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const baseURL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const endpoint = isRegister ? `${baseURL}/register` : `${baseURL}/login`;
      const payload = isRegister ? { name, email, password } : { email, password };
      const { data } = await axios.post(endpoint, payload, { withCredentials: false });
      const token: string | undefined = data?.token;
      const user = data?.user;
      console.log(data);
      if (!token || !user?.id || !user?.name || !user?.email) {
        throw new Error(data?.message || "Invalid response");
      }

      if (
        typeof window !== "undefined") {
        // Set auth cookie only
        document.cookie = `authToken=${token}; Path=/; Max-Age=${60 * 60 * 2}; SameSite=Lax`;
        // Set and lock global identity
        setGlobalIdentity(user.name, user.email, user.id);
      }

      const dest = (router.query.redirect as string) || "/photo";
      router.push(dest);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Something went wrong");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{isRegister ? "Create account" : "Welcome back"}</h1>
        <p className={styles.subtitle}>{isRegister ? "Register to continue" : "Login to continue"}</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          {isRegister && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>Name</label>
              <input className={styles.input} value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div className={styles.inputGroup}>
            <label className={styles.label}>Email</label>
            <input className={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Password</label>
            <input className={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.actions}>
            <button className={styles.button} type="submit">
              {isRegister ? "Register" : "Login"}
            </button>
            <button className={styles.buttonSecondary} type="button" onClick={() => setIsRegister(r => !r)}>
              {isRegister ? "Switch to Login" : "Switch to Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}