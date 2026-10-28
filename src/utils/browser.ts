/** 클립보드 기록을 시도하고 실패 시 임시 textarea로 대체합니다. */
export async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* 브라우저 권한 거부 시 대체 경로를 사용합니다. */ }
  if (typeof document === "undefined" || !document.body || !document.execCommand) return false;
  const active = document.activeElement;
  const textarea = createHTMLElement("textarea", undefined, { style: { position: "fixed", top: "-9999px", left: "-9999px" } });
  textarea.value = text;
  document.body.appendChild(textarea);
  try { textarea.select(); return document.execCommand("copy"); }
  catch { return false; }
  finally { textarea.remove(); (active as HTMLElement | null)?.focus?.(); }
}

/** URL을 다운로드합니다. 전달한 URL의 신뢰 여부는 호출자가 확인합니다. */
export function downloadUrl(url: string, fileName: string): void {
  const link = createHTMLElement("a", undefined, { href: url, download: fileName, style: { display: "none" } });
  document.body.appendChild(link);
  try { link.click(); } finally { link.remove(); }
}

/** 텍스트를 파일로 다운로드하고 임시 object URL을 해제합니다. 인자 순서는 fileName, text입니다. */
export function downloadText(fileName: string, text: string, type = "application/json"): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  try { downloadUrl(url, fileName); } finally { setTimeout(() => URL.revokeObjectURL(url), 0); }
}

/** SVG 문자열을 data URL로 변환합니다. */
export function svgToDataURL(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** 원본을 변경하지 않고 xmlns가 포함된 SVG 문자열을 반환합니다. */
export function serializeSvg(svg: SVGElement): string {
  const clone = svg.cloneNode(true) as SVGElement;
  if (!clone.getAttribute("xmlns")) clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return new XMLSerializer().serializeToString(clone);
}
import { createHTMLElement } from "./dom";

