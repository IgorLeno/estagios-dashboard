import type { CVTemplate, Certification } from "./types"

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
  const linkedinLinks = cv.header.links.filter((l) => l.url.toLowerCase().includes("linkedin"))
  const otherLinks = cv.header.links.filter((l) => !l.url.toLowerCase().includes("linkedin"))
  const formattedLocation = escapeHtml(cv.header.location.replace("/", ", "))

  const parts: string[] = []
  linkedinLinks.forEach((link) => {
    parts.push(`<a href="https://${escapeHtml(link.url)}" target="_blank">${escapeHtml(link.url)}</a>`)
  })
  if (cv.header.email)
    parts.push(`<a href="mailto:${escapeHtml(cv.header.email)}">${escapeHtml(cv.header.email)}</a>`)
  if (cv.header.phone) parts.push(escapeHtml(cv.header.phone))
  if (cv.header.location) parts.push(formattedLocation)
  otherLinks.forEach((link) => {
    parts.push(`<a href="https://${escapeHtml(link.url)}" target="_blank">${escapeHtml(link.url)}</a>`)
  })

  if (template === "modelo2") {
    return `<p class="contact-line">${parts.map((part) => `<span class="contact-item">${part}</span>`).join("")}</p>`
  }
  return `<div class="contact"><p>${parts.join(" | ")}</p></div>`
}

function renderSectionTitle(label: string): string {
  return `<h2 class="section-title">${label}</h2>`
}

function renderEducation(education: CVTemplate["education"]): string {
  return education
    .map(
      (edu) => `<p>
        <strong>${escapeHtml(edu.degree)}</strong> — ${escapeHtml(edu.institution)}${edu.location ? ` | ${escapeHtml(edu.location)}` : ""}<br>
        ${edu.period ? escapeHtml(edu.period) : ""}
      </p>`
    )
    .join("\n")
}

function renderLanguages(languages: CVTemplate["languages"]): string {
  return `<ul>
        ${languages.map((lang) => `<li>${escapeHtml(lang.language)}: ${escapeHtml(lang.proficiency)}.</li>`).join("\n        ")}
      </ul>`
}

function renderProjects(projects: CVTemplate["projects"], template: ResumeTemplate): string {
  if (template === "modelo2") {
    return `<ul>
        ${projects
          .map(
            (project) => `<li class="project-item">
            <strong class="project-title">${escapeHtml(project.title)}</strong>
            <ul class="project-bullets">
              ${project.description.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("\n              ")}
            </ul>
          </li>`
          )
          .join("\n        ")}
      </ul>`
  }

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

function renderCertificationLabel(cert: Certification): string {
  // Backward-compat: legacy string entries stored before migration
  if (typeof cert === "string") {
    return `<strong>${escapeHtml(cert as unknown as string)}</strong>`
  }

  const suffix: string[] = []
  if (cert.institution) suffix.push(escapeHtml(cert.institution))
  if (cert.year) suffix.push(escapeHtml(cert.year))
  const tail = suffix.length > 0 ? ` — ${suffix.join(", ")}` : ""
  return `<strong>${escapeHtml(cert.title)}</strong>${tail}`
}

function renderCertifications(certifications: Certification[], template: ResumeTemplate): string {
  if (template === "modelo2") {
    return `<ul class="cert-list">
        ${certifications.map((cert) => `<li>${renderCertificationLabel(cert)}</li>`).join("\n        ")}
      </ul>`
  }

  return certifications.map(renderCertificationLabel).join(" | ")
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
      margin: 1.94cm 2.25cm 0.49cm 2.25cm;
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
      padding: 0;
      margin: 0;
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
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 3pt;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      color: #000;
    }

    .subtitle {
      font-size: 11pt;
      font-style: italic;
      color: #333;
      margin-bottom: 4pt;
      margin-top: 2pt;
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
      break-inside: avoid;
      page-break-before: auto;
      orphans: 3;
      widows: 3;
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
      page-break-after: avoid;
      break-after: avoid;
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

    @media screen {
      body { padding: 1.94cm 2.25cm 1.94cm 2.25cm; }
    }

    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>${escapeHtml(cv.header.name.toUpperCase())}</h1>
      ${cv.header.title ? `<p class="subtitle">${escapeHtml(cv.header.title)}</p>` : ""}
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
      <p class="cert-list">${renderCertifications(cv.certifications, "modelo1")}</p>
    </div>`
        : ""
    }

    ${
      cv.projects && cv.projects.length > 0
        ? `
    <!-- Research Projects -->
    <div class="section">
      ${renderSectionTitle(cv.language === "pt" ? "PROJETOS DE PESQUISA" : "RESEARCH PROJECTS")}
      ${renderProjects(cv.projects, "modelo1")}
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
    @page { size: A4; margin: 40px; }
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10.5pt;
      line-height: 1.35;
      color: #000;
      background: #fff;
      padding: 0;
      margin: 0;
      -webkit-print-color-adjust: exact;
    }

    .container { width: 100%; max-width: 100%; }

    .header { margin-bottom: 18pt; }

    h1 {
      font-family: Georgia, serif;
      font-size: 24pt;
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

    .contact-item {
      white-space: nowrap;
      display: inline;
    }

    .contact-item:not(:last-child)::after {
      content: " | ";
      color: #999;
    }

    .section {
      margin-bottom: 14pt;
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-before: auto;
      orphans: 3;
      widows: 3;
    }

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
      page-break-after: avoid;
      break-after: avoid;
    }

    p { margin-bottom: 5pt; font-size: 10.5pt; line-height: 1.4; }

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
    .skill-items { color: #000; margin-bottom: 6pt; }

    .project-item {
      margin-bottom: 8pt;
      padding-left: 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .project-item::before {
      content: none;
    }

    .project-title {
      display: block;
      margin-bottom: 2pt;
    }

    .project-bullets {
      margin-left: 12pt;
      margin-top: 2pt;
    }

    .project-bullets li {
      margin-bottom: 2pt;
      font-size: 10.5pt;
      line-height: 1.35;
    }

    .cert-list { margin-bottom: 4pt; }
    .cert-list li { margin-bottom: 3pt; }

    .section-projects {
      page-break-inside: auto;
      break-inside: auto;
    }

    .company-name { color: #2E5C9E; }
    .job-title { font-weight: 700; }

    a { color: #2E5C9E; text-decoration: none; }

    @media screen {
      body { padding: 40px; }
    }

    @media print {
      body { padding: 0; }
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
      ${renderCertifications(cv.certifications, "modelo2")}
    </div>`
        : ""
    }

    ${
      cv.projects && cv.projects.length > 0
        ? `
    <!-- Research Projects -->
    <div class="section section-projects">
      ${renderSectionTitle(cv.language === "pt" ? "PROJETOS DE PESQUISA" : "RESEARCH PROJECTS")}
      ${renderProjects(cv.projects, "modelo2")}
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
