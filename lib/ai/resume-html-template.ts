import type { CVTemplate } from "./types"

/**
 * Escape HTML special characters to prevent injection
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * Generate HTML content from CV template
 * Matches styling from saipem-cv-igor_fernandes.pdf
 */
export function generateResumeHTML(cv: CVTemplate): string {
  return `<!DOCTYPE html>
<html lang="${cv.language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(cv.header.name)} - CV</title>
  <style>
    @page {
      size: A4;
      margin: 0.5in 0.6in;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10.5pt;
      line-height: 1.35;
      color: #000;
      background: white;
    }

    .container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 0;
    }

    /* Header */
    .header {
      text-align: left;
      margin-bottom: 12pt;
    }

    .header h1 {
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 4pt;
      color: #000;
      text-transform: none;
    }

    .header .title {
      font-size: 11pt;
      color: #555;
      margin-bottom: 4pt;
    }

    .header .contact {
      font-size: 10pt;
      color: #000;
      margin-bottom: 0;
      line-height: 1.25;
    }

    .header .contact a {
      color: #0066cc;
      text-decoration: none;
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
      color: #000;
      margin-top: 0;
      margin-bottom: 4pt;
      padding-bottom: 2pt;
      border-bottom: 1.5px solid #000;
    }

    /* Summary */
    .summary {
      text-align: justify;
      margin-bottom: 0;
      font-size: 10.5pt;
      line-height: 1.35;
    }

    /* Experience */
    .experience-item {
      margin-bottom: 6pt;
    }

    .experience-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2pt;
    }

    .experience-title {
      font-weight: bold;
      font-size: 10.5pt;
    }

    .experience-company {
      font-size: 10.5pt;
      color: #000;
    }

    .experience-period {
      font-size: 10pt;
      color: #000;
      font-style: normal;
    }

    .experience-location {
      font-size: 10pt;
      color: #000;
    }

    .experience-description {
      margin-left: 12pt;
      margin-top: 2pt;
    }

    .experience-description li {
      margin-bottom: 1pt;
      font-size: 10.5pt;
    }

    /* Education */
    .education-item {
      margin-bottom: 3pt;
      font-size: 10.5pt;
      line-height: 1.35;
    }

    /* Skills */
    .skills-category {
      margin-bottom: 3pt;
      font-size: 10.5pt;
      line-height: 1.35;
    }

    /* Projects */
    .project-item {
      margin-bottom: 5pt;
    }

    .project-title {
      font-weight: bold;
      margin-bottom: 0;
      font-size: 10.5pt;
    }

    .project-description {
      margin-left: 0;
      padding-left: 12pt;
      margin-top: 1pt;
    }

    .project-description li {
      margin-bottom: 0;
      font-size: 10.5pt;
      line-height: 1.35;
    }

    /* Languages & Certifications */
    .language-item,
    .certification-item {
      margin-bottom: 2pt;
      margin-left: 0;
      font-size: 10.5pt;
      line-height: 1.35;
    }

    /* Print optimization */
    @media print {
      body {
        width: 210mm;
        height: 297mm;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>${escapeHtml(cv.header.name)}</h1>
      ${cv.header.title ? `<div class="title">${escapeHtml(cv.header.title)}</div>` : ""}
      <div class="contact">
        Email: ${escapeHtml(cv.header.email)}<br>
        Phone: ${escapeHtml(cv.header.phone)}<br>
        Location: ${escapeHtml(cv.header.location)}<br>
        ${cv.header.links.map((link) => `${escapeHtml(link.label)}: <a href="${escapeHtml(link.url)}">${escapeHtml(link.url)}</a>`).join("<br>\n")}
      </div>
    </div>

    <!-- Professional Summary -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "RESUMO" : "SUMMARY"}</h2>
      <p class="summary">${escapeHtml(cv.summary)}</p>
    </div>

    <!-- Education -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "EDUCAÇÃO" : "EDUCATION"}</h2>
      ${cv.education
        .map(
          (edu) => `<div class="education-item">• <strong>${escapeHtml(edu.degree)}</strong> - ${escapeHtml(edu.institution)} (${escapeHtml(edu.period)}${edu.location ? ` | ${escapeHtml(edu.location)}` : ""})</div>`
        )
        .join("\n")}
    </div>

    <!-- Skills & Tools -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "HABILIDADES E FERRAMENTAS" : "SKILLS AND TOOLS"}</h2>
      ${cv.skills
        .map(
          (skillGroup) => `<div class="skills-category">• <strong>${escapeHtml(skillGroup.category)}:</strong> ${skillGroup.items.map(escapeHtml).join(", ")}.</div>`
        )
        .join("\n")}
    </div>

    ${
      cv.certifications.length > 0
        ? `
    <!-- Certifications -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "CERTIFICAÇÕES" : "CERTIFICATIONS"}</h2>
      ${cv.certifications.map((cert) => `<div class="certification-item">• ${escapeHtml(cert)}</div>`).join("\n")}
    </div>`
        : ""
    }

    ${
      cv.projects.length > 0
        ? `
    <!-- Research Projects -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "PROJETOS DE PESQUISA" : "RESEARCH PROJECTS"}</h2>
      ${cv.projects
        .map(
          (project) => `
        <div class="project-item">
          <div class="project-title">• ${escapeHtml(project.title)}</div>
          <ul class="project-description">
            ${project.description.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n")}
          </ul>
        </div>
      `
        )
        .join("\n")}
    </div>`
        : ""
    }

    ${
      cv.languages.length > 0
        ? `
    <!-- Languages -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "IDIOMAS" : "LANGUAGES"}</h2>
      ${cv.languages.map((lang) => `<div class="language-item">• ${escapeHtml(lang.language)}: ${escapeHtml(lang.proficiency)}</div>`).join("\n")}
    </div>`
        : ""
    }
  </div>
</body>
</html>`
}
