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
      margin: 20mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #333;
      background: white;
    }

    .container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 0;
    }

    /* Header */
    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #333;
    }

    .header h1 {
      font-size: 24pt;
      font-weight: bold;
      margin-bottom: 5px;
      color: #000;
    }

    .header .title {
      font-size: 14pt;
      color: #555;
      margin-bottom: 10px;
    }

    .header .contact {
      font-size: 10pt;
      color: #333;
      margin-bottom: 5px;
      text-align: left;
      line-height: 1.5;
    }

    .header .contact a {
      color: #0066cc;
      text-decoration: none;
    }

    /* Section */
    .section {
      margin-bottom: 16px;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 14pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #000;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #ccc;
    }

    /* Summary */
    .summary {
      text-align: justify;
      margin-bottom: 12px;
    }

    /* Experience */
    .experience-item {
      margin-bottom: 12px;
    }

    .experience-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .experience-title {
      font-weight: bold;
      font-size: 11pt;
    }

    .experience-company {
      font-size: 11pt;
      color: #555;
    }

    .experience-period {
      font-size: 10pt;
      color: #777;
      font-style: italic;
    }

    .experience-location {
      font-size: 10pt;
      color: #777;
    }

    .experience-description {
      margin-left: 15px;
      margin-top: 4px;
    }

    .experience-description li {
      margin-bottom: 3px;
    }

    /* Education */
    .education-item {
      margin-bottom: 8px;
    }

    .education-degree {
      font-weight: bold;
    }

    .education-institution {
      color: #555;
    }

    .education-period {
      font-size: 10pt;
      color: #777;
      font-style: italic;
    }

    /* Skills */
    .skills-category {
      margin-bottom: 8px;
    }

    .skills-category-name {
      font-weight: bold;
      margin-bottom: 2px;
    }

    .skills-items {
      margin-left: 15px;
    }

    /* Projects */
    .project-item {
      margin-bottom: 10px;
    }

    .project-title {
      font-weight: bold;
      margin-bottom: 3px;
    }

    .project-description {
      margin-left: 15px;
    }

    .project-description li {
      margin-bottom: 2px;
    }

    /* Languages & Certifications */
    .language-item,
    .certification-item {
      margin-bottom: 4px;
      margin-left: 15px;
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
      ${
        cv.header.title
          ? `<div class="title">${escapeHtml(cv.header.title)}</div>`
          : ""
      }
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
          (edu) => `
        <div class="education-item">
          <div class="education-degree">• ${escapeHtml(edu.degree)}</div>
          <div class="education-institution">  ${escapeHtml(edu.institution)}</div>
          <div class="education-period">  ${escapeHtml(edu.period)}${edu.location ? ` | ${escapeHtml(edu.location)}` : ""}</div>
        </div>
      `
        )
        .join("\n")}
    </div>

    <!-- Skills & Tools -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "HABILIDADES E FERRAMENTAS" : "SKILLS AND TOOLS"}</h2>
      ${cv.skills
        .map(
          (skillGroup) => `
        <div class="skills-category">
          <div class="skills-category-name">• ${escapeHtml(skillGroup.category)}:</div>
          <div class="skills-items">  ${skillGroup.items.map(escapeHtml).join(", ")}</div>
        </div>
      `
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
