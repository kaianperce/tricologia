import { useEffect } from "react";
import type { AnamnesisData } from "@/lib/anamnesis-schema";

type Clinic = { name?: string | null; logo_url?: string | null; phone?: string | null; email?: string | null };

export function AnamnesisPrintView({
  patient, clinic, data, onClose,
}: { patient: any; clinic: Clinic | null; data: AnamnesisData; onClose: () => void }) {
  useEffect(() => {
    const orig = document.title;
    document.title = `Anamnese — ${patient.full_name}`;
    return () => { document.title = orig; };
  }, [patient.full_name]);

  const yn = (v?: boolean) => (v ? "Sim" : v === false ? "Não" : "—");
  const txt = (v?: string | number | null) => (v === undefined || v === null || v === "" ? "—" : String(v));
  const list = (v?: string[]) => (v && v.length ? v.join(" · ") : "—");

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-white text-black print:static print:inset-auto">
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          .no-print { display: none !important; }
          body { background: white !important; }
        }
        .a4 { max-width: 800px; margin: 0 auto; padding: 24px; }
        .a4 h1 { font-size: 22px; font-weight: 600; }
        .a4 h2 { font-size: 14px; font-weight: 600; margin-top: 18px; border-bottom: 1px solid #ddd; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 0.04em; color: #444; }
        .a4 .row { display: grid; grid-template-columns: 200px 1fr; gap: 8px; padding: 4px 0; font-size: 12px; }
        .a4 .row b { color: #222; }
        .a4 .head { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #2f3e2f; padding-bottom: 10px; }
        .a4 .logo { height: 48px; object-fit: contain; }
        .a4 .meta { font-size: 11px; color: #555; text-align: right; }
      `}</style>

      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b bg-white p-3">
        <span className="text-sm font-medium">Pré-visualização da ficha</span>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="rounded bg-black px-3 py-1.5 text-xs text-white">Imprimir / Salvar PDF</button>
          <button onClick={onClose} className="rounded border px-3 py-1.5 text-xs">Fechar</button>
        </div>
      </div>

      <div className="a4">
        <div className="head">
          <div>
            <h1>Ficha de Anamnese Capilar</h1>
            <div style={{ fontSize: 12, color: "#555" }}>{clinic?.name ?? "—"}</div>
          </div>
          {clinic?.logo_url ? (
            <img src={clinic.logo_url} alt={clinic.name ?? ""} className="logo" />
          ) : (
            <div className="meta">
              {clinic?.phone ?? ""}<br />{clinic?.email ?? ""}
            </div>
          )}
        </div>

        <h2>Identificação</h2>
        <div className="row"><b>Nome</b><span>{txt(patient.full_name)}</span></div>
        <div className="row"><b>Data de nascimento</b><span>{txt(patient.birth_date)}</span></div>
        <div className="row"><b>Sexo</b><span>{txt(patient.sex)}</span></div>
        <div className="row"><b>Telefone / WhatsApp</b><span>{txt(patient.phone)} {patient.whatsapp ? `· ${patient.whatsapp}` : ""}</span></div>
        <div className="row"><b>Endereço</b><span>{txt(patient.address)}</span></div>

        <h2>Queixa principal</h2>
        <div className="row"><b>Queixas</b><span>{list(data.queixa_principal)}</span></div>
        <div className="row"><b>Descrição</b><span>{txt(data.queixa_descricao)}</span></div>

        <h2>Queda</h2>
        <div className="row"><b>Percebeu queda</b><span>{yn(data.percebeu_queda)}</span></div>
        <div className="row"><b>Há quanto tempo</b><span>{txt(data.queda_tempo)}</span></div>
        <div className="row"><b>Evolução</b><span>{txt(data.queda_evolucao)}</span></div>
        <div className="row"><b>Distribuição</b><span>{list(data.queda_distribuicao)}</span></div>
        <div className="row"><b>Escala de padrão</b><span>{txt(data.escala_padrao)}</span></div>
        <div className="row"><b>Teste de tração</b><span>{txt(data.pull_test)}{data.pull_test_fios != null ? ` · ${data.pull_test_fios} fios` : ""}</span></div>
        <div className="row"><b>Perda em outras partes</b><span>{yn(data.perda_outras_partes)} {data.perda_outras_partes_onde ? `· ${data.perda_outras_partes_onde}` : ""}</span></div>
        <div className="row"><b>Eventos marcantes (3m)</b><span>{yn(data.eventos_marcantes_3m)} {data.eventos_descricao ? `· ${data.eventos_descricao}` : ""}</span></div>
        <div className="row"><b>Característica</b><span>
          {[
            data.queda_no_banho && "no banho",
            data.queda_ao_pentear && "ao pentear",
            data.queda_com_bulbo && "com bulbo",
            data.queda_por_quebra && "por quebra",
          ].filter(Boolean).join(" · ") || "—"}
        </span></div>

        <h2>Couro cabeludo</h2>
        <div className="row"><b>Sintomas</b><span>{list(data.couro_sintomas)}</span></div>
        <div className="row"><b>Oleosidade</b><span>{data.couro_oleosidade != null ? `${data.couro_oleosidade}/10` : "—"}</span></div>
        <div className="row"><b>Descamação</b><span>{txt(data.descamacao_tipo)}</span></div>
        <div className="row"><b>Observações</b><span>{txt(data.couro_observacoes)}</span></div>

        <h2>Fios e haste</h2>
        <div className="row"><b>Curvatura / espessura / densidade</b><span>{[data.curvatura, data.espessura, data.densidade_percebida].filter(Boolean).join(" · ") || "—"}</span></div>
        <div className="row"><b>Qualidade da fibra</b><span>{list(data.fios_sintomas)}</span></div>

        <h2>Hábitos capilares</h2>
        <div className="row"><b>Tipo de cabelo</b><span>{txt(data.tipo_cabelo)}</span></div>
        <div className="row"><b>Frequência de lavagem</b><span>{txt(data.freq_lavagem)}</span></div>
        <div className="row"><b>Secador / chapinha</b><span>{yn(data.usa_secador)} / {yn(data.usa_chapinha)} {data.freq_calor ? `· ${data.freq_calor}` : ""}</span></div>
        <div className="row"><b>Química</b><span>{yn(data.usa_quimica)} {data.qual_quimica ? `· ${data.qual_quimica}` : ""}</span></div>
        <div className="row"><b>Penteados de tração</b><span>{yn(data.penteados_tracao)} {data.penteados_tracao_desc ? `· ${data.penteados_tracao_desc}` : ""}</span></div>
        <div className="row"><b>Transplante capilar</b><span>{yn(data.fez_transplante)} {data.transplante_desc ? `· ${data.transplante_desc}` : ""}</span></div>
        <div className="row"><b>Produtos atuais</b><span>{txt(data.produtos_usados)}</span></div>

        <h2>Histórico de saúde</h2>
        <div className="row"><b>Doenças</b><span>{list(data.doencas)}</span></div>
        <div className="row"><b>Marcapasso</b><span>{yn(data.marcapasso)}</span></div>
        <div className="row"><b>Medicamentos atuais</b><span>{txt(data.medicamentos_atuais)}</span></div>
        <div className="row"><b>Uso contínuo</b><span>{yn(data.medicamento_continuo)} {data.medicamento_continuo_desc ? `· ${data.medicamento_continuo_desc}` : ""}</span></div>
        <div className="row"><b>Suplementos</b><span>{txt(data.suplementos)}</span></div>
        <div className="row"><b>Alergias</b><span>{txt(data.alergias)}</span></div>
        <div className="row"><b>Histórico familiar de calvície</b><span>{yn(data.historico_familiar)} {data.historico_familiar_lado ? `· lado ${data.historico_familiar_lado}` : ""} {data.historico_familiar_idade ? `· ${data.historico_familiar_idade}` : ""}</span></div>

        <h2>Alimentação, hormonal, sono e emocional</h2>
        <div className="row"><b>Alimentação</b><span>{txt(data.alimentacao)}</span></div>
        <div className="row"><b>Intestino regular</b><span>{yn(data.intestino_regular)}</span></div>
        <div className="row"><b>Desregulação hormonal</b><span>{yn(data.desregulacao_hormonal)}</span></div>
        <div className="row"><b>Anticoncepcional / DIU</b><span>{yn(data.anticoncepcional_diu)} {data.anticoncepcional_desc ? `· ${data.anticoncepcional_desc}` : ""}</span></div>
        <div className="row"><b>Gestante / lactante</b><span>{yn(data.gestante_lactante)}</span></div>
        <div className="row"><b>Menopausa / climatério</b><span>{yn(data.menopausa)}</span></div>
        <div className="row"><b>Fuma / álcool</b><span>{yn(data.fuma)} / {yn(data.alcool)}</span></div>
        <div className="row"><b>Atividade física</b><span>{txt(data.atividade_fisica)}</span></div>
        <div className="row"><b>Sono</b><span>{txt(data.horas_sono)}h · {txt(data.qualidade_sono)}</span></div>
        <div className="row"><b>Tratamento psicológico</b><span>{yn(data.tratamento_psicologico)}</span></div>
        <div className="row"><b>Autoavaliação</b><span>
          {[data.ansiosa_estressada && "ansiosa/estressada", data.depressiva && "depressiva"].filter(Boolean).join(" · ") || "—"}
          {data.estresse_nivel != null ? ` · estresse ${data.estresse_nivel}/10` : ""}
        </span></div>

        <h2>Exames laboratoriais</h2>
        {(data.labs ?? []).length ? (
          (data.labs ?? []).map((l, i) => (
            <div className="row" key={i}><b>{txt(l.nome)}</b><span>{txt(l.valor)} {l.unidade ?? ""} {l.data ? `· ${l.data}` : ""}</span></div>
          ))
        ) : (
          <div className="row"><b>Exames</b><span>—</span></div>
        )}
        <div className="row"><b>Observações</b><span>{txt(data.exames_observacoes)}</span></div>

        <h2>Tratamentos / diagnósticos anteriores</h2>
        <div className="row"><b>Tratamentos prévios</b><span>{txt(data.tratamentos_anteriores)}</span></div>
        <div className="row"><b>Diagnóstico anterior</b><span>{txt(data.diagnostico_anterior)}</span></div>
        <div className="row"><b>Efeitos adversos</b><span>{txt(data.efeitos_adversos)}</span></div>
        <div className="row"><b>Observações finais</b><span>{txt(data.observacoes_finais)}</span></div>

        <p style={{ marginTop: 24, fontSize: 10, color: "#777" }}>
          Documento gerado pelo TrichoCare AI. As informações foram declaradas pelo(a) paciente; conferir e validar com o profissional responsável.
        </p>

        <div style={{ marginTop: 40, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
          <div style={{ borderTop: "1px solid #333", paddingTop: 6, textAlign: "center", fontSize: 11 }}>Assinatura do(a) paciente</div>
          <div style={{ borderTop: "1px solid #333", paddingTop: 6, textAlign: "center", fontSize: 11 }}>Profissional responsável</div>
        </div>
      </div>
    </div>
  );
}
