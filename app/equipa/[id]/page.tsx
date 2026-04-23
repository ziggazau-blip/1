"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { auth } from "../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

const dias = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;
type Dia = (typeof dias)[number];

type Linha = {
  nome: string;
  Seg: string;
  Ter: string;
  Qua: string;
  Qui: string;
  Sex: string;
  Sáb: string;
  Dom: string;
};

type Equipa = {
  id: string;
  nome: string;
  ownerUid: string;
  ownerEmail: string;
};

const ADMIN_EMAILS = ["TEU_EMAIL_AQUI@gmail.com"];
const STORAGE_EQUIPAS = "ajp-admin-equipas";

export default function PaginaEquipa() {
  const params = useParams();
  const idParam = params?.id;
  const id = Array.isArray(idParam) ? idParam[0] : String(idParam || "1");

  return <FolhaEquipa key={id} id={id} />;
}

function FolhaEquipa({ id }: { id: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [dataSemana, setDataSemana] = useState(new Date());
  const [nomeEquipa, setNomeEquipa] = useState("Equipa");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (!authUser) {
        window.location.href = "/";
        return;
      }

      const isAdmin = ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(
        (authUser.email || "").toLowerCase()
      );

      setUser(authUser);

      const guardadas = localStorage.getItem(STORAGE_EQUIPAS);

      if (!guardadas) {
        window.location.href = "/dashboard";
        return;
      }

      try {
        const equipas: Equipa[] = JSON.parse(guardadas);
        const equipa = equipas.find((e) => e.id === id);

        if (!equipa) {
          window.location.href = "/dashboard";
          return;
        }

        if (!isAdmin && equipa.ownerUid !== authUser.uid) {
          window.location.href = "/dashboard";
          return;
        }

        setNomeEquipa(equipa.nome);
      } catch {
        window.location.href = "/dashboard";
        return;
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  function getInicioSemana(data: Date) {
    const novaData = new Date(data);
    const dia = novaData.getDay();
    const diff = dia === 0 ? -6 : 1 - dia;
    novaData.setDate(novaData.getDate() + diff);
    novaData.setHours(0, 0, 0, 0);
    return novaData;
  }

  function getFimSemana(data: Date) {
    const inicio = getInicioSemana(data);
    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);
    return fim;
  }

  function formatarData(data: Date) {
    return data.toLocaleDateString("pt-PT");
  }

  function formatarChaveSemana(data: Date) {
    const inicio = getInicioSemana(data);
    const ano = inicio.getFullYear();
    const mes = String(inicio.getMonth() + 1).padStart(2, "0");
    const dia = String(inicio.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  const inicioSemana = getInicioSemana(dataSemana);
  const fimSemana = getFimSemana(dataSemana);
  const semanaKey = formatarChaveSemana(dataSemana);
  const storageKeyFolha = user
    ? `folha-${id}-${semanaKey}`
    : `folha-${id}-${semanaKey}`;

  function criarLinhaVazia(): Linha {
    return {
      nome: "",
      Seg: "",
      Ter: "",
      Qua: "",
      Qui: "",
      Sex: "",
      Sáb: "",
      Dom: "",
    };
  }

  useEffect(() => {
    if (!user) return;

    const guardado = localStorage.getItem(storageKeyFolha);

    if (guardado) {
      try {
        const dados = JSON.parse(guardado);

        if (Array.isArray(dados) && dados.length > 0) {
          setLinhas(dados);
          return;
        }
      } catch {}
    }

    setLinhas([
      criarLinhaVazia(),
      criarLinhaVazia(),
      criarLinhaVazia(),
      criarLinhaVazia(),
      criarLinhaVazia(),
    ]);
  }, [storageKeyFolha, user]);

  function atualizarHora(index: number, dia: Dia, valor: string) {
    setLinhas((prev) =>
      prev.map((linha, i) =>
        i === index
          ? {
              ...linha,
              [dia]: valor,
            }
          : linha
      )
    );
  }

  function atualizarNome(index: number, valor: string) {
    setLinhas((prev) =>
      prev.map((linha, i) =>
        i === index
          ? {
              ...linha,
              nome: valor,
            }
          : linha
      )
    );
  }

  function adicionarLinha() {
    setLinhas((prev) => [...prev, criarLinhaVazia()]);
  }

  function removerLinha(index: number) {
    setLinhas((prev) => prev.filter((_, i) => i !== index));
  }

  function totalTrabalhador(linha: Linha) {
    return dias.reduce((total, dia) => total + Number(linha[dia] || 0), 0);
  }

  const totalEquipa = useMemo(() => {
    return linhas.reduce((total, linha) => total + totalTrabalhador(linha), 0);
  }, [linhas]);

  function guardarFolha() {
    localStorage.setItem(storageKeyFolha, JSON.stringify(linhas));
    setMensagem("Guardado com sucesso");

    setTimeout(() => {
      setMensagem("");
    }, 2000);
  }

  function semanaAnterior() {
    const novaData = new Date(dataSemana);
    novaData.setDate(novaData.getDate() - 7);
    setDataSemana(novaData);
  }

  function proximaSemana() {
    const novaData = new Date(dataSemana);
    novaData.setDate(novaData.getDate() + 7);
    setDataSemana(novaData);
  }

  function exportarCSV() {
    const cabecalho = [
      "Trabalhador",
      "Seg",
      "Ter",
      "Qua",
      "Qui",
      "Sex",
      "Sáb",
      "Dom",
      "Total",
    ];

    const linhasCSV = linhas.map((linha) => [
      linha.nome,
      linha.Seg,
      linha.Ter,
      linha.Qua,
      linha.Qui,
      linha.Sex,
      linha.Sáb,
      linha.Dom,
      String(totalTrabalhador(linha)),
    ]);

    const conteudo = [cabecalho, ...linhasCSV]
      .map((linha) =>
        linha
          .map((campo) => `"${String(campo ?? "").replace(/"/g, '""')}"`)
          .join(";")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + conteudo], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nomeEquipa.replace(/\s+/g, "-").toLowerCase()}-${semanaKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return null;

  return (
    <div style={paginaStyle}>
      <div style={containerStyle}>
        <div style={topBarStyle}>
          <Link href="/dashboard" style={voltarStyle}>
            ← Voltar
          </Link>
        </div>

        <div style={cardTopoStyle}>
          <div>
            <p style={etiquetaStyle}>Folha semanal</p>
            <h1 style={tituloStyle}>{nomeEquipa}</h1>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button onClick={semanaAnterior} style={botaoSemanaStyle}>
              ⬅
            </button>

            <span style={textoSemanaStyle}>
              {formatarData(inicioSemana)} → {formatarData(fimSemana)}
            </span>

            <button onClick={proximaSemana} style={botaoSemanaStyle}>
              ➡
            </button>
          </div>
        </div>

        <div style={acoesSecundariasStyle}>
          <button onClick={adicionarLinha} style={botaoSecundarioStyle}>
            + Adicionar trabalhador
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 1100,
              backgroundColor: "#020617",
              borderRadius: 20,
              overflow: "hidden",
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Trabalhador</th>
                {dias.map((dia) => (
                  <th key={dia} style={thStyle}>
                    {dia}
                  </th>
                ))}
                <th style={thStyle}>Total</th>
                <th style={thStyle}>Ações</th>
              </tr>
            </thead>

            <tbody>
              {linhas.map((linha, index) => (
                <tr key={index}>
                  <td style={tdStyleNome}>
                    <input
                      type="text"
                      placeholder="Nome do trabalhador"
                      value={linha.nome}
                      onChange={(e) => atualizarNome(index, e.target.value)}
                      style={inputNomeStyle}
                    />
                  </td>

                  {dias.map((dia) => (
                    <td key={dia} style={tdStyle}>
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={linha[dia]}
                        onChange={(e) =>
                          atualizarHora(index, dia, e.target.value)
                        }
                        style={inputStyle}
                      />
                    </td>
                  ))}

                  <td style={tdStyleTotal}>{totalTrabalhador(linha)}</td>

                  <td style={tdStyleAcao}>
                    <button
                      onClick={() => removerLinha(index)}
                      style={botaoRemoverStyle}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={totalCardStyle}>Total da equipa: {totalEquipa} horas</div>

        <div style={rodapeBotoesStyle}>
          <button onClick={guardarFolha} style={botaoGuardarStyle}>
            Guardar folha
          </button>

          <button onClick={exportarCSV} style={botaoExcelStyle}>
            Exportar para Excel
          </button>
        </div>

        {mensagem && <p style={mensagemStyle}>{mensagem}</p>}
      </div>
    </div>
  );
}

const paginaStyle: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "linear-gradient(180deg, #020617 0%, #0f172a 50%, #111827 100%)",
  color: "white",
  padding: 20,
};

const containerStyle: React.CSSProperties = {
  maxWidth: 1250,
  margin: "0 auto",
};

const topBarStyle: React.CSSProperties = {
  maxWidth: 1250,
  margin: "0 auto 18px auto",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const voltarStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "12px 16px",
  borderRadius: 12,
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  color: "white",
  textDecoration: "none",
  fontWeight: "bold",
};

const cardTopoStyle: React.CSSProperties = {
  maxWidth: 1250,
  margin: "0 auto 18px auto",
  background: "linear-gradient(135deg, #1e293b, #0f172a)",
  border: "1px solid #334155",
  borderRadius: 22,
  padding: 22,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
};

const etiquetaStyle: React.CSSProperties = {
  margin: 0,
  color: "#94a3b8",
  fontWeight: "bold",
};

const tituloStyle: React.CSSProperties = {
  margin: "6px 0 0 0",
  fontSize: 34,
  fontWeight: "bold",
};

const textoSemanaStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: "bold",
};

const acoesSecundariasStyle: React.CSSProperties = {
  maxWidth: 1250,
  margin: "0 auto 18px auto",
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const botaoSecundarioStyle: React.CSSProperties = {
  padding: "14px 18px",
  borderRadius: 12,
  border: "1px solid #475569",
  backgroundColor: "#0f172a",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

const thStyle: React.CSSProperties = {
  border: "1px solid #334155",
  padding: 14,
  backgroundColor: "#1e293b",
  color: "white",
  textAlign: "center",
  fontSize: 18,
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #334155",
  padding: 10,
  textAlign: "center",
};

const tdStyleNome: React.CSSProperties = {
  border: "1px solid #334155",
  padding: 10,
  minWidth: 240,
};

const tdStyleTotal: React.CSSProperties = {
  border: "1px solid #334155",
  padding: 10,
  textAlign: "center",
  fontWeight: "bold",
  minWidth: 90,
  fontSize: 20,
};

const tdStyleAcao: React.CSSProperties = {
  border: "1px solid #334155",
  padding: 10,
  textAlign: "center",
  minWidth: 120,
};

const inputStyle: React.CSSProperties = {
  width: 72,
  padding: 12,
  borderRadius: 12,
  border: "1px solid #64748b",
  textAlign: "center",
  fontSize: 18,
  backgroundColor: "#0b1730",
  color: "white",
};

const inputNomeStyle: React.CSSProperties = {
  width: "100%",
  padding: 14,
  borderRadius: 12,
  border: "1px solid #64748b",
  fontSize: 16,
  backgroundColor: "#0b1730",
  color: "white",
};

const totalCardStyle: React.CSSProperties = {
  maxWidth: 1250,
  margin: "20px auto 0 auto",
  padding: 18,
  backgroundColor: "#0b1730",
  borderRadius: 18,
  fontSize: 28,
  fontWeight: "bold",
};

const rodapeBotoesStyle: React.CSSProperties = {
  maxWidth: 1250,
  margin: "20px auto 0 auto",
  display: "flex",
  gap: 14,
  flexWrap: "wrap",
};

const botaoGuardarStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 220,
  padding: 18,
  borderRadius: 16,
  border: "none",
  backgroundColor: "#16a34a",
  color: "white",
  fontSize: 20,
  fontWeight: "bold",
  cursor: "pointer",
};

const botaoExcelStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 220,
  padding: 18,
  borderRadius: 16,
  border: "none",
  backgroundColor: "#1d4ed8",
  color: "white",
  fontSize: 20,
  fontWeight: "bold",
  cursor: "pointer",
};

const botaoRemoverStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "none",
  backgroundColor: "#dc2626",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

const botaoSemanaStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  backgroundColor: "#2563eb",
  color: "white",
  fontSize: 16,
  fontWeight: "bold",
  cursor: "pointer",
};

const mensagemStyle: React.CSSProperties = {
  maxWidth: 1250,
  margin: "14px auto 0 auto",
  color: "#4ade80",
  fontWeight: "bold",
  fontSize: 16,
};