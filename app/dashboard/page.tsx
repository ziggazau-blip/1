"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "../lib/firebase";
import {
  apagarEquipa,
  buscarEquipasDoUser,
  buscarTodasEquipas,
  criarEquipa,
  Equipa,
} from "../lib/firestore";
import { ADMIN_EMAILS } from "../lib/appConfig";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [equipas, setEquipas] = useState<Equipa[]>([]);
  const [nomeEquipa, setNomeEquipa] = useState("");
  const [loading, setLoading] = useState(true);
  const [aCriar, setACriar] = useState(false);
  const [aApagar, setAApagar] = useState<string | null>(null);

  const isAdmin = useMemo(() => {
    const email = (user?.email || "").toLowerCase().trim();
    return ADMIN_EMAILS.map((e) => e.toLowerCase().trim()).includes(email);
  }, [user]);

  async function carregarEquipas(u: User) {
    const admin = ADMIN_EMAILS.map((e) => e.toLowerCase().trim()).includes(
      (u.email || "").toLowerCase().trim()
    );

    const data = admin
      ? await buscarTodasEquipas()
      : await buscarEquipasDoUser(u.uid);

    setEquipas(data);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        window.location.href = "/";
        return;
      }

      setUser(u);

      try {
        await carregarEquipas(u);
      } catch (error) {
        console.error("Erro ao carregar equipas:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  async function handleCriarEquipa() {
    if (!user || !nomeEquipa.trim()) return;

    try {
      setACriar(true);
      await criarEquipa(nomeEquipa.trim(), user);
      setNomeEquipa("");
      await carregarEquipas(user);
    } catch (error) {
      console.error("Erro ao criar equipa:", error);
      alert("Erro ao criar equipa.");
    } finally {
      setACriar(false);
    }
  }

  async function handleApagarEquipa(equipa: Equipa) {
    if (!user) return;

    const confirmar = window.confirm(
      `Tens a certeza que queres apagar a equipa "${equipa.nome}"?`
    );

    if (!confirmar) return;

    try {
      setAApagar(equipa.id);
      await apagarEquipa(equipa.id);
      await carregarEquipas(user);
    } catch (error) {
      console.error("Erro ao apagar equipa:", error);
      alert("Erro ao apagar equipa.");
    } finally {
      setAApagar(null);
    }
  }

  async function sair() {
    await signOut(auth);
    window.location.href = "/";
  }

  if (loading) {
    return (
      <div style={paginaStyle}>
        <div style={containerStyle}>
          <div style={heroStyle}>
            <h2 style={heroTituloStyle}>AJP Horas</h2>
            <p style={heroTextoStyle}>A carregar...</p>
          </div>
        </div>
      </div>
    );
  }

  const nomeTopo = user?.displayName?.trim() || user?.email || "Utilizador";

  return (
    <div style={paginaStyle}>
      <div style={containerStyle}>
        <div style={topoStyle}>
          <p style={tipoStyle}>{isAdmin ? "Administrador" : "Encarregado"}</p>
          <h1 style={tituloStyle}>{nomeTopo}</h1>
        </div>

        <div style={heroStyle}>
          <h2 style={heroTituloStyle}>AJP Horas</h2>
          <p style={heroTextoStyle}>
            {isAdmin
              ? "O administrador pode ver todas as equipas."
              : "O encarregado só pode gerir as equipas dele."}
          </p>
        </div>

        <div style={cardStyle}>
          <h3 style={cardTituloStyle}>
            {isAdmin ? "Criar equipa" : "Criar a tua equipa"}
          </h3>

          <div style={formRowStyle}>
            <input
              value={nomeEquipa}
              onChange={(e) => setNomeEquipa(e.target.value)}
              placeholder="Nome da equipa"
              style={inputStyle}
            />

            <button
              onClick={handleCriarEquipa}
              disabled={aCriar}
              style={botaoVerdeStyle}
            >
              {aCriar ? "A criar..." : "Guardar equipa"}
            </button>
          </div>
        </div>

        <div style={gridStyle}>
          {equipas.map((equipa) => (
            <div key={equipa.id} style={cardWrapStyle}>
              <Link href={`/equipa/${equipa.id}`} style={equipaCardStyle}>
                <div style={iconeStyle}>👷</div>

                <div>
                  <h3 style={equipaNomeStyle}>{equipa.nome}</h3>
                  <p style={equipaTextoStyle}>
                    {isAdmin ? equipa.ownerEmail : "Abrir folha semanal"}
                  </p>
                </div>
              </Link>

              <button
                onClick={() => handleApagarEquipa(equipa)}
                disabled={aApagar === equipa.id}
                style={botaoApagarStyle}
                title="Apagar equipa"
              >
                {aApagar === equipa.id ? "..." : "🗑"}
              </button>
            </div>
          ))}
        </div>

        {equipas.length === 0 && (
          <div style={vazioStyle}>
            {isAdmin
              ? "Ainda não existem equipas criadas."
              : "Ainda não tens equipa criada."}
          </div>
        )}
      </div>

      <nav style={bottomNavStyle}>
        <Link href="/dashboard" style={navAtivoStyle}>
          <span style={navIconStyle}>🏠</span>
          <span>Início</span>
        </Link>

        <Link href="/perfil" style={navLinkStyle}>
          <span style={navIconStyle}>👤</span>
          <span>Perfil</span>
        </Link>

        <button onClick={sair} style={navButtonStyle}>
          <span style={navIconStyle}>⎋</span>
          <span>Sair</span>
        </button>
      </nav>
    </div>
  );
}

const paginaStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #020617 0%, #0f172a 55%, #111827 100%)",
  color: "white",
};

const containerStyle: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: 20,
  paddingBottom: 110,
};

const topoStyle: React.CSSProperties = {
  marginBottom: 24,
};

const tipoStyle: React.CSSProperties = {
  margin: 0,
  color: "#94a3b8",
  fontSize: 18,
};

const tituloStyle: React.CSSProperties = {
  margin: "6px 0 0 0",
  fontSize: 42,
  fontWeight: "bold",
};

const heroStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #1e293b, #0f172a)",
  border: "1px solid #334155",
  borderRadius: 28,
  padding: 28,
  marginBottom: 24,
};

const heroTituloStyle: React.CSSProperties = {
  margin: "0 0 12px 0",
  fontSize: 40,
  fontWeight: "bold",
};

const heroTextoStyle: React.CSSProperties = {
  margin: 0,
  color: "#cbd5e1",
  fontSize: 18,
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 24,
  padding: 22,
  marginBottom: 24,
};

const cardTituloStyle: React.CSSProperties = {
  margin: "0 0 12px 0",
  fontSize: 28,
  fontWeight: "bold",
};

const formRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 240,
  padding: 16,
  borderRadius: 14,
  border: "1px solid #475569",
  backgroundColor: "#020617",
  color: "white",
  fontSize: 16,
};

const botaoVerdeStyle: React.CSSProperties = {
  padding: "16px 22px",
  borderRadius: 14,
  border: "none",
  backgroundColor: "#16a34a",
  color: "white",
  fontWeight: "bold",
  fontSize: 16,
  cursor: "pointer",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 20,
};

const cardWrapStyle: React.CSSProperties = {
  position: "relative",
};

const equipaCardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 18,
  padding: 24,
  borderRadius: 24,
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "white",
  textDecoration: "none",
  boxShadow: "0 16px 30px rgba(37,99,235,0.25)",
};

const botaoApagarStyle: React.CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  width: 42,
  height: 42,
  borderRadius: 12,
  border: "none",
  background: "rgba(220,38,38,0.95)",
  color: "white",
  cursor: "pointer",
  fontSize: 18,
};

const iconeStyle: React.CSSProperties = {
  width: 68,
  height: 68,
  borderRadius: 20,
  background: "rgba(255,255,255,0.14)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 30,
};

const equipaNomeStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 26,
  fontWeight: "bold",
};

const equipaTextoStyle: React.CSSProperties = {
  margin: "6px 0 0 0",
  opacity: 0.92,
  fontSize: 15,
};

const vazioStyle: React.CSSProperties = {
  marginTop: 20,
  padding: 20,
  borderRadius: 18,
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  color: "#94a3b8",
  textAlign: "center",
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

const navAtivoStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  color: "#60a5fa",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: 14,
};

const navLinkStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  color: "white",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: 14,
};

const navButtonStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  color: "white",
  background: "transparent",
  border: "none",
  fontWeight: "bold",
  fontSize: 14,
  cursor: "pointer",
};

const navIconStyle: React.CSSProperties = {
  fontSize: 22,
};