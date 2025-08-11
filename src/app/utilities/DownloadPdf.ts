/**
 * DownloadPdf.ts
 * Utility to export a DOM element (e.g., your ResumeBody container) to a paginated A4 PDF.
 *
 * Requirements (install once):
 *   npm install html2canvas jspdf
 */
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import resume from "@/app/data/resume.json";

const PDF_SAFE_CLASS = "__pdf_colors_safe";
const PDF_SAFE_STYLE_ID = "__pdf_colors_style";

export type DownloadPdfOptions = {
  filename?: string;            // default: "resume.pdf"
  background?: string;          // CSS color used while rendering to canvas (e.g., "#ffffff")
  scale?: number;               // extra render scale (multiplied by devicePixelRatio)
  paddingPx?: number;           // extra padding around the element when capturing (in px)
};

/**
 * Converts a DOM element to a multi-page A4 PDF and triggers a download.
 * Pass the element that wraps the resume content (the white box), not the whole page.
 */
export async function downloadElementAsPdf(
  element: HTMLElement,
  {
    filename = "resume.pdf",
    background = "#ffffff",
    scale,
    paddingPx = 0,
  }: DownloadPdfOptions = {}
): Promise<void> {
  if (!element) throw new Error("downloadElementAsPdf: element is required");

  // Ensure the element is fully visible for capture: temporarily remove overflow clipping
  const prevOverflow = element.style.overflow;
  const prevMaxHeight = element.style.maxHeight;
  element.style.overflow = "visible";
  element.style.maxHeight = "none";

  // Create a padded wrapper snapshot if padding is requested
  const target = paddingPx > 0 ? wrapWithPadding(element, paddingPx) : element;

  // Apply safe colors to avoid unsupported CSS color spaces (e.g., lab()) in html2canvas
  applyPdfSafeStyles(target);

  try {
    const dpr = window.devicePixelRatio || 1;
    const effectiveScale = (scale ?? 2) * dpr; // high-res render

    const canvas = await html2canvas(target, {
      backgroundColor: background,
      scale: effectiveScale,
      logging: false,
      useCORS: true,
      windowWidth: document.documentElement.clientWidth,
    });

    // Create a single-page PDF sized to the content height (dynamic)
    const pageWidthMm = 210; // A4 width in mm
    const imgWidthMm = pageWidthMm;
    const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width; // keep aspect ratio

    // Ensure a minimum height to avoid zero/rounding issues
    const pageHeightMm = Math.max(Math.ceil(imgHeightMm), 20);

    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: [pageWidthMm, pageHeightMm] });

    const imgDataFull = canvas.toDataURL("image/png");
    pdf.addImage(imgDataFull, "PNG", 0, 0, imgWidthMm, imgHeightMm);

    pdf.save(filename);
  } finally {
    // Remove color override styles
    removePdfSafeStyles(target);

    // Restore styles
    element.style.overflow = prevOverflow;
    element.style.maxHeight = prevMaxHeight;

    // If we wrapped the element for padding, unwrap it
    if (paddingPx > 0 && element.parentElement && element.parentElement.dataset.__pdfPaddingWrapper === "1") {
      const wrapper = element.parentElement;
      wrapper.replaceWith(element);
    }
  }
}


// --- helpers ---
function wrapWithPadding(el: HTMLElement, paddingPx: number): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.padding = `${paddingPx}px`;
  wrapper.style.background = "transparent";
  wrapper.style.display = "inline-block";
  wrapper.dataset.__pdfPaddingWrapper = "1";
  el.parentElement?.insertBefore(wrapper, el);
  wrapper.appendChild(el);
  return wrapper;
}

function applyPdfSafeStyles(el: HTMLElement) {
  el.classList.add(PDF_SAFE_CLASS);
  if (!document.getElementById(PDF_SAFE_STYLE_ID)) {
    const style = document.createElement("style");
    style.id = PDF_SAFE_STYLE_ID;
    style.textContent = `
      .${PDF_SAFE_CLASS}, .${PDF_SAFE_CLASS} * {
        /* Force rgb colors to avoid lab()/oklab() parsing issues in html2canvas */
        color: rgb(0, 0, 0) !important;
        background-color: transparent !important;
        /* Reduce rendering artifacts */
        box-shadow: none !important;
        filter: none !important;
        text-shadow: none !important;
      }
      /* Allow explicitly colored elements (e.g., headers) to override with safe rgb */
      .${PDF_SAFE_CLASS} .pdf-color {
        color: rgb(31, 41, 55) !important; /* slate-800-ish */
      }
      .${PDF_SAFE_CLASS} ul.list-disc { list-style: none !important; padding-left: 0 !important; margin: 0 !important; }
      .${PDF_SAFE_CLASS} ul.list-disc > li { position: relative; padding-left: 1.25rem !important; line-height: 1.6 !important; }
      .${PDF_SAFE_CLASS} ul.list-disc > li::before {
        content: "•"; position: absolute; left: 0; top: 0.24em; font-size: 1.1em; line-height: 1;
      }
    `;
    document.head.appendChild(style);
  }
}

function removePdfSafeStyles(el: HTMLElement) {
  el.classList.remove(PDF_SAFE_CLASS);
  const style = document.getElementById(PDF_SAFE_STYLE_ID);
  if (style) style.remove();
}


// --- Hardcoded resume PDF export ---

interface PersonalInfo { name?: string; github?: string; email?: string }
interface WorkExperience { title?: string; company?: string; years?: string; description?: string }
interface Project { title?: string; description?: string }
interface NoteworthyProject { title?: string; description?: string }
interface Education { degree?: string; institution?: string; years?: string; noteworthyProjects?: NoteworthyProject[] }
interface ResumeData {
  personalInfo?: PersonalInfo | PersonalInfo[];
  workExperience?: WorkExperience[];
  projects?: Project[];
  education?: Education[];
  hardSkills?: string[];
  softSkills?: string[];
  languages?: string[];
}

export async function downloadHardcodedResumePdf(opts?: DownloadPdfOptions) {
  // Types to avoid `any`
  type PersonalInfo = { name?: string; github?: string; email?: string };
  type WorkExperience = { title?: string; company?: string; years?: string; description?: string };
  type Project = { title?: string; description?: string };
  type NoteworthyProject = { title?: string; description?: string };
  type Education = { degree?: string; institution?: string; years?: string; noteworthyProjects?: NoteworthyProject[] };
  type Resume = {
    personalInfo?: PersonalInfo | PersonalInfo[];
    workExperience?: WorkExperience[];
    projects?: Project[];
    education?: Education[];
    hardSkills?: string[];
    softSkills?: string[];
    languages?: string[];
  };

  const data = (resume as unknown) as Resume;

  const personalArray: PersonalInfo[] = Array.isArray(data.personalInfo)
    ? data.personalInfo
    : (data.personalInfo ? [data.personalInfo] : []);
  const personal: PersonalInfo = personalArray[0] ?? {};

  const NAME = esc(personal.name ?? "");
  const GITHUB = esc(personal.github ?? "");
  const EMAIL = esc(personal.email ?? "");

  const WORK = data.workExperience ?? [];
  const PROJECTS = data.projects ?? [];
  const EDUCATION = data.education ?? [];
  const HARD_SKILLS = data.hardSkills ?? [];
  const SOFT_SKILLS = data.softSkills ?? [];
  const LANGUAGES: string[] = data.languages ?? [];

  // Build the container entirely here (no selectors, no external DOM)
  const container = document.createElement("div");
  container.className = "font-sans text-black bg-white max-w-3xl mx-auto p-4 sm:p-8 md:p-16";

  container.innerHTML = `
    <header class="mb-12 text-center">
      <h1 class="text-4xl font-bold mb-2 pdf-color" style="padding-bottom:4px;">${NAME}</h1>
      <div class="flex flex-col items-center space-y-2 text-sm">
        ${GITHUB ? `<div class=\"flex items-center space-x-2\"><span class=\"break-all\">${GITHUB}</span></div>` : ""}
        ${EMAIL ? `<div class=\"flex items-center space-x-2\"><span class=\"break-all\">${EMAIL}</span></div>` : ""}
      </div>
    </header>

    ${WORK.length ? `
    <section class=\"mb-10\">
      <h2 class=\"text-xl font-semibold mb-4 pdf-color\" style=\"padding-bottom:4px;\">Work Experience</h2>
      ${WORK.map(w => `
        <div class=\"mb-6\">
          <h3 class=\"font-semibold text-lg\">${esc(w.title ?? "")}</h3>
          <p class=\"text-sm text-gray-700 italic\">${esc(w.company ?? "")}${w.years ? ` — ${esc(w.years)}` : ""}</p>
          <p class=\"mt-2 text-sm leading-relaxed\">${esc(w.description ?? "")}</p>
        </div>
      `).join("")}
    </section>` : ""}

    ${PROJECTS.length ? `
    <section class=\"mb-10\">
      <h2 class=\"text-xl font-semibold mb-4 pdf-color\" style=\"padding-bottom:4px;\">Projects</h2>
      ${PROJECTS.map(p => `
        <div class=\"mb-6\">
          <h3 class=\"font-semibold text-lg\">${esc(p.title ?? "")}</h3>
          <p class=\"mt-2 text-sm leading-relaxed\">${esc(p.description ?? "")}</p>
        </div>
      `).join("")}
    </section>` : ""}

    ${EDUCATION.length ? `
    <section class=\"mb-10\">
      <h2 class=\"text-xl font-semibold mb-4 pdf-color\" style=\"padding-bottom:4px;\">Education</h2>
      ${EDUCATION.map(e => `
        <div class=\"mb-6\">
          <h3 class=\"font-semibold text-lg\">${esc(e.degree ?? "")}</h3>
          <p class=\"text-sm text-gray-700 italic\">${esc(e.institution ?? "")}${e.years ? ` — ${esc(e.years)}` : ""}</p>
          ${(Array.isArray(e.noteworthyProjects) && e.noteworthyProjects.length) ? `
            <ul class=\"list-disc text-sm mt-2 space-y-1 pl-6 leading-6\">
              ${e.noteworthyProjects!.map(np => `
                <li><span class=\"font-medium\">${esc(np.title ?? "")}</span>: ${esc(np.description ?? "")}</li>
              `).join("")}
            </ul>
          ` : ""}
        </div>
      `).join("")}
    </section>` : ""}

    ${HARD_SKILLS.length ? `
    <section class=\"mb-10\">
      <h2 class=\"text-xl font-semibold mb-4 pdf-color\" style=\"padding-bottom:4px;\">Hard Skills</h2>
      <ul class=\"list-disc text-sm space-y-1 pl-6 leading-6\">
        ${HARD_SKILLS.map(s => `<li>${esc(s)}</li>`).join("")}
      </ul>
    </section>` : ""}

    ${SOFT_SKILLS.length ? `
    <section class=\"mb-10\">
      <h2 class=\"text-xl font-semibold mb-4 pdf-color\" style=\"padding-bottom:4px;\">Soft Skills</h2>
      <ul class=\"list-disc text-sm space-y-1 pl-6 leading-6\">
        ${SOFT_SKILLS.map(s => `<li>${esc(s)}</li>`).join("")}
      </ul>
    </section>` : ""}
    ${LANGUAGES.length ? `
    <section class=\"mb-10\">
      <h2 class="text-xl font-semibold mb-4 pdf-color" style="padding-bottom:4px;">Languages</h2>
      <ul class="list-disc text-sm space-y-1 pl-6 leading-6">
        ${LANGUAGES.map(l => `<li>${esc(l)}</li>`).join("")}
      </ul>
    </section>` : ""}
  `;

  // Hidden off-screen wrapper for capture
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-9999px";
  host.style.top = "0";
  host.style.width = "100%";
  host.style.height = "100%";
  host.style.overflow = "auto";
  host.style.background = "transparent";
  host.style.zIndex = "2147483647";
  host.appendChild(container);
  document.body.appendChild(host);

  try {
    await downloadElementAsPdf(container, opts);
  } finally {
    host.remove();
  }
}

function esc(input: unknown): string {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}