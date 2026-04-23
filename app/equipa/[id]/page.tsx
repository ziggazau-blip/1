"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { auth, db } from "../../lib/firebase";
import { ADMIN_EMAILS } from "../../lib/appConfig";
import { buscarEquipaPorId } from "../../lib/firestore";

type Linha = {
  nome: string;
  seg: string;
  ter: string;
  qua: string;
  qui: string;
  sex: string;
  sab: string;
  dom: string;
};

function novaLinha(): Linha {
  return {
    nome: "",
    seg: "",
    ter: "",
    qua: "",
    qui: "",
    sex: "",
    sab: "",
    dom: "",
  };
}

function getInicioSemana(data: Date) {
  const d = new Date(data);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateKey(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatDatePt(data: Date) {
  return data.toLocaleDateString("pt-PT");
}

export default function EquipaPage() {
  const params = useParams();
  const rawId = params?.id;
  const equipaId = Array.isArray(rawId) ? rawId[0] : String(rawId || "");

  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [nomeEquipa, setNomeEquipa] = useState("");
  const [ownerUid, setOwnerUid] = useState("");
  const [loading, setLoading] = useState(true);
  const [semanaBase, setSemanaBase] = useState<Date | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([
    novaLinha(),
    novaLinha(),
    novaLinha(),
  ]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSemanaBase(new Date());
  }, []);

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth <= 768);
    }

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const isAdmin = useMemo(() => {
    const email = (user?.email || "").toLowerCase().trim();
    return ADMIN_EMAILS.map((e) => e.toLowerCase().trim()).includes(email);
  }, [user]);

  const inicioSemana = useMemo(() => {
    if (!semanaBase) return null;
    return getInicioSemana(semanaBase);
  }, [semanaBase]);

  const fimSemana = useMemo(() => {
    if (!inicioSemana) return null;
    const d = new Date(inicioSemana);
    d.setDate(d.getDate() + 6);
    return d;
  }, [inicioSemana]);

  const semanaKey = useMemo(() => {
    if (!inicioSemana) return "";
    return formatDateKey(inicioSemana);
  }, [inicioSemana]);

  const folhaDocId = useMemo(() => {
    if (!equipaId || !semanaKey) return "";
    return `${equipaId}_${semanaKey}`;
  }, [equipaId, semanaKey]);

  useEffect(() => {
    if (!mounted || !equipaId || !folhaDocId) return;

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        window.location.href = "/";
        return;
      }

      setUser(u);

      try {
        const equipa = await buscarEquipaPorId(equipaId);

        if (!equipa) {
          alert("Equipa não encontrada.");
          window.location.href = "/dashboard";
          return;
        }

        const admin = ADMIN_EMAILS.map((e) => e.toLowerCase().trim()).includes(
          (u.email || "").toLowerCase().trim()
        );

        if (!admin && equipa.ownerUid !== u.uid) {
          alert("Não tens acesso a esta equipa.");
          window.location.href = "/dashboard";
          return;
        }

        setNomeEquipa(equipa.nome);
        setOwnerUid(equipa.ownerUid);

        const folhaRef = doc(db, "folhas", folhaDocId);
        const folhaSnap = await getDoc(folhaRef);

        if (folhaSnap.exists()) {
          const data = folhaSnap.data();
          if (Array.isArray(data.linhas)) {
            setLinhas(data.linhas as Linha[]);
          }
        } else {
          setLinhas([novaLinha(), novaLinha(), novaLinha()]);
        }
      } catch (error) {
        console.error("Erro ao carregar folha:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [mounted, equipaId, folhaDocId]);

  function alterar(index: number, campo: keyof Linha, valor: string) {
    setLinhas((prev) =>
      prev.map((linha, i) =>
        i === index ? { ...linha, [campo]: valor } : linha
      )
    );
  }

  function add() {
    setLinhas((prev) => [...prev, novaLinha()]);
  }

  function remover(index: number) {
    setLinhas((prev) => prev.filter((_, i) => i !== index));
  }

  function total(l: Linha) {
    return (
      Number(l.seg || 0) +
      Number(l.ter || 0) +
      Number(l.qua || 0) +
      Number(l.qui || 0) +
      Number(l.sex || 0) +
      Number(l.sab || 0) +
      Number(l.dom || 0)
    );
  }

  function totalEquipa() {
    return linhas.reduce((acc, l) => acc + total(l), 0);
  }

  async function guardar() {
    if (!folhaDocId || !inicioSemana || !fimSemana || !user) return;

    try {
      await setDoc(doc(db, "folhas", folhaDocId), {
        equipaId,
        ownerUid,
        nomeEquipa,
        semana: semanaKey,
        inicioSemana: formatDateKey(inicioSemana),
        fimSemana: formatDateKey(fimSemana),
        linhas,
        totalEquipa: totalEquipa(),
        updatedAt: Date.now(),
        updatedBy: user.email || "",
      });

      alert("Guardado com sucesso 💪");
    } catch (error) {
      console.error("Erro ao guardar:", error);
      alert("Erro ao guardar");
    }
  }

  async function exportarExcel() {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Folha Semanal");

      const semanaTexto =
        inicioSemana && fimSemana
          ? `${formatDatePt(inicioSemana)} até ${formatDatePt(fimSemana)}`
          : semanaKey;

      worksheet.columns = [
        { header: "Nome", key: "nome", width: 28 },
        { header: "Seg", key: "seg", width: 10 },
        { header: "Ter", key: "ter", width: 10 },
        { header: "Qua", key: "qua", width: 10 },
        { header: "Qui", key: "qui", width: 10 },
        { header: "Sex", key: "sex", width: 10 },
        { header: "Sáb", key: "sab", width: 10 },
        { header: "Dom", key: "dom", width: 10 },
        { header: "Total", key: "total", width: 12 },
      ];

      worksheet.mergeCells("A1:I1");
      worksheet.getCell("A1").value = "AJP Horas";
      worksheet.getCell("A1").font = {
        size: 18,
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      worksheet.getCell("A1").alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      worksheet.getCell("A1").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "1D4ED8" },
      };
      worksheet.getRow(1).height = 28;

      worksheet.mergeCells("A2:I2");
      worksheet.getCell("A2").value = `Equipa: ${nomeEquipa}`;
      worksheet.getCell("A2").font = { bold: true, size: 14 };

      worksheet.mergeCells("A3:I3");
      worksheet.getCell("A3").value = `Semana: ${semanaTexto}`;
      worksheet.getCell("A3").font = { italic: true, size: 12 };

      const headerRow = worksheet.getRow(5);
      headerRow.values = ["Nome", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom", "Total"];
      headerRow.height = 22;

      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "1E293B" },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "000000" } },
          left: { style: "thin", color: { argb: "000000" } },
          bottom: { style: "thin", color: { argb: "000000" } },
          right: { style: "thin", color: { argb: "000000" } },
        };
      });

      let linhaInicialDados = 6;

      linhas.forEach((l, index) => {
        const row = worksheet.getRow(linhaInicialDados + index);
        row.values = [
          l.nome || "",
          Number(l.seg || 0),
          Number(l.ter || 0),
          Number(l.qua || 0),
          Number(l.qui || 0),
          Number(l.sex || 0),
          Number(l.sab || 0),
          Number(l.dom || 0),
          total(l),
        ];

        row.eachCell((cell, colNumber) => {
          cell.alignment = {
            horizontal: colNumber === 1 ? "left" : "center",
            vertical: "middle",
          };

          cell.border = {
            top: { style: "thin", color: { argb: "000000" } },
            left: { style: "thin", color: { argb: "000000" } },
            bottom: { style: "thin", color: { argb: "000000" } },
            right: { style: "thin", color: { argb: "000000" } },
          };

          if (colNumber === 9) {
            cell.font = { bold: true };
          }
        });
      });

      const totalRowNumber = linhaInicialDados + linhas.length + 1;
      worksheet.mergeCells(`A${totalRowNumber}:H${totalRowNumber}`);
      worksheet.getCell(`A${totalRowNumber}`).value = "Total da equipa";
      worksheet.getCell(`I${totalRowNumber}`).value = totalEquipa();

      worksheet.getRow(totalRowNumber).eachCell((cell) => {
        cell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "16A34A" },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "000000" } },
          left: { style: "thin", color: { argb: "000000" } },
          bottom: { style: "thin", color: { argb: "000000" } },
          right: { style: "thin", color: { argb: "000000" } },
        };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(blob, `${nomeEquipa || "equipa"}_${semanaKey}.xlsx`);
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      alert("Erro ao exportar Excel.");
    }
  }

  function semanaAnterior() {
    if (!semanaBase) return;
    const nova = new Date(semanaBase);
    nova.setDate(nova.getDate() - 7);
    setLoading(true);
    setSemanaBase(nova);
  }

  function proximaSemana() {
    if (!semanaBase) return;
    const nova = new Date(semanaBase);
    nova.setDate(nova.getDate() + 7);
    setLoading(true);
    setSemanaBase(nova);
  }

  if (!mounted || loading || !inicioSemana || !fimSemana) {
    return (
      <div style={paginaStyle}>
        <div style={containerStyle}>
          <div style={topCardStyle}>
            <h2 style={{ margin: 0 }}>A carregar...</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={paginaStyle}>
      <div style={containerStyle}>
        <Link href="/dashboard" style={voltarStyle}>
          ← Voltar
        </Link>

        <div style={topCardStyle}>
          <div>
            <h1 style={tituloStyle}>{nomeEquipa}</h1>
            <p style={subtituloStyle}>
              Semana: {formatDatePt(inicioSemana)} até {formatDatePt(fimSemana)}
            </p>
            <p style={subtituloStyle}>
              {isAdmin ? "Modo administrador" : "Modo encarregado"}
            </p>
          </div>

          <div style={semanaBotoesWrapStyle}>
            <button onClick={semanaAnterior} style={botaoAzulStyle}>
              ← Semana anterior
            </button>
            <button onClick={proximaSemana} style={botaoAzulStyle}>
              Próxima semana →
            </button>
          </div>
        </div>

        <div style={acoesStyle}>
          <button onClick={add} style={botaoVerdeStyle}>
            + Trabalhador
          </button>

          <button onClick={exportarExcel} style={botaoAzulStyle}>
            Exportar Excel
          </button>
        </div>

        {isMobile ? (
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            {linhas.map((l, i) => (
              <div key={i} style={mobileCardStyle}>
                <input
                  value={l.nome}
                  onChange={(e) => alterar(i, "nome", e.target.value)}
                  placeholder="Nome do trabalhador"
                  style={mobileNomeStyle}
                />

                <div style={mobileGridStyle}>
                  {[
                    ["Seg", "seg"],
                    ["Ter", "ter"],
                    ["Qua", "qua"],
                    ["Qui", "qui"],
                    ["Sex", "sex"],
                    ["Sáb", "sab"],
                    ["Dom", "dom"],
                  ].map(([label, key]) => (
                    <div key={key} style={mobileInputBoxStyle}>
                      <span style={mobileLabelStyle}>{label}</span>
                      <input
                        type="number"
                        value={l[key as keyof Linha]}
                        onChange={(e) => alterar(i, key as keyof Linha, e.target.value)}
                        style={mobileHorasStyle}
                      />
                    </div>
                  ))}
                </div>

                <div style={mobileFooterStyle}>
                  <strong>Total: {total(l)}h</strong>

                  <button onClick={() => remover(i)} style={botaoVermelhoStyle}>
                    Apagar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Nome</th>
                  <th style={thStyle}>Seg</th>
                  <th style={thStyle}>Ter</th>
                  <th style={thStyle}>Qua</th>
                  <th style={thStyle}>Qui</th>
                  <th style={thStyle}>Sex</th>
                  <th style={thStyle}>Sáb</th>
                  <th style={thStyle}>Dom</th>
                  <th style={thStyle}>Total</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>

              <tbody>
                {linhas.map((l, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>
                      <input
                        value={l.nome}
                        onChange={(e) => alterar(i, "nome", e.target.value)}
                        placeholder="Nome do trabalhador"
                        style={inputNomeStyle}
                      />
                    </td>

                    {(["seg", "ter", "qua", "qui", "sex", "sab", "dom"] as (keyof Linha)[]).map(
                      (d) => (
                        <td key={d} style={tdStyle}>
                          <input
                            type="number"
                            value={l[d]}
                            onChange={(e) => alterar(i, d, e.target.value)}
                            style={inputHorasStyle}
                          />
                        </td>
                      )
                    )}

                    <td style={tdTotalStyle}>{total(l)}</td>

                    <td style={tdStyle}>
                      <button onClick={() => remover(i)} style={botaoVermelhoStyle}>
                        X
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={totalCardStyle}>Total equipa: {totalEquipa()}h</div>

        <button onClick={guardar} style={guardarStyle}>
          Guardar
        </button>
      </div>
    </div>
  );
}

const paginaStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #020617 0%, #0f172a 55%, #111827 100%)",
  color: "white",
  padding: 20,
};

const containerStyle: React.CSSProperties = {
  maxWidth: 1300,
  margin: "0 auto",
};

const voltarStyle: React.CSSProperties = {
  color: "#60a5fa",
  textDecoration: "none",
  fontWeight: "bold",
};

const topCardStyle: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 20,
  padding: 24,
  marginTop: 20,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  flexWrap: "wrap",
};

const tituloStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 34,
};

const subtituloStyle: React.CSSProperties = {
  color: "#94a3b8",
  marginTop: 8,
  marginBottom: 0,
};

const semanaBotoesWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const acoesStyle: React.CSSProperties = {
  marginTop: 18,
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 1200,
  borderCollapse: "collapse",
  background: "#0f172a",
  borderRadius: 16,
  overflow: "hidden",
  marginTop: 20,
};

const thStyle: React.CSSProperties = {
  background: "#1e293b",
  color: "white",
  padding: 14,
  border: "1px solid #334155",
  textAlign: "center",
};

const tdStyle: React.CSSProperties = {
  padding: 10,
  border: "1px solid #334155",
  textAlign: "center",
};

const tdTotalStyle: React.CSSProperties = {
  padding: 10,
  border: "1px solid #334155",
  textAlign: "center",
  fontWeight: "bold",
  fontSize: 18,
};

const inputNomeStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 220,
  padding: 10,
  borderRadius: 8,
  background: "#020617",
  color: "white",
  border: "1px solid #334155",
};

const inputHorasStyle: React.CSSProperties = {
  width: 70,
  padding: 8,
  borderRadius: 8,
  background: "#020617",
  color: "white",
  border: "1px solid #334155",
  textAlign: "center",
};

const guardarStyle: React.CSSProperties = {
  marginTop: 20,
  background: "#16a34a",
  color: "white",
  padding: "14px 20px",
  borderRadius: 10,
  border: "none",
  fontWeight: "bold",
  fontSize: 16,
  cursor: "pointer",
};

const totalCardStyle: React.CSSProperties = {
  marginTop: 20,
  background: "#0f172a",
  border: "1px solid #334155",
  padding: 20,
  borderRadius: 16,
  fontSize: 28,
  fontWeight: "bold",
};

const botaoAzulStyle: React.CSSProperties = {
  background: "#2563eb",
  color: "white",
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontWeight: "bold",
};

const botaoVerdeStyle: React.CSSProperties = {
  background: "#16a34a",
  color: "white",
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontWeight: "bold",
};

const botaoVermelhoStyle: React.CSSProperties = {
  background: "#dc2626",
  color: "white",
  border: "none",
  padding: "8px 10px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
};

const mobileCardStyle: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 18,
  padding: 16,
};

const mobileNomeStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  background: "#020617",
  color: "white",
  border: "1px solid #334155",
  marginBottom: 14,
  fontSize: 16,
};

const mobileGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 10,
};

const mobileInputBoxStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const mobileLabelStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
  fontWeight: "bold",
};

const mobileHorasStyle: React.CSSProperties = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  background: "#020617",
  color: "white",
  border: "1px solid #334155",
  textAlign: "center",
  fontSize: 16,
};

const mobileFooterStyle: React.CSSProperties = {
  marginTop: 14,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
};