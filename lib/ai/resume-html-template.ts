import type { CVTemplate } from "./types"

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
  <title>${cv.header.name} - CV</title>
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
      color: #666;
      margin-bottom: 5px;
    }

    .header .links {
      font-size: 10pt;
      color: #0066cc;
    }

    .header .links a {
      color: #0066cc;
      text-decoration: none;
      margin: 0 8px;
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
      <h1>${cv.header.name}</h1>
      <div class="title">${cv.header.title}</div>
      <div class="contact">
        ${cv.header.email} | ${cv.header.phone} | ${cv.header.location}
      </div>
      <div class="links">
        ${cv.header.links.map((link) => `<a href="${link.url}">${link.label}</a>`).join(" | ")}
      </div>
    </div>

    <!-- Professional Summary -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "Resumo Profissional" : "Professional Summary"}</h2>
      <p class="summary">${cv.summary}</p>
    </div>

    <!-- Experience -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "Experiência Profissional" : "Professional Experience"}</h2>
      ${cv.experience
        .map(
          (exp) => `
        <div class="experience-item">
          <div class="experience-header">
            <div>
              <div class="experience-title">${exp.title}</div>
              <div class="experience-company">${exp.company}</div>
            </div>
            <div style="text-align: right;">
              <div class="experience-period">${exp.period}</div>
              <div class="experience-location">${exp.location}</div>
            </div>
          </div>
          <ul class="experience-description">
            ${exp.description.map((item) => `<li>${item}</li>`).join("\n")}
          </ul>
        </div>
      `
        )
        .join("\n")}
    </div>

    <!-- Education -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "Formação Acadêmica" : "Education"}</h2>
      ${cv.education
        .map(
          (edu) => `
        <div class="education-item">
          <div class="education-degree">${edu.degree}</div>
          <div class="education-institution">${edu.institution}</div>
          <div class="education-period">${edu.period} | ${edu.location}</div>
        </div>
      `
        )
        .join("\n")}
    </div>

    <!-- Skills & Tools -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "Habilidades e Ferramentas" : "Skills & Tools"}</h2>
      ${cv.skills
        .map(
          (skillGroup) => `
        <div class="skills-category">
          <div class="skills-category-name">${skillGroup.category}:</div>
          <div class="skills-items">${skillGroup.items.join(", ")}</div>
        </div>
      `
        )
        .join("\n")}
    </div>

    <!-- Research Projects -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "Projetos de Pesquisa" : "Research Projects"}</h2>
      ${cv.projects
        .map(
          (project) => `
        <div class="project-item">
          <div class="project-title">${project.title}</div>
          <ul class="project-description">
            ${project.description.map((item) => `<li>${item}</li>`).join("\n")}
          </ul>
        </div>
      `
        )
        .join("\n")}
    </div>

    <!-- Languages -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "Idiomas" : "Languages"}</h2>
      ${cv.languages.map((lang) => `<div class="language-item">${lang.language}: ${lang.proficiency}</div>`).join("\n")}
    </div>

    <!-- Certifications -->
    <div class="section">
      <h2 class="section-title">${cv.language === "pt" ? "Certificações" : "Certifications"}</h2>
      ${cv.certifications.map((cert) => `<div class="certification-item">• ${cert}</div>`).join("\n")}
    </div>
  </div>
</body>
</html>`
}
