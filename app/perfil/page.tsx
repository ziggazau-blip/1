"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signOut,
  updatePassword,
  updateProfile,
  User,
} from "firebase/auth";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, storage } from "../lib/firebase";
import { ADMIN_EMAILS } from "../lib/appConfig";

export default function PerfilPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [nome, setNome] = useState("");
  const [fotoAtual, setFotoAtual] = useState("");
  const [novaFoto, setNovaFoto] = useState<File | null>(null);

  const [passwordAtual, setPasswordAtual] = useState("");
  const [novaPassword, setNovaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");

  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [aGuardarPerfil, setAGuardarPerfil] = useState(false);
  const [aGuardarPassword, setAGuardarPassword] = useState(false);

  const inputFotoRef = useRef<HTMLInputElement | null>(null);

  const isAdmin = useMemo(() => {
    const email = (user?.email || "").toLowerCase().trim();
    return ADMIN_EMAILS.map((e) => e.toLowerCase().trim()).includes(email);
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) {
        window.location.href = "/";
        return;
      }

      setUser(u);
      setNome(u.displayName || "");
      setFotoAtual(u.photoURL || "");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const previewFoto = useMemo(() => {
    if (novaFoto) {
      return URL.createObjectURL(novaFoto);
    }
    return fotoAtual;
  }, [novaFoto, fotoAtual]);

  useEffect(() => {
    return () => {
      if (novaFoto && previewFoto?.startsWith("blob:")) {
        URL.revokeObjectURL(previewFoto);
      }
    };
  }, [novaFoto, previewFoto]);

  function abrirSeletorFoto() {
    inputFotoRef.current?.click();
  }

  function onEscolherFoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setNovaFoto(file);
  }

  async function uploadFoto(uid: string) {
    if (!novaFoto) return fotoAtual || "";

    const extensao = novaFoto.name.split(".").pop() || "jpg";
    const caminho = `perfil/${uid}/avatar.${extensao}`;
    const storageRef = ref(storage, caminho);

    await uploadBytes(storageRef, novaFoto);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  }

  async function guardarPerfil() {
    if (!auth.currentUser) return;

    setMensagem("");
    setErro("");

    try {
      setAGuardarPerfil(true);

      const downloadURL = await uploadFoto(auth.currentUser.uid);

      await updateProfile(auth.currentUser, {
        displayName: nome.trim(),
        photoURL: downloadURL || null,
      });

      setFotoAtual(downloadURL || "");
      setNovaFoto(null);
      setUser({ ...auth.currentUser });

      setMensagem("Perfil atualizado com sucesso.");
    } catch (error) {
      console.error(error);
      setErro("Não foi possível guardar o perfil. Confirma o Storage do Firebase.");
    } finally {
      setAGuardarPerfil(false);
    }
  }

  async function guardarPassword() {
    if (!auth.currentUser || !auth.currentUser.email) return;

    setMensagem("");
    setErro("");

    if (!passwordAtual || !novaPassword || !confirmarPassword) {
      setErro("Preenche os campos da palavra-passe.");
      return;
    }

    if (novaPassword.length < 6) {
      setErro("A nova palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }

    if (novaPassword !== confirmarPassword) {
      setErro("A confirmação da palavra-passe não coincide.");
      return;
    }

    try {
      setAGuardarPassword(true);

      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        passwordAtual
      );

      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, novaPassword);

      setPasswordAtual("");
      setNovaPassword("");
      setConfirmarPassword("");

      setMensagem("Palavra-passe alterada com sucesso.");
    } catch (error) {
      console.error(error);
      setErro("Não foi possível alterar a palavra-passe. Confirma a password atual.");
    } finally {
      setAGuardarPassword(false);
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
          <div style={cardStyle}>A carregar...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={paginaStyle}>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h1 style={tituloStyle}>Perfil</h1>
          <p style={subtituloStyle}>Gere os teus dados pessoais</p>
        </div>

        <div style={cardStyle}>
          <div style={topoPerfilStyle}>
            <div style={avatarAreaStyle}>
              {previewFoto ? (
                <img
                  src={previewFoto}
                  alt="Foto de perfil"
                  style={avatarImgStyle}
                />
              ) : (
                <div style={avatarFallbackStyle}>
                  {(nome || user?.email || "U").charAt(0).toUpperCase()}
                </div>
              )}

              <button
                type="button"
                onClick={abrirSeletorFoto}
                style={botaoCanetaStyle}
                title="Alterar foto"
              >
                ✏️
              </button>

              <input
                ref={inputFotoRef}
                type="file"
                accept="image/*"
                onChange={onEscolherFoto}
                style={{ display: "none" }}
              />
            </div>

            <div style={{ flex: 1, minWidth: 220 }}>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome"
                style={inputNomeTopoStyle}
              />

              <p style={emailStyle}>{user?.email}</p>

              <span style={badgeStyle}>{isAdmin ? "Admin" : "Encarregado"}</span>
            </div>
          </div>

          <div style={secaoTituloWrapStyle}>
            <h2 style={secaoTituloStyle}>Segurança</h2>
            <p style={secaoSubtituloStyle}>
              Altera a tua palavra-passe diretamente no painel.
            </p>
          </div>

          <div style={passwordGridStyle}>
            <input
              type="password"
              value={passwordAtual}
              onChange={(e) => setPasswordAtual(e.target.value)}
              placeholder="Palavra-passe atual"
              style={inputStyle}
            />

            <input
              type="password"
              value={novaPassword}
              onChange={(e) => setNovaPassword(e.target.value)}
              placeholder="Nova palavra-passe"
              style={inputStyle}
            />

            <input
              type="password"
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
              placeholder="Confirmar nova palavra-passe"
              style={inputStyle}
            />
          </div>

          {mensagem && <p style={mensagemSucessoStyle}>{mensagem}</p>}
          {erro && <p style={mensagemErroStyle}>{erro}</p>}

          <div style={botoesWrapStyle}>
            <button
              onClick={guardarPerfil}
              disabled={aGuardarPerfil}
              style={botaoVerdeStyle}
            >
              {aGuardarPerfil ? "A guardar perfil..." : "Guardar perfil"}
            </button>

            <button
              onClick={guardarPassword}
              disabled={aGuardarPassword}
              style={botaoAzulStyle}
            >
              {aGuardarPassword ? "A alterar..." : "Alterar palavra-passe"}
            </button>
          </div>
        </div>
      </div>

      <nav style={bottomNavStyle}>
        <Link href="/dashboard" style={navLinkStyle}>
          <span style={navIconStyle}>🏠</span>
          <span>Início</span>
        </Link>

        <Link href="/perfil" style={navAtivoStyle}>
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
  maxWidth: 920,
  margin: "0 auto",
  padding: 20,
  paddingBottom: 110,
};

const headerStyle: React.CSSProperties = {
  marginBottom: 24,
};

const tituloStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 40,
  fontWeight: "bold",
};

const subtituloStyle: React.CSSProperties = {
  marginTop: 8,
  color: "#94a3b8",
};

const cardStyle: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 24,
  padding: 24,
};

const topoPerfilStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 20,
  flexWrap: "wrap",
  marginBottom: 28,
};

const avatarAreaStyle: React.CSSProperties = {
  position: "relative",
  width: 110,
  height: 110,
};

const avatarImgStyle: React.CSSProperties = {
  width: 110,
  height: 110,
  borderRadius: "50%",
  objectFit: "cover",
  border: "3px solid #2563eb",
};

const avatarFallbackStyle: React.CSSProperties = {
  width: 110,
  height: 110,
  borderRadius: "50%",
  background: "linear-gradient(135deg, #2563eb, #16a34a)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 38,
  fontWeight: "bold",
  border: "3px solid #2563eb",
};

const botaoCanetaStyle: React.CSSProperties = {
  position: "absolute",
  right: 2,
  bottom: 2,
  width: 34,
  height: 34,
  borderRadius: "50%",
  border: "none",
  background: "#2563eb",
  color: "white",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 8px 18px rgba(0,0,0,0.25)",
};

const inputNomeTopoStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 360,
  padding: 12,
  borderRadius: 12,
  border: "1px solid #475569",
  background: "#020617",
  color: "white",
  fontSize: 28,
  fontWeight: "bold",
};

const emailStyle: React.CSSProperties = {
  margin: "10px 0 10px 0",
  color: "#94a3b8",
  fontSize: 18,
};

const badgeStyle: React.CSSProperties = {
  display: "inline-block",
  background: "#1d4ed8",
  color: "white",
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: "bold",
};

const secaoTituloWrapStyle: React.CSSProperties = {
  marginBottom: 14,
};

const secaoTituloStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 24,
};

const secaoSubtituloStyle: React.CSSProperties = {
  marginTop: 8,
  color: "#94a3b8",
};

const passwordGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 12,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 14,
  borderRadius: 12,
  border: "1px solid #475569",
  background: "#020617",
  color: "white",
  fontSize: 16,
};

const mensagemSucessoStyle: React.CSSProperties = {
  color: "#4ade80",
  fontWeight: "bold",
  marginTop: 18,
};

const mensagemErroStyle: React.CSSProperties = {
  color: "#f87171",
  fontWeight: "bold",
  marginTop: 18,
};

const botoesWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 24,
};

const botaoVerdeStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 220,
  padding: 14,
  borderRadius: 12,
  border: "none",
  background: "#16a34a",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: 16,
};

const botaoAzulStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 220,
  padding: 14,
  borderRadius: 12,
  border: "none",
  background: "#2563eb",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: 16,
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