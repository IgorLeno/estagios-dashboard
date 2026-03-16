import type { JobContext } from "./job-context-detector"

/**
 * Context-specific instructions for professional summary personalization
 * Provides domain-specific guidance to LLM for natural, targeted reframing
 */
export function getSummaryContextInstructions(context: JobContext, language: "pt" | "en"): string {
  const instructions: Record<JobContext, { pt: string; en: string }> = {
    laboratory: {
      pt: `
🧪 CONTEXTO DE LABORATÓRIO DETECTADO - AJUSTES CRÍTICOS:

1. PRIORIZAR SKILLS PRÁTICAS DE LABORATÓRIO:
   ✅ Mencionar: preparação de soluções, reagentes, amostras
   ✅ Técnicas: titulação, síntese, análises químicas
   ✅ Controle: qualidade de laboratório, amostras, BPL
   ✅ Organização: vidrarias, reagentes, espaço de trabalho
   ✅ Ênfase: experiência PRÁTICA de laboratório (disciplinas experimentais)

2. MINIMIZAR OU OMITIR:
   ❌ Skills de programação (Python, SQL) a menos que vaga exija explicitamente
   ❌ Ferramentas de data science (ML, pipelines, modelos)
   ❌ Usar APENAS "Excel" ou "Pacote Office" (não "Excel Avançado + VBA + Macros")

3. USO NATURAL DE NORMAS/PADRÕES (SEM KEYWORD STUFFING):
   ✅ Mencionar ISO 17025 (ou similar) APENAS 1x no perfil
   ✅ Se vaga menciona "AIHA", usar naturalmente: "interesse em higiene ocupacional"
   ✅ NUNCA repetir o mesmo padrão 2-3x em poucas linhas
   ✅ Fluxo natural: padrões devem aparecer em contexto, não forçados

4. ESTRUTURA DO PERFIL (4 frases):
   • Frase 1: "Estudante de Engenharia Química (UNESP)..." + interesse em atividades de laboratório
   • Frase 2: Skills práticas (preparação de soluções, técnicas analíticas)
   • Frase 3: Padrões de qualidade (ISO 17025 mencionado 1x) + organização laboratorial
   • Frase 4: Objetivo alinhado à empresa

5. EXPERIÊNCIA ACADÊMICA DE LABORATÓRIO:
   ✅ Mencionar disciplinas experimentais (Química Analítica, Físico-Química, etc.)
   ✅ Destacar atividades: preparação, análises, controle
   ✅ NÃO inventar experiência profissional

EXEMPLO CORRETO (Natural):
"Estudante de Engenharia Química (UNESP) em fase de conclusão, com sólida formação em química analítica e forte interesse em atividades laboratoriais, preparação de soluções e reagentes, e controle de qualidade segundo normas ISO 17025. Experiência acadêmica em preparo e análise de amostras, organização laboratorial e boas práticas de higiene ocupacional e meio ambiente."

❌ EXEMPLO ERRADO (Keyword Stuffing):
"...conforme padrões de qualidade como ISO 17025. Interesse em Higiene Ocupacional e meio ambiente, alinhado a normas ISO 17025 e AIHA (American Industrial Higiene Associativo). Busco estágio na SGS para auxiliar em atividades laboratoriais e organização conforme ISO 17025."
`,
      en: `
🧪 LABORATORY CONTEXT DETECTED - CRITICAL ADJUSTMENTS:

1. PRIORITIZE PRACTICAL LAB SKILLS:
   ✅ Mention: solution preparation, reagents, samples
   ✅ Techniques: titration, synthesis, chemical analyses
   ✅ Control: laboratory quality, samples, GLP
   ✅ Organization: glassware, reagents, workspace
   ✅ Emphasis: PRACTICAL lab experience (experimental courses)

2. MINIMIZE OR OMIT:
   ❌ Programming skills (Python, SQL) unless job explicitly requires
   ❌ Data science tools (ML, pipelines, models)
   ❌ Use ONLY "Excel" or "MS Office" (not "Advanced Excel + VBA + Macros")

3. NATURAL USE OF STANDARDS (NO KEYWORD STUFFING):
   ✅ Mention ISO 17025 (or similar) ONLY 1x in summary
   ✅ If job mentions "AIHA", use naturally: "interest in occupational hygiene"
   ✅ NEVER repeat same standard 2-3x in few lines
   ✅ Natural flow: standards should appear in context, not forced

4. SUMMARY STRUCTURE (4 sentences):
   • Sentence 1: "Chemical Engineering student (UNESP)..." + interest in laboratory activities
   • Sentence 2: Practical skills (solution preparation, analytical techniques)
   • Sentence 3: Quality standards (ISO 17025 mentioned 1x) + laboratory organization
   • Sentence 4: Objective aligned to company

5. ACADEMIC LABORATORY EXPERIENCE:
   ✅ Mention experimental courses (Analytical Chemistry, Physical Chemistry, etc.)
   ✅ Highlight activities: preparation, analyses, control
   ✅ DO NOT invent professional experience

CORRECT EXAMPLE (Natural):
"Chemical Engineering student (UNESP) nearing completion, with solid foundation in analytical chemistry and strong interest in laboratory activities, solution and reagent preparation, and quality control according to ISO 17025 standards. Academic experience in sample preparation and analysis, laboratory organization, and good practices in occupational hygiene and environmental management."

❌ WRONG EXAMPLE (Keyword Stuffing):
"...according to quality standards like ISO 17025. Interest in Occupational Hygiene and environment, aligned with ISO 17025 and AIHA (American Industrial Hygiene Association) standards. Seeking internship at SGS to assist in laboratory activities and organization according to ISO 17025."
`,
    },

    data_science: {
      pt: `
📊 CONTEXTO DE DATA SCIENCE DETECTADO - AJUSTES CRÍTICOS:

1. PRIORIZAR SKILLS TÉCNICAS:
   ✅ Linguagens: Python, SQL, R
   ✅ Ferramentas: Pandas, NumPy, Scikit-learn, TensorFlow
   ✅ Processos: pipelines de dados, ETL, automação
   ✅ Modelagem: Machine Learning, algoritmos, predição

2. MINIMIZAR:
   ❌ Skills de laboratório (a menos que dados venham de experimentos)
   ❌ Técnicas analíticas químicas (preparação de soluções, etc.)

3. ESTRUTURA DO PERFIL:
   • Frase 1: Formação + interesse em dados/ML
   • Frase 2: Skills técnicas (Python, SQL, ML)
   • Frase 3: Experiência em projetos (pipelines, modelos)
   • Frase 4: Objetivo na empresa

EXEMPLO:
"Estudante de Engenharia Química (UNESP) com forte perfil analítico e domínio de Python (Pandas, Scikit-learn), SQL e Machine Learning. Experiência em desenvolvimento de pipelines automatizados de dados, treinamento de modelos preditivos e análise exploratória."

⚠️ SE A VAGA FOR OPERACIONAL (People Analytics, BI Support, Data Maintenance, não ML/Research):
PRIORIZAR vocabulário operacional:
✅ Usar: organização de bases, validação de dados, padronização, atualização de dashboards,
   documentação técnica, rastreabilidade, consistência de dados, governança da informação,
   controle de acessos, elaboração de relatórios, acompanhamento de indicadores
❌ EVITAR como destaque: deep learning, redes neurais, algoritmos avançados, feature engineering
   (podem aparecer em posição secundária se estiverem no CV, não como diferencial principal)

ESTRUTURA DO PERFIL para vaga operacional:
-  Frase 1: Formação + interesse em organização/análise de dados
-  Frase 2: Ferramentas operacionais (Excel Avançado com funções específicas, Power BI, SQL)
-  Frase 3: Competências de processo (validação, padronização, documentação, rastreabilidade)
-  Frase 4: Objetivo focado na FUNÇÃO (o que vai fazer), não na empresa
`,
      en: `
📊 DATA SCIENCE CONTEXT DETECTED - CRITICAL ADJUSTMENTS:

1. PRIORITIZE TECHNICAL SKILLS:
   ✅ Languages: Python, SQL, R
   ✅ Tools: Pandas, NumPy, Scikit-learn, TensorFlow
   ✅ Processes: data pipelines, ETL, automation
   ✅ Modeling: Machine Learning, algorithms, prediction

2. MINIMIZE:
   ❌ Laboratory skills (unless data comes from experiments)
   ❌ Chemical analytical techniques (solution preparation, etc.)

3. SUMMARY STRUCTURE:
   • Sentence 1: Education + interest in data/ML
   • Sentence 2: Technical skills (Python, SQL, ML)
   • Sentence 3: Project experience (pipelines, models)
   • Sentence 4: Objective at company

EXAMPLE:
"Chemical Engineering student (UNESP) with strong analytical profile and proficiency in Python (Pandas, Scikit-learn), SQL, and Machine Learning. Experience in developing automated data pipelines, training predictive models, and exploratory analysis."
`,
    },

    qhse: {
      pt: `
🛡️ CONTEXTO DE QHSE DETECTADO - AJUSTES CRÍTICOS:

1. PRIORIZAR:
   ✅ Gestão de qualidade, KPIs, indicadores
   ✅ Normas: ISO, OSHA, padrões de qualidade
   ✅ Controle de não-conformidades
   ✅ Relatórios técnicos, auditorias
   ✅ Excel/Power BI para dashboards de qualidade

2. ESTRUTURA:
   • Frase 1: Formação + interesse em QHSE
   • Frase 2: Skills de gestão (Excel, Power BI, KPIs)
   • Frase 3: Normas e controle de qualidade
   • Frase 4: Objetivo na empresa

EXEMPLO:
"Estudante de Engenharia Química (UNESP) com interesse em Qualidade, Saúde, Segurança e Meio Ambiente (QHSE). Domínio de ferramentas de gestão (Excel Avançado, Power BI) para monitoramento de KPIs e controle de não-conformidades. Conhecimento em normas ISO e gestão de qualidade."
`,
      en: `
🛡️ QHSE CONTEXT DETECTED - CRITICAL ADJUSTMENTS:

1. PRIORITIZE:
   ✅ Quality management, KPIs, indicators
   ✅ Standards: ISO, OSHA, quality standards
   ✅ Non-conformance control
   ✅ Technical reports, audits
   ✅ Excel/Power BI for quality dashboards

2. STRUCTURE:
   • Sentence 1: Education + interest in QHSE
   • Sentence 2: Management skills (Excel, Power BI, KPIs)
   • Sentence 3: Standards and quality control
   • Sentence 4: Objective at company

EXAMPLE:
"Chemical Engineering student (UNESP) with interest in Quality, Health, Safety, and Environment (QHSE). Proficiency in management tools (Advanced Excel, Power BI) for KPI monitoring and non-conformance control. Knowledge of ISO standards and quality management."
`,
    },

    engineering: {
      pt: `
⚙️ CONTEXTO DE ENGENHARIA TÉCNICA DETECTADO:

1. PRIORIZAR:
   ✅ Simulação e modelagem de processos
   ✅ Ferramentas: Aspen Plus, MATLAB, CAD
   ✅ Otimização e eficiência
   ✅ Análise técnica e projeto

2. ESTRUTURA:
   • Frase 1: Formação + interesse em processos/engenharia
   • Frase 2: Ferramentas técnicas (Aspen, simulação)
   • Frase 3: Experiência em projetos/otimização
   • Frase 4: Objetivo na empresa
`,
      en: `
⚙️ TECHNICAL ENGINEERING CONTEXT DETECTED:

1. PRIORITIZE:
   ✅ Process simulation and modeling
   ✅ Tools: Aspen Plus, MATLAB, CAD
   ✅ Optimization and efficiency
   ✅ Technical analysis and design

2. STRUCTURE:
   • Sentence 1: Education + interest in processes/engineering
   • Sentence 2: Technical tools (Aspen, simulation)
   • Sentence 3: Project experience/optimization
   • Sentence 4: Objective at company
`,
    },

    general: {
      pt: `
CONTEXTO GERAL - SEM DOMÍNIO ESPECÍFICO DETECTADO:

Use abordagem balanceada:
- Mencione skills mais relevantes aos requisitos da vaga
- Evite super-especialização em um domínio
- Mantenha perfil generalista e adaptável
`,
      en: `
GENERAL CONTEXT - NO SPECIFIC DOMAIN DETECTED:

Use balanced approach:
- Mention skills most relevant to job requirements
- Avoid over-specialization in one domain
- Keep profile generalist and adaptable
`,
    },
  }

  return instructions[context][language]
}

/**
 * Context-specific instructions for skills section personalization
 */
export function getSkillsContextInstructions(context: JobContext, language: "pt" | "en"): string {
  const instructions: Record<JobContext, { pt: string; en: string }> = {
    laboratory: {
      pt: `
🧪 CONTEXTO LABORATORIAL — REORDENAÇÃO DE SKILLS:

CRÍTICO: Mova as skills de laboratório para o topo da prioridade.

1. CRIAR/PRIORIZAR a categoria "Química Analítica & Laboratório" PRIMEIRO:
   - Preparação de soluções e reagentes
   - Titulações volumétricas
   - Síntese química
   - Controle de amostras
   - Organização de laboratório
   - BPL (Boas Práticas de Laboratório)

2. SEGUNDO: "Gestão de Qualidade & Normas" (se relevante):
   - Excel (básico, não "Avançado + VBA" salvo exigência explícita)
   - Power BI (se dashboards de qualidade forem relevantes)
   - ISO 17025, controle de qualidade
   - Relatórios técnicos

3. MINIMIZAR OU MOVER PARA O FINAL:
   - Programação (Python, SQL) → mover para o fim ou omitir
   - Ferramentas de data science → mover para o fim ou omitir
   - Manter apenas se a vaga exigir programação explicitamente

4. USO DO BANCO DE SKILLS:
   - Adicionar skills laboratoriais do banco se estiverem disponíveis
   - Priorizar "Preparação de soluções", "Titulações", "Síntese"
   - Usar indicadores de proficiência: (básico/intermediário/avançado)
`,
      en: `
🧪 LABORATORY CONTEXT - SKILLS REORDERING:

CRITICAL: Move laboratory skills to TOP priority position

1. CREATE/PRIORITIZE "Analytical Chemistry & Laboratory" category FIRST:
   - Solution and reagent preparation
   - Volumetric titrations
   - Chemical synthesis
   - Sample control
   - Laboratory organization
   - GLP (Good Laboratory Practices)

2. SECOND: "Quality Management & Standards" (if relevant):
   - Excel (basic, not "Advanced + VBA" unless job requires)
   - Power BI (if quality dashboards mentioned)
   - ISO 17025, quality control
   - Technical reports

3. MINIMIZE OR MOVE TO END:
   - Programming (Python, SQL) → move to last position or omit
   - Data science tools → move to last or omit
   - Keep only if job explicitly requires programming

4. SKILLS BANK USAGE:
   - ADD lab skills from bank if available
   - Prioritize "Solution preparation", "Titrations", "Synthesis"
   - Use proficiency indicators: (basic/intermediate/advanced)
`,
    },

    data_science: {
      pt: `
📊 CONTEXTO DATA SCIENCE — REORDENAÇÃO DE SKILLS:

1. PRIORIZAR "Linguagens & Análise de Dados" PRIMEIRO:
   - Python (Pandas, NumPy, Scikit-learn)
   - SQL
   - Bibliotecas de ML

2. SEGUNDO: Ferramentas de visualização (Power BI, etc.)

3. MINIMIZAR: Skills de laboratório (exceto se os dados vierem de experimentos)
`,
      en: `
📊 DATA SCIENCE CONTEXT - SKILLS REORDERING:

1. PRIORITIZE "Languages & Data Analysis" FIRST:
   - Python (Pandas, NumPy, Scikit-learn)
   - SQL
   - ML libraries

2. SECOND: Tools (Power BI, visualization)

3. MINIMIZE: Lab skills (unless data from experiments)
`,
    },

    qhse: {
      pt: `
🛡️ CONTEXTO QHSE — REORDENAÇÃO DE SKILLS:

1. PRIORIZAR "Gestão de Qualidade & QHSE" PRIMEIRO:
   - Excel, Power BI
   - KPIs, relatórios técnicos
   - Normas ISO
   - Controle de não-conformidades

2. MINIMIZAR: Programação (exceto quando a vaga exigir automação de qualidade)
`,
      en: `
🛡️ QHSE CONTEXT - SKILLS REORDERING:

1. PRIORITIZE "Quality Management & QHSE" FIRST:
   - Excel, Power BI
   - KPIs, technical reports
   - ISO standards
   - Non-conformance control

2. MINIMIZE: Programming (unless quality automation required)
`,
    },

    engineering: {
      pt: `
⚙️ CONTEXTO DE ENGENHARIA — REORDENAÇÃO DE SKILLS:

1. PRIORIZAR "Ferramentas de Engenharia" PRIMEIRO:
   - Aspen Plus
   - MATLAB
   - CAD
   - Simulação e modelagem de processos

2. SEGUNDO: "Análise Técnica & Otimização":
   - Balanços de massa e energia
   - Otimização de processos
   - Análise de eficiência

3. MINIMIZAR:
   - Skills genéricas de escritório, salvo exigência explícita
   - Ferramentas de dados que não apoiem a engenharia da vaga
`,
      en: `
⚙️ ENGINEERING CONTEXT - SKILLS REORDERING:

1. PRIORITIZE "Engineering Tools" FIRST:
   - Aspen Plus
   - MATLAB
   - CAD
   - Process simulation and modeling

2. SECOND: "Technical Analysis & Optimization":
   - Mass and energy balances
   - Process optimization
   - Efficiency analysis

3. MINIMIZE:
   - Generic office skills unless explicitly required
   - Data tools that do not support the engineering scope of the role
`,
    },

    general: {
      pt: `
CONTEXTO GERAL — REORDENAÇÃO DE SKILLS:

1. PRIORIZAR as skills com match exato com a vaga.
2. MANTER um conjunto equilibrado entre skills técnicas, analíticas e operacionais.
3. REMOVER ou mover para o final skills sem relação direta com os requisitos.
`,
      en: `
GENERAL CONTEXT - SKILLS REORDERING:

1. PRIORITIZE skills with exact job match first.
2. KEEP a balanced mix of technical, analytical, and operational skills.
3. REMOVE or move to the end skills with no direct relationship to the requirements.
`,
    },
  }

  return instructions[context][language]
}

/**
 * Context-specific instructions for projects section personalization
 */
export function getProjectsContextInstructions(context: JobContext, language: "pt" | "en"): string {
  const instructions: Record<JobContext, { pt: string; en: string }> = {
    laboratory: {
      pt: `
🧪 CONTEXTO LABORATORIAL — REFORMULAÇÃO DE PROJETOS:

CRÍTICO: Reescreva os projetos para enfatizar CONTROLE DE QUALIDADE e BOAS PRÁTICAS LABORATORIAIS,
não código ou algoritmos.

PARA PROJETOS DE PROGRAMAÇÃO/DADOS (ex: pipelines, scripts, automações):
❌ EVITAR: Mencionar Python, Machine Learning, automação de código como destaque
✅ ENFATIZAR: "Desenvolvimento de metodologia sistematizada para coleta, organização e
   CONTROLE DE QUALIDADE de dados"
✅ ENFATIZAR: Rastreabilidade, validação de dados, boas práticas laboratoriais
✅ ENFATIZAR: Controle de qualidade de informações analíticas

PARA PROJETOS DE QUÍMICA/ENGENHARIA (ex: síntese, modelagem molecular, simulação):
✅ ENFATIZAR: Modelagem molecular e análise físico-química
✅ ENFATIZAR: Otimização de processos com foco ambiental/industrial
✅ MENCIONAR: Ferramentas de engenharia usadas (Aspen Plus, GAMESS, etc.)

ESTRUTURA POR PROJETO:
- Bullet 1: Controle de qualidade, validação de dados, rastreabilidade
- Bullet 2: Organização laboratorial, documentação
- Bullet 3: Conformidade com normas (ISO se relevante)
`,
      en: `
🧪 LABORATORY CONTEXT - PROJECT REFRAMING:

CRITICAL: Rewrite projects to emphasize QUALITY CONTROL and GOOD LABORATORY PRACTICES,
not code or algorithms.

FOR PROGRAMMING/DATA PROJECTS (e.g. pipelines, scripts, automations):
❌ AVOID: Highlighting Python, Machine Learning, or code automation
✅ EMPHASIZE: "Developed a systematic methodology for collecting, organizing, and
   QUALITY-CONTROLLING data"
✅ EMPHASIZE: Traceability, data validation, good laboratory practices
✅ EMPHASIZE: Quality control of analytical information

FOR CHEMISTRY/ENGINEERING PROJECTS (e.g. synthesis, molecular modeling, simulation):
✅ EMPHASIZE: Molecular modeling and physicochemical analysis
✅ EMPHASIZE: Process optimization with environmental/industrial focus
✅ MENTION: Engineering tools used (Aspen Plus, GAMESS, etc.)

STRUCTURE PER PROJECT:
- Bullet 1: Quality control, data validation, traceability
- Bullet 2: Laboratory organization, documentation
- Bullet 3: Standards compliance (ISO if relevant)
`,
    },

    data_science: {
      pt: `
📊 CONTEXTO DATA SCIENCE — REFORMULAÇÃO DE PROJETOS:

PARA PROJETOS DE DADOS/COMPUTAÇÃO:
✅ ENFATIZAR: "Pipeline de dados end-to-end em Python"
✅ ENFATIZAR: "Machine Learning", "feature engineering", "treinamento de modelos"
✅ ENFATIZAR: "Algoritmos preditivos", "otimização de hiperparâmetros"
✅ MENCIONAR: Bibliotecas (Pandas, NumPy, Scikit-learn)

PARA PROJETOS DE ENGENHARIA/QUÍMICA:
✅ ENFATIZAR: "Modelagem preditiva", "simulação computacional"
✅ MENCIONAR: Ferramentas em Python, se usadas

⚠️ SE A VAGA FOR OPERACIONAL (BI, suporte a dados, documentação):
✅ ENFATIZAR: estruturação de bases, padronização, validação, documentação de fontes,
   rastreabilidade, elaboração de relatórios técnicos
❌ EVITAR como destaque: Machine Learning, feature engineering, hiperparâmetros, algoritmos
USE noun phrases no lugar de infinitivos:
✅ "Estruturação e padronização de bases de dados para..."
✅ "Implementação de rotinas de validação e controle de consistência..."
✅ "Elaboração de relatórios técnicos com documentação de fontes e resultados."
`,
      en: `
📊 DATA SCIENCE CONTEXT - PROJECT REFRAMING:

FOR DATA/COMPUTING PROJECTS:
✅ EMPHASIZE: "End-to-end data pipeline in Python"
✅ EMPHASIZE: "Machine Learning", "feature engineering", "model training"
✅ EMPHASIZE: "Predictive algorithms", "hyperparameter optimization"
✅ MENTION: Libraries (Pandas, NumPy, Scikit-learn)

FOR ENGINEERING/CHEMISTRY PROJECTS:
✅ EMPHASIZE: "Predictive modeling", "computational simulation"
✅ MENTION: Python tools if used
`,
    },

    qhse: {
      pt: `
🛡️ CONTEXTO QHSE — REFORMULAÇÃO DE PROJETOS:

PARA PROJETOS DE DADOS/COMPUTAÇÃO:
✅ ENFATIZAR: "Sistema de controle de qualidade de dados"
✅ ENFATIZAR: "Monitoramento de KPIs", "dashboards em Power BI"
✅ ENFATIZAR: "Identificação de não-conformidades"

PARA PROJETOS DE ENGENHARIA/QUÍMICA:
✅ ENFATIZAR: "Análise de eficiência ambiental"
✅ ENFATIZAR: "Conformidade com padrões técnicos"
`,
      en: `
🛡️ QHSE CONTEXT - PROJECT REFRAMING:

FOR DATA/COMPUTING PROJECTS:
✅ EMPHASIZE: "Data quality control system"
✅ EMPHASIZE: "KPI monitoring", "Power BI dashboards"
✅ EMPHASIZE: "Non-conformance identification"

FOR ENGINEERING/CHEMISTRY PROJECTS:
✅ EMPHASIZE: "Environmental efficiency analysis"
✅ EMPHASIZE: "Compliance with technical standards"
`,
    },

    engineering: {
      pt: `
⚙️ CONTEXTO DE ENGENHARIA:
✅ ENFATIZAR: Simulação, modelagem, otimização de processos
✅ MENCIONAR: Aspen Plus, MATLAB, ferramentas técnicas
`,
      en: `
⚙️ ENGINEERING CONTEXT:
✅ EMPHASIZE: Simulation, modeling, process optimization
✅ MENTION: Aspen Plus, MATLAB, technical tools
`,
    },

    general: {
      pt: `CONTEXTO GERAL: Equilibrar aspectos técnicos e práticos`,
      en: `GENERAL: Balance technical and practical aspects`,
    },
  }

  return instructions[context][language]
}
