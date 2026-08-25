/**
 * READ-ONLY live audit of the PO Revision frame via the EXISTING Chrome CDP session.
 * - Connects over CDP to http://127.0.0.1:9222 (does NOT launch a browser).
 * - Does not create tabs, does not click save/create/edit/delete.
 * - Only reads DOM state of frames; optionally triggers an in-frame Search (read-only query)
 *   which is the same action a user performs to view data.
 */
import { chromium } from "playwright";
import fs from "node:fs";

const OUT = "docs/live-exploration/po-revision-live-audit.json";
const result = {
  capturedAt: new Date().toISOString(),
  pages: [],
  poRevision: null,
  errors: [],
};

function summarizeOptions(el) {
  // For <select>: return option texts/values. For inputs: return attrs.
  const opts = [];
  el.querySelectorAll("option").forEach((o) => {
    opts.push({
      value: o.getAttribute("value"),
      text: (o.textContent || "").trim(),
      selected: o.hasAttribute("selected"),
    });
  });
  return opts;
}

function describeControl(el) {
  const tag = el.tagName.toLowerCase();
  const info = {
    tag,
    id: el.id || null,
    name: el.getAttribute("name") || null,
    type: el.getAttribute("type") || null,
    class: el.getAttribute("class") || null,
    style: (el.getAttribute("style") || "").slice(0, 120),
    value:
      tag === "select"
        ? undefined
        : el.value !== undefined
          ? String(el.value).slice(0, 200)
          : null,
    placeholder: el.getAttribute("placeholder") || null,
    readonly: el.hasAttribute("readonly") || el.readOnly === true || undefined,
    disabled: el.disabled === true || undefined,
    maxlength: el.getAttribute("maxlength") || undefined,
    onclick: el.getAttribute("onclick") || undefined,
    onchange: el.getAttribute("onchange") || undefined,
    onblur: el.getAttribute("onblur") || undefined,
    onfocus: el.getAttribute("onfocus") || undefined,
    onkeyup: el.getAttribute("onkeyup") || undefined,
    onkeydown: el.getAttribute("onkeydown") || undefined,
    title: el.getAttribute("title") || undefined,
  };
  if (tag === "select") {
    info.options = summarizeOptions(el);
    info.selectedTexts = Array.from(el.selectedOptions || []).map((o) =>
      (o.textContent || "").trim(),
    );
  }
  // label association
  let label = null;
  if (el.id) {
    const lab = el.ownerDocument.querySelector(
      `label[for="${CSS.escape(el.id)}"]`,
    );
    if (lab) label = (lab.textContent || "").trim();
  }
  if (!label) {
    const parent = el.closest("td,div,span");
    if (parent) {
      const t = (parent.textContent || "").trim().slice(0, 80);
      label = t || null;
    }
  }
  info.nearbyLabel = label;
  return info;
}

try {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const ctx = browser.contexts()[0];
  if (!ctx) throw new Error("No context found over CDP");

  for (const page of ctx.pages()) {
    result.pages.push({ url: page.url() });
  }

  // Find the authenticated eRetail page
  const page =
    ctx
      .pages()
      .find((p) => p.url().includes("demo.vineretail.com/eRetailWeb")) ||
    ctx.pages().find((p) => p.url().includes("vineretail.com"));
  if (!page) throw new Error("No authenticated vineretail page found");

  result.mainPageUrl = page.url();

  // List all frames
  result.frames = page.frames().map((f) => ({ name: f.name(), url: f.url() }));

  // Locate PO Revision frame by name or URL
  let frame =
    page.frames().find((f) => f.name() === "PORevision_IFrame") ||
    page.frames().find((f) => /poRevision/i.test(f.url()));
  if (!frame) {
    // Maybe nested inside another frame's document via iframe tags; check all frames' DOM for iframe#PORevision_IFrame
    for (const f of page.frames()) {
      try {
        const el = await f.$("#PORevision_IFrame");
        if (el) {
          const cf = await el.contentFrame();
          if (cf) {
            frame = cf;
            break;
          }
        }
      } catch {}
    }
  }
  if (!frame)
    throw new Error(
      "PORevision_IFrame not found among frames: " +
        JSON.stringify(result.frames),
    );

  result.poRevision = { frameName: frame.name(), frameUrl: frame.url() };

  // Dump full audit from inside the frame
  const audit = await frame.evaluate(() => {
    const doc = document;
    const out = {};

    // All forms
    out.forms = Array.from(doc.querySelectorAll("form")).map((f) => ({
      id: f.id || null,
      name: f.getAttribute("name") || null,
      action: f.getAttribute("action") || null,
      method: f.getAttribute("method") || null,
    }));

    // Search/filter area controls: inputs & selects visible in top part of the page
    const ctrls = Array.from(
      doc.querySelectorAll("input, select, textarea, button"),
    ).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    out.controls = ctrls.map((el) => {
      const tag = el.tagName.toLowerCase();
      const info = {
        tag,
        id: el.id || null,
        name: el.getAttribute("name") || null,
        type: el.getAttribute("type") || null,
        cls: (el.getAttribute("class") || "").slice(0, 100),
        value:
          tag === "select" ? undefined : String(el.value ?? "").slice(0, 120),
        placeholder: el.getAttribute("placeholder") || null,
        readonly: el.readOnly === true ? true : undefined,
        disabled: el.disabled === true ? true : undefined,
        onclick: el.getAttribute("onclick") || undefined,
        onchange: el.getAttribute("onchange") || undefined,
        onblur: el.getAttribute("onblur") || undefined,
        onfocus: el.getAttribute("onfocus") || undefined,
        onkeyup: el.getAttribute("onkeyup") || undefined,
        onkeydown: el.getAttribute("onkeydown") || undefined,
        title: el.getAttribute("title") || undefined,
      };
      if (tag === "select") {
        info.options = Array.from(el.options).map((o) => ({
          v: o.value,
          t: (o.textContent || "").trim(),
          sel: o.selected,
        }));
      }
      // nearby label text
      let label = null;
      if (el.id) {
        const lab = doc.querySelector(`label[for="${el.id}"]`);
        if (lab) label = (lab.textContent || "").trim();
      }
      if (!label) {
        const td = el.closest("td");
        if (td) {
          const prev = td.previousElementSibling;
          if (prev) label = (prev.textContent || "").trim().slice(0, 60);
          else label = (td.textContent || "").trim().slice(0, 60);
        }
      }
      info.label = label;
      return info;
    });

    // Buttons/links with onclick anywhere
    out.actionElements = Array.from(
      doc.querySelectorAll("[onclick], a[href='#'], button"),
    )
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        name: el.getAttribute("name") || null,
        text: (el.textContent || "").trim().slice(0, 60),
        onclick: el.getAttribute("onclick"),
        href: el.getAttribute("href") || undefined,
        cls: (el.getAttribute("class") || "").slice(0, 80),
        title: el.getAttribute("title") || undefined,
      }))
      .filter((e) => e.onclick || e.tag === "button" || e.text);

    // Grid tables: capture header rows of each table that looks like a jqGrid/grid
    out.tables = Array.from(doc.querySelectorAll("table"))
      .slice(0, 40)
      .map((t) => ({
        id: t.id || null,
        cls: (t.getAttribute("class") || "").slice(0, 100),
        headers: Array.from(
          t.querySelectorAll("tr:first-child th, tr:first-child td"),
        ).map((h) => ({
          id: h.id || null,
          text: (h.textContent || "").trim().slice(0, 60),
          colSpan: h.colSpan || undefined,
        })),
        rowCount: t.querySelectorAll("tbody tr").length,
      }));

    // jqGrid specifics if present
    out.jqGrid = (() => {
      const g = doc.querySelector(".ui-jqgrid");
      if (!g) return null;
      const gview = doc.querySelector(".gview_");
      const cap = doc.querySelector(".ui-jqgrid-title");
      const colNames =
        window.jQuery &&
        window.jQuery("#grid")?.jqGrid?.("getGridParam", "colNames");
      const colModel =
        window.jQuery &&
        window.jQuery("#grid")?.jqGrid?.("getGridParam", "colModel");
      return {
        title: cap ? cap.textContent.trim() : null,
        colNames: colNames || undefined,
        colModel: colModel
          ? colModel.map((c) => ({
              name: c.name,
              index: c.index,
              width: c.width,
              sortable: c.sortable,
              hidden: c.hidden,
              formatter:
                typeof c.formatter === "string" ? c.formatter : undefined,
            }))
          : undefined,
      };
    })();

    // Pager / pagination elements
    out.pager = Array.from(
      doc.querySelectorAll(
        "[class*='pager'] , [id*='pager'], [id*='pg_'], .ui-pg-table",
      ),
    ).map((p) => ({
      id: p.id || null,
      cls: (p.getAttribute("class") || "").slice(0, 80),
      text: (p.textContent || "").trim().slice(0, 200),
    }));

    // Page-size selects (rows per page)
    out.pageSizeSelects = Array.from(doc.querySelectorAll("select"))
      .filter((s) =>
        Array.from(s.options).some((o) => /^(20|50|100|200)$/.test(o.value)),
      )
      .map((s) => ({
        id: s.id || null,
        options: Array.from(s.options).map((o) => o.value),
      }));

    // Global JS functions relevant to search/reset
    out.globalFns = [
      "clickSearch",
      "resetPOAll",
      "resetAll",
      "doSearch",
      "searchData",
      "jsonPoRevisionSearch",
      "updateGridHeight",
    ].filter((fn) => typeof window[fn] === "function");

    // Hidden inputs (often carry request params)
    out.hiddenInputs = Array.from(
      doc.querySelectorAll("input[type='hidden']"),
    ).map((h) => ({
      id: h.id || null,
      name: h.getAttribute("name") || null,
      value: String(h.value ?? "").slice(0, 120),
    }));

    // Any inline scripts referencing endpoints
    out.scriptHints =
      Array.from(doc.querySelectorAll("script:not([src])"))
        .map((s) => s.textContent || "")
        .join("\n")
        .match(/(?:url\s*:\s*["'][^"']+["']|json[A-Za-z]+|\.action[^"'\s]*)/g)
        ?.slice(0, 80) || [];

    return out;
  });

  result.poRevision.audit = audit;

  fs.mkdirSync("docs/live-exploration", { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log("WROTE " + OUT);
} catch (err) {
  result.errors.push(String(err && err.stack ? err.stack : err));
  try {
    fs.mkdirSync("docs/live-exploration", { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
    console.log("WROTE_WITH_ERRORS " + OUT);
  } catch (e2) {
    console.log("FAILED_TO_WRITE " + String(e2));
  }
}
