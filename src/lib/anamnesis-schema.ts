export const ANAMNESIS_STEPS = [
  { id: 1, key: "queixa", title: "Queixa e queda", description: "Motivo, padrão, escala e teste de tração" },
  { id: 2, key: "couro", title: "Couro cabeludo", description: "Sintomas, oleosidade e descamação" },
  { id: 3, key: "fios", title: "Fios e haste", description: "Curvatura, espessura e qualidade" },
  { id: 4, key: "rotina", title: "Rotina e agressões", description: "Lavagem, calor, química e tração" },
  { id: 5, key: "saude", title: "Histórico de saúde", description: "Doenças, medicamentos, família" },
  { id: 6, key: "estilo", title: "Estilo de vida e hormonal", description: "Sono, emocional, hormonal" },
  { id: 7, key: "exames", title: "Exames laboratoriais", description: "Ferritina, vitaminas, tireoide, hormônios" },
  { id: 8, key: "fechamento", title: "Tratamentos e fechamento", description: "Histórico, anexos e resumo" },
] as const;

/**
 * Etapa 1 — queixa em nível de DOMÍNIO (não sintoma solto). Evita a repetição
 * antiga em que o mesmo sintoma era marcado na queixa e de novo no couro/fios.
 * Os sintomas específicos vivem uma única vez no seu domínio (couro/fios).
 */
export const QUEIXA_DOMINIOS = [
  "Queda / afinamento",
  "Falhas / áreas sem cabelo",
  "Couro cabeludo (coceira, caspa, oleosidade)",
  "Qualidade dos fios (quebra, ressecamento)",
  "Pós-química / dano",
  "Volume / estético",
  "Prevenção / manutenção",
  "Outro",
];

export const QUEDA_EVOLUCAO = [
  "Progressiva (piora gradual)",
  "Estável",
  "Intermitente (para e volta)",
  "Aguda (início súbito)",
];

export const QUEDA_DISTRIBUICAO = [
  "Difusa (todo o couro)",
  "Coroa / vértex",
  "Linha frontal / entradas",
  "Fronto-temporal",
  "Risca alargada (parte central)",
  "Temporal (laterais)",
  "Placas / áreas localizadas",
  "Nuca",
];

/** Escala de Ludwig/Sinclair — padrão feminino. */
export const ESCALA_LUDWIG = [
  "I — rarefação leve na risca central",
  "II — rarefação moderada e alargamento da risca",
  "III — rarefação acentuada / difusa no topo",
];

/** Escala de Norwood-Hamilton — padrão masculino. */
export const ESCALA_NORWOOD = [
  "I — sem recessão significativa",
  "II — recessão fronto-temporal leve",
  "III — entradas evidentes",
  "III vertex — perda também na coroa",
  "IV — coroa e entradas mais amplas",
  "V — áreas se aproximando",
  "VI — ponte entre entradas e coroa some",
  "VII — perda extensa, resta faixa lateral/posterior",
];

export const PULL_TEST = [
  "Não realizado",
  "Negativo (≤ ~3 fios)",
  "Positivo (> ~6 fios)",
  "Duvidoso",
];

export const COURO_SINTOMAS = [
  "Coceira","Dor","Ardência","Queimação","Sensibilidade alterada",
  "Vermelhidão","Feridas","Crostas","Pústulas/espinhas","Inflamação visível","Odor",
];

export const DESCAMACAO_TIPO = ["Nenhuma", "Seca (fina, branca)", "Oleosa (amarelada, aderente)", "Mista"];

/** Só características de FIBRA — sem overlap com queda/afinamento (que ficam na etapa 1). */
export const FIOS_SINTOMAS = [
  "Fios quebradiços","Fios porosos","Pontas duplas","Frizz excessivo",
  "Elasticidade alterada","Ressecamento","Opacidade / sem brilho","Fios mais frágeis que antes",
];

export const CURVATURA = ["Liso", "Ondulado", "Cacheado", "Crespo"];
export const ESPESSURA = ["Fino", "Médio", "Grosso"];
export const DENSIDADE = ["Baixa", "Média", "Alta"];

export const DOENCAS_OPTIONS = [
  "Diabetes","Hipertensão","Doenças cardiovasculares","Epilepsia","Doenças autoimunes",
  "Alterações tireoidianas","Anemia","Ovário policístico","Dermatite","Psoríase","Alergias",
];

export const FAMILIAR_LADO = ["Materno", "Paterno", "Ambos", "Nenhum"];

/** Exames laboratoriais comuns na investigação de queda capilar. */
export const LAB_PRESETS = [
  "Ferritina","Ferro sérico","Saturação de transferrina","Vitamina D (25-OH)","Vitamina B12",
  "Zinco","TSH","T4 livre","Testosterona total","Testosterona livre","DHEA-S","Prolactina",
  "Hemoglobina","Ácido fólico","Glicemia de jejum",
];

export type Lab = { nome: string; valor: string; unidade?: string; data?: string };

/**
 * Campos do método "Tricologia Organizada" + extensões clínicas do TrichoCare.
 * Todo o objeto vive em `anamneses.data` (jsonb) — sem migração necessária.
 * Campos antigos são mantidos para compatibilidade com fichas já preenchidas.
 */
export type AnamnesisData = {
  // Etapa 1 — Queixa & queda
  queixa_principal?: string[]; // agora em nível de domínio (QUEIXA_DOMINIOS)
  queixa_descricao?: string;
  percebeu_queda?: boolean;
  queda_tempo?: string;
  queda_evolucao?: string;
  queda_distribuicao?: string[];
  escala_padrao?: string;      // valor de Ludwig (fem) ou Norwood (masc)
  pull_test?: string;
  pull_test_fios?: number;
  queda_intermitente?: boolean;
  perda_outras_partes?: boolean;
  perda_outras_partes_onde?: string;
  eventos_marcantes_3m?: boolean;
  eventos_descricao?: string;
  queda_no_banho?: boolean;
  queda_ao_pentear?: boolean;
  queda_com_bulbo?: boolean;
  queda_por_quebra?: boolean;
  queda_padrao?: string;       // legado (texto livre)

  // Etapa 2 — Couro cabeludo
  couro_sintomas?: string[];
  couro_oleosidade?: number;   // 0-10
  descamacao_tipo?: string;
  couro_observacoes?: string;

  // Etapa 3 — Fios e haste
  fios_sintomas?: string[];
  curvatura?: string;
  espessura?: string;
  densidade_percebida?: string;

  // Etapa 4 — Rotina e agressões
  tipo_cabelo?: string;
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

  // Etapa 5 — Histórico de saúde
  doencas?: string[];
  marcapasso?: boolean;
  medicamentos_atuais?: string;
  medicamento_continuo?: boolean;
  medicamento_continuo_desc?: string;
  suplementos?: string;
  alergias?: string;
  historico_familiar?: boolean;
  historico_familiar_lado?: string;
  historico_familiar_idade?: string;

  // Etapa 6 — Estilo de vida, hormonal, emocional, sono
  alimentacao?: string;
  intestino_regular?: boolean;
  desregulacao_hormonal?: boolean;
  anticoncepcional_diu?: boolean;
  anticoncepcional_desc?: string;
  gestante_lactante?: boolean;
  menopausa?: boolean;
  fuma?: boolean;
  alcool?: boolean;
  atividade_fisica?: string;
  qualidade_sono?: string;
  horas_sono?: number;
  tratamento_psicologico?: boolean;
  ansiosa_estressada?: boolean;
  depressiva?: boolean;
  estresse_nivel?: number;

  // Etapa 7 — Exames laboratoriais
  labs?: Lab[];
  exames_observacoes?: string;

  // Etapa 8 — Tratamentos anteriores & fechamento
  tratamentos_anteriores?: string;
  diagnostico_anterior?: string;
  efeitos_adversos?: string;
  observacoes_finais?: string;

  // Anexos (PDFs, fotos antigas, exames, receitas) — bucket "anamnesis-attachments"
  attachments?: Array<{
    path: string;
    name: string;
    mime: string;
    size: number;
    uploaded_at: string;
  }>;
};

/** Escolhe a escala de padrão conforme o sexo do paciente. */
export function scaleForSex(sex?: string | null): { label: string; options: string[] } {
  const s = (sex ?? "").trim().toLowerCase();
  if (s.startsWith("f") || s.includes("fem") || s.includes("mulher")) {
    return { label: "Escala de Ludwig/Sinclair (padrão feminino)", options: ESCALA_LUDWIG };
  }
  if (s.startsWith("m") || s.includes("masc") || s.includes("homem")) {
    return { label: "Escala de Norwood-Hamilton (padrão masculino)", options: ESCALA_NORWOOD };
  }
  return { label: "Escala de padrão (Ludwig / Norwood)", options: [...ESCALA_LUDWIG, ...ESCALA_NORWOOD] };
}

/** Heurística para indicar etapas preenchidas (usada no sidebar do wizard). */
export function isStepFilled(step: number, d: AnamnesisData): boolean {
  switch (step) {
    case 1: return !!(d.queixa_principal?.length || d.queixa_descricao || d.queda_tempo || d.escala_padrao || d.pull_test);
    case 2: return !!(d.couro_sintomas?.length || d.couro_observacoes || d.descamacao_tipo || d.couro_oleosidade != null);
    case 3: return !!(d.fios_sintomas?.length || d.curvatura || d.espessura || d.densidade_percebida);
    case 4: return !!(d.tipo_cabelo || d.freq_lavagem || d.produtos_usados || d.usa_quimica);
    case 5: return !!(d.doencas?.length || d.medicamentos_atuais || d.alergias || d.historico_familiar);
    case 6: return !!(d.alimentacao || d.horas_sono || d.estresse_nivel || d.desregulacao_hormonal);
    case 7: return !!(d.labs?.length || d.exames_observacoes);
    case 8: return !!(d.tratamentos_anteriores || d.diagnostico_anterior || d.observacoes_finais || d.attachments?.length);
    default: return false;
  }
}
