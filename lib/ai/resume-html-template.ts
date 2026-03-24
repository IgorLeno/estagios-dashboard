import type { CVTemplate } from "./types"

export type ResumeTemplate = "modelo1" | "modelo2"

// ─── Shared helper ────────────────────────────────────────────────────────────

function escapeHtml(value: string): string {
  if (!value) return ""
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// ─── Shared section renderers ──────────────────────────────────────────────────

function renderContactLine(cv: CVTemplate, template: ResumeTemplate): string {
  if (template === "modelo2") {
    const parts: string[] = []
    if (cv.header.location) parts.push(escapeHtml(cv.header.location))
    if (cv.header.phone) parts.push(escapeHtml(cv.header.phone))
    if (cv.header.email)
      parts.push(`<a href="mailto:${escapeHtml(cv.header.email)}">${escapeHtml(cv.header.email)}</a>`)
    cv.header.links.forEach((link) => {
      parts.push(`<a href="https://${escapeHtml(link.url)}" target="_blank">${escapeHtml(link.url)}</a>`)
    })
    return `<p class="contact-line">${parts.join(" | ")}</p>`
  }
  // modelo1 — original layout with bold labels
  return `<div class="contact">
        <p>
          <strong>Email:</strong> <a href="mailto:${escapeHtml(cv.header.email)}">${escapeHtml(cv.header.email)}</a> |
          <strong>${cv.language === "pt" ? "Telefone" : "Phone"}:</strong> ${escapeHtml(cv.header.phone)}<br>
          <strong>${cv.language === "pt" ? "Localização" : "Location"}:</strong> ${escapeHtml(cv.header.location)} |
          ${cv.header.links.map((link) => `<strong>${escapeHtml(link.label)}:</strong> <a href="https://${escapeHtml(link.url)}" target="_blank">${escapeHtml(link.url)}</a>`).join(" | ")}
        </p>
      </div>`
}

function renderSectionTitle(label: string): string {
  return `<h2 class="section-title">${label}</h2>`
}

function renderEducation(education: CVTemplate["education"]): string {
  return education
    .map(
      (edu) => `<p>
        <strong>${escapeHtml(edu.degree)}</strong> — ${escapeHtml(edu.institution)}<br>
        ${edu.period ? `${escapeHtml(edu.period)}` : ""}${edu.location ? ` | ${escapeHtml(edu.location)}` : ""}
      </p>`
    )
    .join("\n")
}

function renderLanguages(languages: CVTemplate["languages"]): string {
  return `<ul>
        ${languages.map((lang) => `<li>${escapeHtml(lang.language)}: ${escapeHtml(lang.proficiency)}.</li>`).join("\n        ")}
      </ul>`
}

function renderProjects(projects: CVTemplate["projects"]): string {
  return `<ul>
        ${projects
          .map(
            (project) => `<li>
            <strong>${escapeHtml(project.title)}:</strong>
            ${project.description.map(escapeHtml).join(" ")}
          </li>`
          )
          .join("\n        ")}
      </ul>`
}

function renderSkillGroups(skills: CVTemplate["skills"], template: ResumeTemplate): string {
  if (template === "modelo2") {
    return skills
      .map(
        (skillGroup) =>
          `<p><strong class="skill-group-name">${escapeHtml(skillGroup.category)}</strong></p>
      <p class="skill-items">${skillGroup.items.map(escapeHtml).join(" | ")}</p>`
      )
      .join("\n      ")
  }
  // modelo1 — comma-separated list items
  return `<ul>
        ${skills
          .map(
            (skillGroup) =>
              `<li><strong>${escapeHtml(skillGroup.category)}:</strong> ${skillGroup.items.map(escapeHtml).join(", ")}</li>`
          )
          .join("\n        ")}
      </ul>`
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate HTML content from CV template.
 * Defaults to modelo1 (current layout) for backward compatibility.
 */
export function generateResumeHTML(cv: CVTemplate, template: ResumeTemplate = "modelo1"): string {
  if (template === "modelo2") return renderModelo2(cv)
  return renderModelo1(cv)
}

// ─── Modelo 1 — current layout (unchanged) ─────────────────────────────────────

function renderModelo1(cv: CVTemplate): string {
  return `<!DOCTYPE html>
<html lang="${cv.language === "pt" ? "pt-BR" : "en"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(cv.header.name)} - CV</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Calibri, Arial, 'Segoe UI', sans-serif;
      font-size: 11pt;
      line-height: 1.3;
      color: #000;
      background: white;

      /* ✅ MARGENS EXATAS DO MODELO (topo direita baixo esquerda) */
      padding: 1.94cm 2.25cm 0.49cm 2.25cm;

      -webkit-print-color-adjust: exact;
    }

    .container {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
    }

    /* Header */
    .header {
      text-align: left;
      margin-bottom: 8pt;
    }

    .header h1 {
      font-size: 20pt;
      font-weight: bold;
      margin-bottom: 3pt;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      color: #000;
    }

    .header .contact {
      font-size: 10pt;
      line-height: 1.15;
      margin-bottom: 6pt;
      color: #000;
    }

    .header .contact a {
      color: #0066cc;
      text-decoration: underline;
    }

    .header .contact a:hover {
      color: #004499;
    }

    /* Section */
    .section {
      margin-bottom: 8pt;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 6pt;
      margin-bottom: 5pt;
      padding-bottom: 2pt;
      letter-spacing: 0.3pt;
      color: #000;
      /* ✅ Linha horizontal preta de 1.5pt */
      border-bottom: 1.5pt solid #000;
    }

    /* Paragraphs */
    p {
      margin-bottom: 4pt;
      text-align: justify;
      font-size: 11pt;
      line-height: 1.25;
      color: #000;
    }

    /* Lists */
    ul {
      /* ✅ Margem zero para alinhar bullets com título */
      margin-left: 0;
      margin-bottom: 4pt;
      padding-left: 0;
      list-style-position: outside;
      list-style-type: none;
    }

    li {
      margin-bottom: 3pt;
      padding-left: 12pt;
      line-height: 1.25;
      font-size: 11pt;
      color: #000;
      text-align: justify;
      position: relative;
    }

    /* ✅ Bullet customizado alinhado à esquerda */
    li::before {
      content: "• ";
      position: absolute;
      left: 0;
      font-weight: bold;
    }

    /* Bold text */
    strong {
      font-weight: bold;
      color: #000;
    }

    /* Links */
    a {
      color: #0066cc;
      text-decoration: underline;
    }

    a:hover {
      color: #004499;
      text-decoration: underline;
    }

    /* Print optimization */
    @media print {
      body {
        /* Garantir margens exatas na impressão */
        padding: 1.94cm 2.25cm 0.49cm 2.25cm;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>${escapeHtml(cv.header.name.toUpperCase())}</h1>
      ${renderContactLine(cv, "modelo1")}
    </div>

    <!-- Professional Summary -->
    <div class="section">
      ${renderSectionTitle(cv.language === "pt" ? "PERFIL PROFISSIONAL" : "PROFESSIONAL PROFILE")}
      <p>${escapeHtml(cv.summary)}</p>
    </div>

    <!-- Education -->
    <div class="section">
      ${renderSectionTitle(cv.language === "pt" ? "EDUCAÇÃO" : "EDUCATION")}
      ${renderEducation(cv.education)}
    </div>

    <!-- Skills -->
    <div class="section">
      ${renderSectionTitle(cv.language === "pt" ? "COMPETÊNCIAS" : "COMPETENCIES")}
      ${renderSkillGroups(cv.skills, "modelo1")}
    </div>

    ${
      cv.certifications && cv.certifications.length > 0
        ? `
    <!-- Certifications -->
    <div class="section">
      ${renderSectionTitle(cv.language === "pt" ? "CERTIFICAÇÕES" : "CERTIFICATIONS")}
      <ul>
        ${cv.certifications.map((cert) => `<li>${escapeHtml(cert)}</li>`).join("\n        ")}
      </ul>
    </div>`
        : ""
    }

    ${
      cv.projects && cv.projects.length > 0
        ? `
    <!-- Research Projects -->
    <div class="section">
      ${renderSectionTitle(cv.language === "pt" ? "PROJETOS DE PESQUISA" : "RESEARCH PROJECTS")}
      ${renderProjects(cv.projects)}
    </div>`
        : ""
    }

    ${
      cv.languages && cv.languages.length > 0
        ? `
    <!-- Languages -->
    <div class="section">
      ${renderSectionTitle(cv.language === "pt" ? "IDIOMAS" : "LANGUAGES")}
      ${renderLanguages(cv.languages)}
    </div>`
        : ""
    }

  </div>
</body>
</html>`
}

// ─── Modelo 2 — classic layout with blue accents ───────────────────────────────

function renderModelo2(cv: CVTemplate): string {
  return `<!DOCTYPE html>
<html lang="${cv.language === "pt" ? "pt-BR" : "en"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(cv.header.name)} - CV</title>
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10.5pt;
      line-height: 1.35;
      color: #000;
      background: #fff;
      padding: 40px;
      -webkit-print-color-adjust: exact;
    }

    .container { width: 100%; max-width: 100%; }

    .header { margin-bottom: 18pt; }

    h1 {
      font-family: Georgia, serif;
      font-size: 32pt;
      font-weight: 700;
      color: #000;
      margin-bottom: 4pt;
    }

    .subtitle {
      color: #2E5C9E;
      font-style: italic;
      font-size: 13pt;
      margin-bottom: 8pt;
    }

    .contact-line {
      font-size: 10pt;
      color: #333;
      margin-bottom: 0;
    }

    .section { margin-bottom: 20pt; page-break-inside: avoid; }

    .section-title {
      color: #2E5C9E;
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      border-bottom: 1.5pt solid #2E5C9E;
      padding-bottom: 2pt;
      margin-bottom: 8pt;
      margin-top: 0;
    }

    p { margin-bottom: 6pt; font-size: 10.5pt; line-height: 1.35; }

    ul { list-style: none; margin: 0; padding: 0; margin-bottom: 4pt; }

    li {
      list-style: none;
      position: relative;
      padding-left: 14pt;
      margin-bottom: 4pt;
      font-size: 10.5pt;
      line-height: 1.35;
    }

    li::before { content: "• "; position: absolute; left: 0; }

    strong { font-weight: 700; color: #000; }

    .skill-group-name { font-weight: 700; color: #000; }
    .skill-items { color: #000; margin-bottom: 8pt; }

    .company-name { color: #2E5C9E; }
    .job-title { font-weight: 700; }

    a { color: #2E5C9E; text-decoration: none; }

    @media print {
      body { padding: 40px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>${escapeHtml(cv.header.name)}</h1>
      <p class="subtitle">${escapeHtml(cv.header.title)}</p>
      ${renderContactLine(cv, "modelo2")}
    </div>

    <!-- Professional Summary -->
    <div class="section">
      ${renderSectionTitle(cv.language === "pt" ? "PERFIL PROFISSIONAL" : "PROFESSIONAL PROFILE")}
      <p>${escapeHtml(cv.summary)}</p>
    </div>

    <!-- Education -->
    <div class="section">
      ${renderSectionTitle(cv.language === "pt" ? "EDUCAÇÃO" : "EDUCATION")}
      ${renderEducation(cv.education)}
    </div>

    <!-- Skills -->
    <div class="section">
      ${renderSectionTitle(cv.language === "pt" ? "COMPETÊNCIAS" : "COMPETENCIES")}
      ${renderSkillGroups(cv.skills, "modelo2")}
    </div>

    ${
      cv.certifications && cv.certifications.length > 0
        ? `
    <!-- Certifications -->
    <div class="section">
      ${renderSectionTitle(cv.language === "pt" ? "CERTIFICAÇÕES" : "CERTIFICATIONS")}
      <ul>
        ${cv.certifications.map((cert) => `<li>${escapeHtml(cert)}</li>`).join("\n        ")}
      </ul>
    </div>`
        : ""
    }

    ${
      cv.projects && cv.projects.length > 0
        ? `
    <!-- Research Projects -->
    <div class="section">
      ${renderSectionTitle(cv.language === "pt" ? "PROJETOS DE PESQUISA" : "RESEARCH PROJECTS")}
      ${renderProjects(cv.projects)}
    </div>`
        : ""
    }

    ${
      cv.languages && cv.languages.length > 0
        ? `
    <!-- Languages -->
    <div class="section">
      ${renderSectionTitle(cv.language === "pt" ? "IDIOMAS" : "LANGUAGES")}
      ${renderLanguages(cv.languages)}
    </div>`
        : ""
    }

  </div>
</body>
</html>`
}
