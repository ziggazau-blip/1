"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { auth } from "../lib/firebase";
import {
  onAuthStateChanged,
  signOut,
  updateProfile,
  User,
} from "firebase/auth";

const ADMIN_EMAILS = ["TEU_EMAIL_AQUI@gmail.com"];

export default function PerfilPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState("");
  const [mensagem, setMensagem] = useState("");

  const isAdmin = useMemo(() => {
    const email = user?.email?.toLowerCase() || "";
    return ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email);
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (!authUser) {
        window.location.href = "/";
        return;
      }

      setUser(authUser);
      setNome(authUser.displayName || "");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function guardarNome() {
    if (!auth.currentUser) return;
    if (!nome.trim()) return;

    await updateProfile(auth.currentUser, {
      displayName: nome.trim(),
    });

    setMensagem("Nome guardado com sucesso");

    setTimeout(() => {
      setMensagem("");
      window.location.href = "/dashboard";
    }, 1200);
  }

  async function sair() {
    await signOut(auth);
    window.location.href = "/";
  }

  if (loading) return null;

  return (
    <div style={paginaStyle}>
      <div style={conteudoStyle}>
        <div style={cardStyle}>
          <h1 style={tituloStyle}>Perfil</h1>

          <div style={linhaColunaStyle}>
            <label style={labelStyle}>Nome</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Escreve o teu nome"
              style={inputStyle}
            />
          </div>

          <div style={linhaStyle}>
            <span style={labelStyle}>Email</span>
            <span style={valorStyle}>{user?.email}</span>
          </div>

          <div style={linhaStyle}>
            <span style={labelStyle}>Função</span>
            <span style={valorStyle}>{isAdmin ? "Administrador" : "Encarregado"}</span>
          </div>

          {mensagem && <p style={mensagemStyle}>{mensagem}</p>}

          <div style={botoesStyle}>
            <button onClick={guardarNome} style={botaoGuardarStyle}>
              Guardar nome
            </button>

            <Link href="/dashboard" style={botaoVoltarStyle}>
              Voltar
            </Link>

            <button onClick={sair} style={botaoSairStyle}>
              Terminar sessão
            </button>
          </div>
        </div>
      </div>

      <nav style={bottomNavStyle}>
        <Link href="/dashboard" style={navButtonLinkStyle}>
          <span style={navIconStyle}>🏠</span>
          <span>Início</span>
        </Link>

        <Link href="/perfil" style={navItemAtivoStyle}>
          <span style={navIconStyle}>👤</span>
          <span>Perfil</span>
        </Link>
      </nav>
    </div>
  );
}

const paginaStyle: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "linear-gradient(180deg, #020617 0%, #0f172a 50%, #111827 100%)",
  color: "white",
};

const conteudoStyle: React.CSSProperties = {
  padding: 20,
  paddingBottom: 110,
  maxWidth: 900,
  margin: "0 auto",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 24,
  padding: 24,
};

const tituloStyle: React.CSSProperties = {
  margin: "0 0 20px 0",
  fontSize: 34,
  fontWeight: "bold",
};

const linhaColunaStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginBottom: 20,
};

const linhaStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "16px 0",
  borderBottom: "1px solid #1e293b",
};

const labelStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontWeight: "bold",
};

const valorStyle: React.CSSProperties = {
  color: "white",
  fontWeight: "bold",
  textAlign: "right",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 16,
  borderRadius: 14,
  border: "1px solid #475569",
  backgroundColor: "#020617",
  color: "white",
  fontSize: 16,
};

const mensagemStyle: React.CSSProperties = {
  color: "#4ade80",
  fontWeight: "bold",
  marginTop: 16,
};

const botoesStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 24,
};

const botaoGuardarStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 180,
  padding: 16,
  borderRadius: 14,
  border: "none",
  backgroundColor: "#16a34a",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

const botaoVoltarStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 180,
  padding: 16,
  borderRadius: 14,
  textDecoration: "none",
  textAlign: "center",
  backgroundColor: "#1d4ed8",
  color: "white",
  fontWeight: "bold",
};

const botaoSairStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 180,
  padding: 16,
  borderRadius: 14,
  border: "none",
  backgroundColor: "#dc2626",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

const bottomNavStyle: React.CSSProperties = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  height: 80,
  backgroundColor: "rgba(2, 6, 23, 0.96)",
  borderTop: "1px solid #334155",
  display: "flex",
  justifyContent: "space-around",
  alignItems: "center",
  backdropFilter: "blur(10px)",
};

const navItemAtivoStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  color: "#60a5fa",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: 14,
};

const navButtonLinkStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  color: "white",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: 14,
};

const navIconStyle: React.CSSProperties = {
  fontSize: 22,
};