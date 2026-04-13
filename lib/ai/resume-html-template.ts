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
    parts.push(
      `<a href="https://${escapeHtml(link.url)}" target="_blank">${escapeHtml(link.url.replace(/^https?:\/\//i, ""))}</a>`
    )
  })
  if (cv.header.email)
    parts.push(`<a href="mailto:${escapeHtml(cv.header.email)}">${escapeHtml(cv.header.email)}</a>`)
  if (cv.header.phone) parts.push(escapeHtml(cv.header.phone))
  if (cv.header.location) parts.push(formattedLocation)
  otherLinks.forEach((link) => {
    parts.push(
      `<a href="https://${escapeHtml(link.url)}" target="_blank">${escapeHtml(link.url.replace(/^https?:\/\//i, ""))}</a>`
    )
  })

  const renderedItems = parts
    .map(
      (part, index) =>
        `<span class="contact-item">${part}${index < parts.length - 1 ? '<span class="contact-separator" aria-hidden="true"> | </span>' : ""}</span>`
    )
    .join("")

  if (template === "modelo2") {
    return `<p class="contact-line">${renderedItems}</p>`
  }
  return `<div class="contact"><p>${renderedItems}</p></div>`
}

function renderSectionTitle(label: string): string {
  return `<h2 class="section-title">${label}</h2>`
}

function renderEducation(education: CVTemplate["education"]): string {
  return education
    .map(
      (edu) => `<p>
        <strong>${escapeHtml(edu.degree)}</strong> — ${escapeHtml(edu.institution)}${edu.location ? ` | ${escapeHtml(edu.location)}` : ""}<br>
        ${edu.period ? `<span class="period-tag">${escapeHtml(edu.period)}</span>` : ""}
      </p>`
    )
    .join("\n")
}

function buildSkillsWithLanguages(cv: CVTemplate): CVTemplate["skills"] {
  const skills = [...cv.skills]
  if (cv.languages && cv.languages.length > 0) {
    skills.push({
      category: cv.language === "pt" ? "Idiomas" : "Languages",
      items: cv.languages.map((l) => `${l.language} (${l.proficiency})`),
    })
  }
  return skills
}

function renderProjects(projects: CVTemplate["projects"], template: ResumeTemplate): string {
  if (template === "modelo2") {
    return projects
      .map(
        (project) => `<div class="project-item">
          <p><strong class="project-title">${escapeHtml(project.title)}</strong></p>
          <p class="project-prose">${project.description.map(escapeHtml).join(" ")}</p>
        </div>`
      )
      .join("\n      ")
  }

  return projects
    .map(
      (project) => `<div class="project-item">
          <p><strong>${escapeHtml(project.title)}</strong></p>
          ${project.period ? `<span class="period-tag">${escapeHtml(project.period)}</span>` : ""}
          <p>${project.description.map(escapeHtml).join(" ")}</p>
        </div>`
    )
    .join("\n      ")
}

function deduplicateItems(items: string[]): string[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = item.replace(/\s*\([^)]+\)$/, "").trim().toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function renderSkillGroups(skills: CVTemplate["skills"], template: ResumeTemplate): string {
  if (template === "modelo2") {
    return skills
      .map(
        (skillGroup) =>
          `<p><strong class="skill-group-name">${escapeHtml(skillGroup.category)}</strong></p>
      <p class="skill-items">${deduplicateItems(skillGroup.items).map(escapeHtml).join(" | ")}</p>`
      )
      .join("\n      ")
  }
  // modelo1 — pipe-separated items
  return skills
    .map(
      (skillGroup) =>
        `<p><strong>${escapeHtml(skillGroup.category)}</strong></p>
      <p>${deduplicateItems(skillGroup.items).map(escapeHtml).join(" | ")}</p>`
    )
    .join("\n      ")
}

function renderCertificationLabel(cert: Certification): string {
  // Backward-compat: legacy string entries stored before migration
  if (typeof cert === "string") {
    return `<strong>${escapeHtml(cert as unknown as string)}</strong>`
  }

  const suffix: string[] = []
  if (cert.institution) suffix.push(escapeHtml(cert.institution))
  if (cert.year) suffix.push(escapeHtml(cert.year))
  const tail = suffix.length > 0 ? ` <span class="cert-meta">(${suffix.join(", ")})</span>` : ""
  return `<strong>${escapeHtml(cert.title)}</strong>${tail}`
}

function renderCertifications(certifications: Certification[], template: ResumeTemplate): string {
  if (template === "modelo2") {
    return certifications.map(renderCertificationLabel).join(' <span class="cert-separator">|</span> ')
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
      margin-bottom: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      color: #000;
    }

    .tagline {
      font-size: 11pt;
      font-style: italic;
      color: #0066cc;
      margin-bottom: 4pt;
      margin-top: 4pt;
    }

    .header .contact {
      font-size: 10pt;
      line-height: 1.15;
      margin-bottom: 6pt;
      color: #000;
      word-break: break-word;
      overflow-wrap: break-word;
    }

    .header .contact a {
      color: #0066cc;
      text-decoration: underline;
    }

    .header .contact a:hover {
      color: #004499;
    }

    .header .contact .contact-item {
      white-space: nowrap;
      display: inline-block;
    }

    .header .contact .contact-separator {
      color: #000;
      white-space: pre;
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

    .cert-meta {
      color: #888;
      font-weight: normal;
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

    .section-projects {
      page-break-inside: auto;
      break-inside: auto;
    }

    .project-item {
      margin-top: 7pt;
      margin-bottom: 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .project-item p {
      text-align: justify;
    }

    .section p {
      text-align: justify;
    }

    .project-item:first-child {
      margin-top: 0;
    }

    .period-tag {
      display: inline-block;
      font-size: 7.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #555;
      border: 1pt solid #bbb;
      padding: 1pt 5pt;
      margin: 0 0 2pt 0;
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
      ${cv.header.tagline ? `<p class="tagline">${escapeHtml(cv.header.tagline)}</p>` : ""}
      ${renderContactLine(cv, "modelo1")}
    </div>

    <!-- Professional Summary -->
    <div class="section">
      ${renderSectionTitle(cv.language === "pt" ? "PERFIL PROFISSIONAL" : "PROFESSIONAL PROFILE")}
      <p>${escapeHtml(cv.summary)}</p>
    </div>

    <!-- Skills -->
    <div class="section">
      ${renderSectionTitle(cv.language === "pt" ? "COMPETÊNCIAS" : "COMPETENCIES")}
      ${renderSkillGroups(buildSkillsWithLanguages(cv), "modelo1")}
    </div>

    ${
      cv.projects && cv.projects.length > 0
        ? `
    <!-- Research Projects -->
    <div class="section section-projects">
      ${renderSectionTitle(cv.language === "pt" ? "PROJETOS DE PESQUISA" : "RESEARCH PROJECTS")}
      ${renderProjects(cv.projects, "modelo1")}
    </div>`
        : ""
    }

    <!-- Education -->
    <div class="section">
      ${renderSectionTitle(cv.language === "pt" ? "EDUCAÇÃO" : "EDUCATION")}
      ${renderEducation(cv.education)}
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
    @page { size: A4; margin: 30px 40px; }
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

    .header { margin-bottom: 10pt; }

    h1 {
      font-family: Georgia, serif;
      font-size: 20pt;
      font-weight: 700;
      line-height: 1.05;
      color: #000;
      margin-bottom: 4pt;
    }

    .tagline {
      color: #2E6FA3;
      font-size: 9pt;
      font-weight: 500;
      line-height: 1.25;
      margin-bottom: 4pt;
      text-align: left;
    }

    .contact-line {
      font-size: 9.5pt;
      color: #5a5a5a;
      margin-bottom: 0;
      line-height: 1.3;
      text-align: left;
    }

    .contact-item {
      white-space: normal;
    }

    .contact-separator {
      color: #6d6d6d;
      white-space: pre;
    }

    .section {
      margin-bottom: 10pt;
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

    .cert-meta {
      color: #888;
      font-weight: normal;
    }

    .skill-group-name { font-weight: 700; color: #000; }
    .skill-items { color: #000; margin-bottom: 6pt; }

    .project-item {
      margin-bottom: 7pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .project-title {
      font-weight: 700;
      display: block;
      margin-bottom: 3pt;
    }

    .project-prose {
      font-weight: normal;
      text-align: justify;
      line-height: 1.4;
      margin-bottom: 0;
    }

    .cert-list { margin-bottom: 4pt; }
    .cert-separator { color: #2E5C9E; }

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
      ${cv.header.tagline ? `<p class="tagline">${escapeHtml(cv.header.tagline)}</p>` : ""}
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
      ${renderSkillGroups(buildSkillsWithLanguages(cv), "modelo2")}
    </div>

    ${
      cv.certifications && cv.certifications.length > 0
        ? `
    <!-- Certifications -->
    <div class="section">
      ${renderSectionTitle(cv.language === "pt" ? "CERTIFICAÇÕES" : "CERTIFICATIONS")}
      <p class="cert-list">${renderCertifications(cv.certifications, "modelo2")}</p>
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

  </div>
</body>
</html>`
}
