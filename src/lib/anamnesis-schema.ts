export const ANAMNESIS_STEPS = [
  { id: 1, key: "queixa", title: "Queixa principal", description: "Motivo da consulta e descrição" },
  { id: 2, key: "queda", title: "Queda capilar", description: "Padrão, tempo e gatilhos" },
  { id: 3, key: "couro", title: "Couro cabeludo", description: "Sintomas e sensibilidade" },
  { id: 4, key: "fios", title: "Fios e haste", description: "Qualidade e textura" },
  { id: 5, key: "habitos", title: "Hábitos capilares", description: "Rotina, química e tração" },
  { id: 6, key: "saude", title: "Histórico de saúde", description: "Doenças, medicamentos, alergias" },
  { id: 7, key: "estilo", title: "Alimentação e estilo de vida", description: "Sono, hormonal, emocional" },
  { id: 8, key: "tratamentos", title: "Tratamentos anteriores", description: "Diagnósticos e resumo final" },
] as const;

export const QUEIXAS_OPTIONS = [
  "Queda capilar","Afinamento","Falhas","Perda de volume","Oleosidade","Caspa/descamação",
  "Coceira","Dor","Ardência","Sensibilidade","Quebra","Pós-química","Pós-parto","Estresse","Outro",
];

export const COURO_SINTOMAS = [
  "Coceira","Dor","Ardência","Queimação","Falta de sensibilidade","Muita sensibilidade",
  "Caspa","Descamação","Vermelhidão","Feridas","Crostas","Oleosidade excessiva",
  "Ressecamento","Odor","Inflamação visível","Couro cabeludo dolorido",
];

export const FIOS_SINTOMAS = [
  "Fios quebradiços","Fios porosos","Afinamento dos fios","Perda de volume",
  "Pontas duplas","Frizz excessivo","Elasticidade alterada","Fios mais frágeis que antes",
  "Muitos fios nascendo (baby hairs)",
];

export const DOENCAS_OPTIONS = [
  "Diabetes","Hipertensão","Doenças cardiovasculares","Epilepsia","Doenças autoimunes",
  "Alterações tireoidianas","Anemia","Ovário policístico","Dermatite","Psoríase","Alergias",
];

/**
 * Campos do método "Tricologia Organizada" + extensões do TrichoCare.
 * Todo o objeto vive em `anamneses.data` (jsonb) — sem migração necessária.
 */
export type AnamnesisData = {
  // Etapa 1 — Queixa
  queixa_principal?: string[];
  queixa_descricao?: string;

  // Etapa 2 — Queda
  percebeu_queda?: boolean;
  queda_tempo?: string;
  queda_intermitente?: boolean;
  perda_outras_partes?: boolean;
  perda_outras_partes_onde?: string;
  eventos_marcantes_3m?: boolean;
  eventos_descricao?: string;
  queda_no_banho?: boolean;
  queda_ao_pentear?: boolean;
  queda_com_bulbo?: boolean;
  queda_por_quebra?: boolean;
  queda_padrao?: string;

  // Etapa 3 — Couro cabeludo
  couro_sintomas?: string[];
  couro_observacoes?: string;

  // Etapa 4 — Fios e haste
  fios_sintomas?: string[];

  // Etapa 5 — Hábitos capilares
  tipo_cabelo?: string; // seco / oleoso / normal / misto
  freq_lavagem?: string;
  usa_secador?: boolean;
  usa_chapinha?: boolean;
  freq_calor?: string;
  usa_quimica?: boolean;
  qual_quimica?: string;
  penteados_tracao?: boolean;
  penteados_tracao_desc?: string;
  fez_transplante?: boolean;
  transplante_desc?: string;
  produtos_usados?: string;

  // Etapa 6 — Histórico geral
  doencas?: string[];
  marcapasso?: boolean;
  medicamentos_atuais?: string;
  medicamento_continuo?: boolean;
  medicamento_continuo_desc?: string;
  suplementos?: string;
  alergias?: string;
  historico_familiar?: boolean;

  // Etapa 7 — Alimentação, hormonal, emocional, sono
  alimentacao?: string;
  intestino_regular?: boolean;
  desregulacao_hormonal?: boolean;
  anticoncepcional_diu?: boolean;
  anticoncepcional_desc?: string;
  gestante_lactante?: boolean;
  fuma?: boolean;
  alcool?: boolean;
  atividade_fisica?: string;
  qualidade_sono?: string;
  horas_sono?: number;
  tratamento_psicologico?: boolean;
  ansiosa_estressada?: boolean;
  depressiva?: boolean;
  estresse_nivel?: number;

  // Etapa 8 — Tratamentos anteriores
  tratamentos_anteriores?: string;
  diagnostico_anterior?: string;
  efeitos_adversos?: string;
  observacoes_finais?: string;

  // Anexos (PDFs, fotos antigas, exames, receitas) — armazenados no bucket "anamnesis-attachments"
  attachments?: Array<{
    path: string;
    name: string;
    mime: string;
    size: number;
    uploaded_at: string;
  }>;
};

/** Heurística para indicar etapas preenchidas (usada no sidebar do wizard). */
export function isStepFilled(step: number, d: AnamnesisData): boolean {
  switch (step) {
    case 1: return !!(d.queixa_principal?.length || d.queixa_descricao);
    case 2: return d.percebeu_queda !== undefined || !!d.queda_tempo || !!d.eventos_descricao;
    case 3: return !!(d.couro_sintomas?.length || d.couro_observacoes);
    case 4: return !!d.fios_sintomas?.length;
    case 5: return !!(d.tipo_cabelo || d.freq_lavagem || d.produtos_usados);
    case 6: return !!(d.doencas?.length || d.medicamentos_atuais || d.alergias);
    case 7: return !!(d.alimentacao || d.horas_sono || d.estresse_nivel);
    case 8: return !!(d.tratamentos_anteriores || d.diagnostico_anterior || d.observacoes_finais);
    default: return false;
  }
}
