import type { CVTemplate } from "./types"

/**
 * Escape HTML special characters to prevent injection
 */
function escapeHtml(value: string): string {
  if (!value) return ""
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * Generate HTML content from CV template
 * Matches styling from cv-igor-fernandes-modelo.pdf
 */
export function generateResumeHTML(cv: CVTemplate): string {
  return `<!DOCTYPE html>
<html lang="${cv.language === 'pt' ? 'pt-BR' : 'en'}">
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
      <div class="contact">
        <p>
          <strong>Email:</strong> <a href="mailto:${escapeHtml(cv.header.email)}">${escapeHtml(cv.header.email)}</a> |
          <strong>${cv.language === "pt" ? "Telefone" : "Phone"}:</strong> ${escapeHtml(cv.header.phone)}<br>
          <strong>${cv.language === "pt" ? "Localização" : "Location"}:</strong> ${escapeHtml(cv.header.location)} |
          ${cv.header.links.map((link) => `<strong>${escapeHtml(link.label)}:</strong> <a href="https://${escapeHtml(link.url)}" target="_blank">${escapeHtml(link.url)}</a>`).join(" | ")}
        </p>
      </div>
    </div>

    <!-- Professional Summary -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "PERFIL PROFISSIONAL" : "PROFESSIONAL PROFILE"}</h2>
      <p>${escapeHtml(cv.summary)}</p>
    </div>

    <!-- Education -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "EDUCAÇÃO" : "EDUCATION"}</h2>
      ${cv.education
        .map(
          (edu) => `<p>
        <strong>${escapeHtml(edu.degree)}</strong> — ${escapeHtml(edu.institution)}<br>
        ${edu.period ? `${escapeHtml(edu.period)}` : ""}${edu.location ? ` | ${escapeHtml(edu.location)}` : ""}
      </p>`
        )
        .join("\n")}
    </div>

    <!-- Skills -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "COMPETÊNCIAS" : "COMPETENCIES"}</h2>
      <ul>
        ${cv.skills
          .map(
            (skillGroup) => `<li><strong>${escapeHtml(skillGroup.category)}:</strong> ${skillGroup.items.map(escapeHtml).join(", ")}</li>`
          )
          .join("\n        ")}
      </ul>
    </div>

    ${
      cv.certifications && cv.certifications.length > 0
        ? `
    <!-- Certifications -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "CERTIFICAÇÕES" : "CERTIFICATIONS"}</h2>
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
      <h2 class="section-title">${cv.language === "pt" ? "PROJETOS DE PESQUISA" : "RESEARCH PROJECTS"}</h2>
      <ul>
        ${cv.projects
          .map(
            (project) => `<li>
            <strong>${escapeHtml(project.title)}:</strong>
            ${project.description.map(escapeHtml).join(" ")}
          </li>`
          )
          .join("\n        ")}
      </ul>
    </div>`
        : ""
    }

    ${
      cv.languages && cv.languages.length > 0
        ? `
    <!-- Languages -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "IDIOMAS" : "LANGUAGES"}</h2>
      <ul>
        ${cv.languages.map((lang) => `<li>${escapeHtml(lang.language)}: ${escapeHtml(lang.proficiency)}.</li>`).join("\n        ")}
      </ul>
    </div>`
        : ""
    }

  </div>
</body>
</html>`
}
