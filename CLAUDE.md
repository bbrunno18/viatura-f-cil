# CLAUDE.md — Easy Patrol (Frota COLOG)

Contexto de engenharia, arquitetura, comandos e regras de negócio para assistência no projeto **Easy Patrol**.

---

## 1. Visão Geral e Negócio
* **Nome do Sistema:** Easy Patrol (Frota COLOG)
* **Organização:** Ministério da Justiça e Segurança Pública (MJSP)
* **Objetivo:** Gestão operacional mobile-first de viaturas oficiais: controle de saídas e retornos, checklists de vistoria, assinaturas digitais com geração de Termo de Responsabilidade em PDF, controle de abastecimentos, manutenções, multas, incidentes/avarias e geolocalização.
* **Administrador Master:** `brunno.almeida@mj.gov.br` (acesso irrestrito e aprovação de usuários).

---

## 2. Stack Tecnológica e Comandos

### Stack Principal
* **Runtime / Framework:** TanStack Start v1 (React 19 + SSR/Edge para Cloudflare Workers) + Vite 7
* **Roteamento:** TanStack Router (`src/routes/*` com file-based routing; arquivo `src/routeTree.gen.ts` é autogerado)
* **Estilização:** Tailwind CSS v4 (`src/styles.css` com `@theme` nativo) + Radix UI + Lucide React
* **Estado e Cache:** TanStack React Query v5
* **Formulários:** React Hook Form + Zod
* **Exportações:** jsPDF + jspdf-autotable (PDF) e xlsx (Excel)
* **Mapas:** Leaflet / React-Leaflet
* **Backend:** PostgreSQL (Supabase / Lovable Cloud com RLS e Auth)

### Comandos de Desenvolvimento
```bash
# Instalação de dependências
npm install # ou bun install

# Servidor de desenvolvimento
npm run dev

# Build de produção
npm run build

# Validação e Linting
npm run lint

# Formatação de código
npm run format
```

### Variáveis de Ambiente
```env
VITE_SUPABASE_URL="https://ecdwhafgltsfikfumyto.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<chave_publica_anon>"
SUPABASE_URL="https://ecdwhafgltsfikfumyto.supabase.co"
SUPABASE_PUBLISHABLE_KEY="<chave_publica_anon>"
SUPABASE_PROJECT_ID="ecdwhafgltsfikfumyto"
```

---

## 3. Estrutura de Pastas

```text
├── src/
│   ├── assets/                      # Logos (logo Easy Patrol, brasões)
│   ├── components/                  # Componentes de interface
│   │   ├── AppShell.tsx             # Header, navegação inferior e badge de perfil
│   │   ├── ChecklistForm.tsx        # Formulário de inspeção veicular
│   │   ├── GpsCapture.tsx           # Captura de geolocalização (Lat/Long)
│   │   ├── PhotoUpload.tsx          # Upload único de foto
│   │   ├── PhotosUpload.tsx         # Upload múltiplo de fotos (avarias)
│   │   └── SignaturePad.tsx         # Canvas para assinatura manual
│   ├── hooks/
│   │   ├── use-mobile.tsx           # Responsividade móvel
│   │   └── useViaturas.ts           # CRUD e listagem de viaturas
│   ├── lib/
│   │   ├── audit.ts                 # Trilha de auditoria (audit_log)
│   │   ├── auth.tsx                 # Provedor de autenticação e papéis
│   │   ├── exporters.ts             # Exportação de dados para Excel
│   │   ├── format.ts                # Máscaras (CPF, Placas, Moeda, Datas)
│   │   ├── preferences.tsx          # Preferências de acessibilidade e tema
│   │   ├── termo.ts                 # Geração do Termo de Responsabilidade em PDF
│   │   └── validators/viatura.ts    # Schemas Zod de validação
│   ├── integrations/supabase/       # Clientes do banco (arquivos auto-gerados)
│   └── routes/                      # Rotas da aplicação (TanStack Router)
│       ├── __root.tsx               # Layout raiz com Toaster e provedores
│       ├── index.tsx                # Redirecionamento da raiz
│       ├── auth.tsx                 # Tela de Login e Cadastro
│       ├── reset-password.tsx       # Recuperação e redefinição de senha
│       ├── app.tsx                  # Layout protegido autenticado
│       ├── app.index.tsx            # Dashboard inicial mobile-first
│       ├── app.disponiveis.tsx      # Lista de viaturas disponíveis e em uso
│       ├── app.saida.tsx            # Formulário de Saída de Viatura
│       ├── app.retorno.$viaturaId.tsx # Formulário de Retorno e Devolução
│       ├── app.abastecimentos.*     # Gestão e registro de abastecimentos
│       ├── app.viaturas.tsx         # Cadastro e edição de veículos da frota
│       ├── app.condutores.tsx       # Cadastro de motoristas autorizados
│       ├── app.incidentes.tsx       # Registro de avarias com upload de fotos
│       ├── app.manutencao.tsx       # Controle de revisões e manutenções
│       ├── app.multas.tsx           # Gestão de infrações de trânsito
│       ├── app.documentos.tsx       # Controle de CRLV e seguros
│       ├── app.reservas.tsx         # Agendamento prévio de uso
│       ├── app.mapa.tsx             # Visualização da frota em mapa interativo
│       ├── app.relatorios.tsx       # Relatórios gerenciais e exportação
│       ├── app.auditoria.tsx        # Trilha de auditoria das ações do sistema
│       └── app.admin.tsx            # Gestão de usuários e permissões (Master)
```

---

## 5. Modelagem de Dados e Permissões

### Papéis de Acesso (`user_roles`)
* `master`: Administrador Máximo (`brunno.almeida@mj.gov.br`). Pode promover/rebaixar admins e condutores, aprovar novos cadastros, editar quilometragens e visualizar toda a auditoria.
* `admin`: Administrador setorial. Aprova checklists, adiciona condutores e gerencia veículos da sua secretaria.
* `user` / condutor: Utilizador operacional. Registra saídas, retornos, abastecimentos e assina termos digitais.
* Aprovação: Todo novo cadastro inicia com `aprovado = false` na tabela `profiles` até aprovação no painel Admin.

### Tabelas Principais do PostgreSQL
1. `profiles` (`id`, `email`, `nome`, `secretaria`, `aprovado`)
2. `user_roles` (`user_id`, `role: 'master' | 'admin' | 'user'`)
3. `viaturas` (`id`, `modelo`, `cor`, `placa`, `km_atual`, `ativa`)
4. `condutores` (`id`, `nome`, `cpf`, `cnh`, `validade_cnh`, `telefone`, `ativo`)
5. `utilizacoes` (`id`, `viatura_id`, `condutor_id`, `data_saida`, `km_saida`, `local_saida`, `data_retorno`, `km_retorno`, `local_retorno`, `checklist_saida`, `checklist_retorno`, `foto_hodometro_saida`, `foto_hodometro_retorno`, `assinatura_saida_url`, `assinatura_retorno_url`, `termo_pdf_url`, `status`)
6. `abastecimentos` (`id`, `viatura_id`, `condutor_id`, `litros`, `valor_total`, `tipo_combustivel`, `km_atual`, `posto`)
7. `incidentes` (`id`, `viatura_id`, `condutor_id`, `descricao`, `fotos`, `gravidade`)
8. `manutencoes` (`id`, `viatura_id`, `tipo`, `km_realizada`, `data_prevista`, `status`, `valor`)
9. `multas` (`id`, `viatura_id`, `condutor_id`, `data_infracao`, `valor`, `pontos`, `status`)
10. `reservas` (`id`, `viatura_id`, `user_id`, `data_inicio`, `data_fim`, `motivo`, `status`)
11. `documentos_viatura` (`id`, `viatura_id`, `tipo`, `data_vencimento`, `arquivo_url`)
12. `audit_log` (`id`, `user_id`, `acao`, `entidade`, `entidade_id`, `detalhes`)

### Buckets de Storage
* `termo-responsabilidade` (privado — PDFs gerados)
* `incidentes` (privado — fotos de avarias)
* `assinaturas` (privado — png das assinaturas)
* `hodometro` (privado — fotos do painel/quilometragem)

---

## 6. Regras Críticas de Desenvolvimento
* **Nunca editar manualmente `src/routeTree.gen.ts`:** este arquivo é gerado automaticamente pelo compilador de rotas do TanStack Router.
* **Componentes client-only:** bibliotecas como `Leaflet` utilizam APIs de navegador (`window`, `navigator`) e devem ser carregadas dinamicamente ou protegidas contra SSR.
* **Tokens de Tema:** usar classes utilitárias semânticas do Tailwind v4 (`bg-background`, `text-foreground`, `border-border`, etc.) para preservar o tema escuro/claro e acessibilidade.
* **Não expor credenciais:** tratar tokens de serviço como estritamente secretos e utilizar a chave pública `anon` no cliente.

---

## 7. Ajustes Pendentes Prioritários
1. **Hodômetro Opcional:**
   * Em `src/routes/app.saida.tsx` e `src/routes/app.retorno.$viaturaId.tsx`, remover a validação de obrigatoriedade de envio da foto do hodômetro e atualizar os rótulos para "Foto do hodômetro (opcional)".
2. **Ambiente Limpo para Produção:**
   * Limpar registros das tabelas operacionais (`utilizacoes`, `abastecimentos`, `incidentes`, `multas`, `reservas`, `audit_log`), mantendo as 4 viaturas e o usuário Master cadastrados para início da operação real.
3. **Gestão de Viaturas:**
   * Alinhar a interface de cadastro de viaturas (`src/routes/app.viaturas.tsx`) com as colunas reais da tabela `viaturas`.
