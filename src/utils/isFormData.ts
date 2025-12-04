/**
 * 데이터가 FormData인지 검사합니다.
 * @param data 검사할 데이터
 * @returns FormData 여부
 */
export function isFormData(data: any): boolean {
  if (!data) return false;
  return typeof FormData !== "undefined" && data instanceof FormData;
}