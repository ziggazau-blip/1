"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { auth } from "./lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [modo, setModo] = useState<"login" | "register">("login");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        window.location.href = "/dashboard";
        return;
      }

      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  async function handleSubmit() {
    setErro("");

    if (!email.trim() || !password.trim()) {
      setErro("Preenche todos os campos");
      return;
    }

    try {
      setLoading(true);

      if (modo === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }

      window.location.href = "/dashboard";
    } catch (err: any) {
      setErro("Erro: " + (err?.message || "não foi possível autenticar"));
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div style={paginaStyle}>
        <div style={cardStyle}>
          <h1 style={tituloStyle}>AJP Horas</h1>
          <p style={subtituloStyle}>A verificar sessão...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={paginaStyle}>
      <div style={cardStyle}>
        <div style={{
    ...logoCircleStyle,
    overflow: "hidden",
    background: "none",
  }}
>
  <Image src="/logo.png" alt="AJP Logo"
    width={74}
    height={74}
    style={{ objectFit: "cover" }}
  />
</div>

        <h1 style={tituloStyle}>AJP Horas</h1>

        <p style={subtituloStyle}>
          {modo === "login" ? "Entrar na aplicação" : "Criar nova conta"}
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        {erro && <p style={erroStyle}>{erro}</p>}

        <button onClick={handleSubmit} style={botaoStyle}>
          {loading
            ? "A processar..."
            : modo === "login"
            ? "Entrar"
            : "Criar conta"}
        </button>

        <p style={switchStyle}>
          {modo === "login" ? "Não tens conta?" : "Já tens conta?"}
          <span
            onClick={() =>
              setModo(modo === "login" ? "register" : "login")
            }
            style={linkStyle}
          >
            {modo === "login" ? " Criar conta" : " Entrar"}
          </span>
        </p>
      </div>
    </div>
  );
}

const paginaStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "linear-gradient(180deg, #020617 0%, #0f172a 50%, #111827 100%)",
  padding: 20,
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "#0f172a",
  padding: 30,
  borderRadius: 20,
  width: "100%",
  maxWidth: 390,
  display: "flex",
  flexDirection: "column",
  gap: 14,
  border: "1px solid #334155",
  boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
};

const logoCircleStyle: React.CSSProperties = {
  width: 74,
  height: 74,
  borderRadius: "50%",
  background: "linear-gradient(135deg, #2563eb, #16a34a)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  fontWeight: "bold",
  margin: "0 auto 8px auto",
};

const tituloStyle: React.CSSProperties = {
  fontSize: 30,
  fontWeight: "bold",
  textAlign: "center",
  margin: 0,
  color: "white",
};

const subtituloStyle: React.CSSProperties = {
  textAlign: "center",
  color: "#94a3b8",
  margin: 0,
};

const inputStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 12,
  border: "1px solid #334155",
  backgroundColor: "#020617",
  color: "white",
  fontSize: 16,
  outline: "none",
};

const botaoStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 12,
  border: "none",
  backgroundColor: "#2563eb",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: 16,
};

const erroStyle: React.CSSProperties = {
  color: "#f87171",
  fontSize: 14,
  margin: 0,
  fontWeight: "bold",
};

const switchStyle: React.CSSProperties = {
  textAlign: "center",
  fontSize: 14,
  color: "#cbd5e1",
  margin: 0,
};

const linkStyle: React.CSSProperties = {
  color: "#60a5fa",
  cursor: "pointer",
  fontWeight: "bold",
};