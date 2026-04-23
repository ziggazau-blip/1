"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { ADMIN_EMAILS, STORAGE_EQUIPAS } from "../lib/appConfig";

type Equipa = {
  id: string;
  nome: string;
  ownerUid: string;
  ownerEmail: string;
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [storageLoaded, setStorageLoaded] = useState(false);

  const [equipas, setEquipas] = useState<Equipa[]>([]);
  const [nomeEquipa, setNomeEquipa] = useState("");
  const [menuAberto, setMenuAberto] = useState<string | null>(null);

  const isAdmin = useMemo(() => {
    const email = (user?.email || "").toLowerCase().trim();
    return ADMIN_EMAILS.map((e) => e.toLowerCase().trim()).includes(email);
  }, [user]);

  const minhaEquipa = useMemo(() => {
    if (!user) return null;
    return equipas.find((e) => e.ownerUid === user.uid) || null;
  }, [equipas, user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (!authUser) {
        window.location.href = "/";
        return;
      }

      setUser(authUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const guardadas = localStorage.getItem(STORAGE_EQUIPAS);

    if (guardadas) {
      try {
        const parsed = JSON.parse(guardadas);
        if (Array.isArray(parsed)) {
          setEquipas(parsed);
        } else {
          setEquipas([]);
        }
      } catch {
        setEquipas([]);
      }
    } else {
      setEquipas([]);
    }

    setStorageLoaded(true);
  }, [user]);

  useEffect(() => {
    if (!storageLoaded) return;
    localStorage.setItem(STORAGE_EQUIPAS, JSON.stringify(equipas));
  }, [equipas, storageLoaded]);

  useEffect(() => {
    if (minhaEquipa) {
      setNomeEquipa(minhaEquipa.nome);
    } else {
      setNomeEquipa("");
    }
  }, [minhaEquipa]);

  function guardarMinhaEquipa() {
    if (!user) return;

    const nome = nomeEquipa.trim();
    if (!nome) return;

    setEquipas((prev) => {
      const existente = prev.find((e) => e.ownerUid === user.uid);

      if (existente) {
        return prev.map((e) =>
          e.ownerUid === user.uid ? { ...e, nome } : e
        );
      }

      return [
        ...prev,
        {
          id: Date.now().toString(),
          nome,
          ownerUid: user.uid,
          ownerEmail: user.email || "",
        },
      ];
    });

    setMenuAberto(null);
  }

  function apagarMinhaEquipa() {
    if (!user || !minhaEquipa) return;

    const confirmar = window.confirm(
      "Tens a certeza que queres apagar a tua equipa?"
    );
    if (!confirmar) return;

    setEquipas((prev) => prev.filter((e) => e.ownerUid !== user.uid));
    setNomeEquipa("");
    setMenuAberto(null);
  }

  function apagarEquipaAdmin(id: string) {
    if (!isAdmin) return;

    const confirmar = window.confirm(
      "Tens a certeza que queres apagar esta equipa?"
    );
    if (!confirmar) return;

    setEquipas((prev) => prev.filter((e) => e.id !== id));
    setMenuAberto(null);
  }

  function editarEquipaAdmin(id: string) {
    if (!isAdmin) return;

    const equipa = equipas.find((e) => e.id === id);
    if (!equipa) return;

    const novoNome = window.prompt("Novo nome da equipa:", equipa.nome);
    if (!novoNome || !novoNome.trim()) return;

    setEquipas((prev) =>
      prev.map((e) => (e.id === id ? { ...e, nome: novoNome.trim() } : e))
    );

    setMenuAberto(null);
  }

  async function sair() {
    await signOut(auth);
    window.location.href = "/";
  }

  if (authLoading || !storageLoaded) return null;

  const nomeTopo =
    user?.displayName?.trim() || user?.email || "Utilizador";

  return (
    <div style={paginaStyle}>
      <div style={conteudoStyle}>
        <div style={topoStyle}>
          <div>
            <p style={subtituloStyle}>
              {isAdmin ? "Administrador" : "Encarregado"}
            </p>
            <h1 style={tituloUtilizadorStyle}>{nomeTopo}</h1>
          </div>
        </div>

        <div style={heroCardStyle}>
          <h2 style={heroTituloStyle}>AJP Horas</h2>
          <p style={heroTextoStyle}>
            {isAdmin
              ? "O administrador pode ver e gerir todas as equipas."
              : "O encarregado só pode gerir a sua própria equipa."}
          </p>
        </div>

        {isAdmin ? (
          <>
            <div style={cardCriarEquipaStyle}>
              <h3 style={tituloSecaoStyle}>Equipas registadas</h3>
              <p style={textoSecaoStyle}>
                O administrador vê todas as equipas criadas neste browser.
              </p>
            </div>

            <div style={gridEquipasStyle}>
              {equipas.map((equipa) => (
                <div key={equipa.id} style={cardEquipaWrapperStyle}>
                  <div style={cardHeaderStyle}>
                    <button
                      onClick={() =>
                        setMenuAberto((prev) => (prev === equipa.id ? null : equipa.id))
                      }
                      style={botaoMenuStyle}
                    >
                      ⋮
                    </button>

                    {menuAberto === equipa.id && (
                      <div style={menuDropdownStyle}>
                        <button
                          onClick={() => editarEquipaAdmin(equipa.id)}
                          style={menuItemStyle}
                        >
                          ✏️ Editar
                        </button>

                        <button
                          onClick={() => apagarEquipaAdmin(equipa.id)}
                          style={menuItemDeleteStyle}
                        >
                          🗑 Apagar
                        </button>
                      </div>
                    )}
                  </div>

                  <Link href={`/equipa/${equipa.id}`} style={cardEquipaStyle}>
                    <div style={iconeEquipaStyle}>👷</div>
                    <div>
                      <h3 style={nomeEquipaStyle}>{equipa.nome}</h3>
                      <p style={textoEquipaStyle}>
                        {equipa.ownerEmail || "Sem email"}
                      </p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>

            {equipas.length === 0 && (
              <div style={vazioStyle}>Ainda não existem equipas criadas.</div>
            )}
          </>
        ) : (
          <>
            {!minhaEquipa ? (
              <div style={cardCriarEquipaStyle}>
                <h3 style={tituloSecaoStyle}>Criar a tua equipa</h3>

                <div style={linhaCriarEquipaStyle}>
                  <input
                    type="text"
                    placeholder="Nome da tua equipa"
                    value={nomeEquipa}
                    onChange={(e) => setNomeEquipa(e.target.value)}
                    style={inputEquipaStyle}
                  />

                  <button onClick={guardarMinhaEquipa} style={botaoAdicionarStyle}>
                    Guardar equipa
                  </button>
                </div>
              </div>
            ) : (
              <div style={cardEquipaWrapperStyle}>
                <div style={cardHeaderStyle}>
                  <button
                    onClick={() =>
                      setMenuAberto((prev) =>
                        prev === minhaEquipa.id ? null : minhaEquipa.id
                      )
                    }
                    style={botaoMenuStyle}
                  >
                    ⋮
                  </button>

                  {menuAberto === minhaEquipa.id && (
                    <div style={menuDropdownStyle}>
                      <button
                        onClick={() => {
                          setNomeEquipa(minhaEquipa.nome);
                          setMenuAberto(null);
                        }}
                        style={menuItemStyle}
                      >
                        ✏️ Editar nome
                      </button>

                      <button
                        onClick={apagarMinhaEquipa}
                        style={menuItemDeleteStyle}
                      >
                        🗑 Apagar equipa
                      </button>
                    </div>
                  )}
                </div>

                <Link href={`/equipa/${minhaEquipa.id}`} style={cardEquipaStyle}>
                  <div style={iconeEquipaStyle}>👷</div>
                  <div>
                    <h3 style={nomeEquipaStyle}>{minhaEquipa.nome}</h3>
                    <p style={textoEquipaStyle}>Abrir folha semanal</p>
                  </div>
                </Link>

                <div style={editarBoxStyle}>
                  <input
                    type="text"
                    value={nomeEquipa}
                    onChange={(e) => setNomeEquipa(e.target.value)}
                    style={inputEquipaStyle}
                  />
                  <button
                    onClick={guardarMinhaEquipa}
                    style={botaoGuardarEditarStyle}
                  >
                    Atualizar nome
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <nav style={bottomNavStyle}>
        <Link href="/dashboard" style={navItemAtivoStyle}>
          <span style={navIconStyle}>🏠</span>
          <span>Início</span>
        </Link>

        <Link href="/perfil" style={navButtonLinkStyle}>
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
  background:
    "linear-gradient(180deg, #020617 0%, #0f172a 50%, #111827 100%)",
  color: "white",
};

const conteudoStyle: React.CSSProperties = {
  padding: 20,
  paddingBottom: 110,
  maxWidth: 1100,
  margin: "0 auto",
};

const topoStyle: React.CSSProperties = {
  marginBottom: 24,
};

const subtituloStyle: React.CSSProperties = {
  margin: 0,
  color: "#94a3b8",
};

const tituloUtilizadorStyle: React.CSSProperties = {
  margin: "6px 0 0 0",
  fontSize: 38,
  fontWeight: "bold",
};

const heroCardStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #1e293b, #0f172a)",
  border: "1px solid #334155",
  borderRadius: 28,
  padding: 30,
  marginBottom: 24,
};

const heroTituloStyle: React.CSSProperties = {
  margin: "0 0 10px 0",
  fontSize: 40,
  fontWeight: "bold",
};

const heroTextoStyle: React.CSSProperties = {
  margin: 0,
  color: "#cbd5e1",
  fontSize: 18,
};

const cardCriarEquipaStyle: React.CSSProperties = {
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 26,
  padding: 24,
  marginBottom: 24,
};

const tituloSecaoStyle: React.CSSProperties = {
  margin: "0 0 18px 0",
  fontSize: 24,
  fontWeight: "bold",
};

const textoSecaoStyle: React.CSSProperties = {
  margin: 0,
  color: "#94a3b8",
  fontSize: 16,
};

const linhaCriarEquipaStyle: React.CSSProperties = {
  display: "flex",
  gap: 14,
  flexWrap: "wrap",
};

const inputEquipaStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 240,
  padding: 16,
  borderRadius: 14,
  border: "1px solid #475569",
  backgroundColor: "#020617",
  color: "white",
  fontSize: 16,
};

const botaoAdicionarStyle: React.CSSProperties = {
  padding: "16px 22px",
  borderRadius: 14,
  border: "none",
  backgroundColor: "#16a34a",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: 16,
};

const cardEquipaWrapperStyle: React.CSSProperties = {
  position: "relative",
  marginBottom: 20,
};

const cardHeaderStyle: React.CSSProperties = {
  position: "absolute",
  top: 14,
  right: 14,
  zIndex: 2,
};

const botaoMenuStyle: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 16,
  border: "none",
  backgroundColor: "rgba(255,255,255,0.16)",
  color: "white",
  fontSize: 22,
  fontWeight: "bold",
  cursor: "pointer",
};

const menuDropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: 58,
  right: 0,
  minWidth: 170,
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 16,
  overflow: "hidden",
  boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
};

const menuItemStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  border: "none",
  backgroundColor: "transparent",
  color: "white",
  textAlign: "left",
  cursor: "pointer",
  fontWeight: "bold",
};

const menuItemDeleteStyle: React.CSSProperties = {
  ...menuItemStyle,
  color: "#f87171",
};

const gridEquipasStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 22,
};

const cardEquipaStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 18,
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
  color: "white",
  textDecoration: "none",
  padding: 26,
  borderRadius: 24,
  boxShadow: "0 18px 34px rgba(37, 99, 235, 0.28)",
};

const iconeEquipaStyle: React.CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: 20,
  background: "rgba(255,255,255,0.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 34,
};

const nomeEquipaStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 26,
  fontWeight: "bold",
};

const textoEquipaStyle: React.CSSProperties = {
  margin: "6px 0 0 0",
  opacity: 0.92,
  fontSize: 16,
};

const editarBoxStyle: React.CSSProperties = {
  marginTop: 18,
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const botaoGuardarEditarStyle: React.CSSProperties = {
  padding: "16px 22px",
  borderRadius: 14,
  border: "none",
  backgroundColor: "#16a34a",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: 16,
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