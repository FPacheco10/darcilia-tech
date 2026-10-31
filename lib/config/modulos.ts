export type Perfil =
  | "administrador"
  | "ti"
  | "secretaria"
  | "financeiro"
  | "consulta";

export type Modulo = {
  id: string;
  nome: string;
  caminho: string;
  icone: string;
  perfis: Perfil[];
};

export const modulos: Modulo[] = [
  {
    id: "dashboard",
    nome: "Dashboard",
    caminho: "/dashboard",
    icone: "▦",
    perfis: [
      "administrador",
      "ti",
      "secretaria",
      "financeiro",
      "consulta",
    ],
  },
  {
    id: "ti",
    nome: "Gestão de TI",
    caminho: "/ti",
    icone: "💻",
    perfis: ["administrador", "ti"],
  },
  {
    id: "equipamentos",
    nome: "Equipamentos",
    caminho: "/ti/equipamentos",
    icone: "🖥️",
    perfis: ["administrador", "ti"],
  },
  {
    id: "secretaria",
    nome: "Secretaria",
    caminho: "/secretaria",
    icone: "🎓",
    perfis: ["administrador", "secretaria"],
  },
  {
    id: "financeiro",
    nome: "Financeiro",
    caminho: "/financeiro",
    icone: "💰",
    perfis: ["administrador", "financeiro"],
  },
  {
    id: "biblioteca",
    nome: "Biblioteca",
    caminho: "/biblioteca",
    icone: "📚",
    perfis: ["administrador", "secretaria"],
  },
  {
    id: "chromebooks",
    nome: "Chromebooks",
    caminho: "/chromebooks",
    icone: "💻",
    perfis: ["administrador", "ti", "secretaria"],
  },
  {
    id: "funcionarios",
    nome: "Funcionários",
    caminho: "/funcionarios",
    icone: "👥",
    perfis: ["administrador"],
  },
  {
    id: "perfil",
    nome: "Meu perfil",
    caminho: "/perfil",
    icone: "👤",
    perfis: [
      "administrador",
      "ti",
      "secretaria",
      "financeiro",
      "consulta",
    ],
  },
];