import { AjaxOptions, GlobalAjaxOptions } from "@t/web/AjaxOptions";
import { isArray, isFormData, isObject, objectToQueryString } from "@/utils";

/**
 * Ajax 클래스
 */
export abstract class AjaxAbstract {
  protected options: GlobalAjaxOptions;

  constructor(options: GlobalAjaxOptions) {
    this.options = options;
  }

  public abstract request(url: string, method: string, opts: AjaxOptions): Promise<any>;

  // 객체 내부에 File/Blob/FileList가 있는지 재귀 검사
  protected containsFile(data: any): boolean {
    if (!data) return false;
    if (typeof File !== "undefined" && (data instanceof File || data instanceof Blob)) return true;
    if (typeof FileList !== "undefined" && data instanceof FileList) return true;
    if (isArray(data)) {
      for (const item of data) {
        if (this.containsFile(item)) return true;
      }
      return false;
    }
    if (isObject(data)) {
      for (const key of Object.keys(data)) {
        if (this.containsFile((data as any)[key])) return true;
      }
    }
    return false;
  }

  // GET용: URL에 데이터를 쿼리 스트링으로 추가합니다.
  protected getUrlWithData(url: string, method:string, data: any): string {
    if (method !== "GET") return url;
    if (!data) return url;
    if (isFormData(data)) return url;
    const qs = objectToQueryString(data);
    return url + (url.includes("?") ? "&" : "?") + qs;
  }

  // 단순 객체(파일 포함 가능)를 FormData로 변환
  protected buildFormDataFromObject(obj: any): FormData {
    const form = new FormData();

    const appendValue = (key: string, value: any) => {
      if (value === null || value === undefined) {
        return;
      }
      if (typeof File !== "undefined" && (value instanceof File || value instanceof Blob)) {
        form.append(key, value);
        return;
      }
      if (typeof FileList !== "undefined" && value instanceof FileList) {
        for (let i = 0; i < value.length; i++) {
          form.append(key + (key.endsWith("[]") ? "" : "[]"), value[i]);
        }
        return;
      }
      if (Array.isArray(value)) {
        for (const v of value) {
          if (typeof File !== "undefined" && (v instanceof File || v instanceof Blob)) {
            form.append(key + (key.endsWith("[]") ? "" : "[]"), v);
          } else {
            form.append(key + (key.endsWith("[]") ? "" : "[]"), typeof v === "object" ? JSON.stringify(v) : String(v));
          }
        }
        return;
      }
      if (isObject(value)) {
        // 객체일 경우 JSON.stringify로 직렬화
        form.append(key, JSON.stringify(value));
        return;
      }
      form.append(key, String(value));
    };

    if (isObject(obj)) {
      for (const k of Object.keys(obj)) {
        appendValue(k, (obj as any)[k]);
      }
    } else {
      // 비객체 (예: 단일 File 등)
      appendValue("file", obj);
    }

    return form;
  }
  
}
