/**
 * 문자열 메시지 포맷 변환
 * 
 * - "{key}" 형태는 msgParam[key] 값으로 치환
 * - 단, "{key}" 앞에 "$" 또는 "\"가 있으면 치환하지 않고 그대로 유지
 * 
 * @param msgFormat 포맷 문자열
 * @param msgParam 치환할 값이 담긴 객체. 생략하면 원문을 반환합니다.
 * @returns 치환된 문자열
 */
export function formatMessage(
  msgFormat: string,
  msgParam?: Record<string, unknown>
): string {
  if (!msgParam) return msgFormat;

  return msgFormat.replace(/\{([A-Za-z0-9_.]+)\}/g, (match, key: string, offset: number) => {
    const previous = msgFormat[offset - 1];
    if (previous === "$" || previous === "\\") return match;

    // 사용자가 지정한 상속 속성은 기존처럼 치환하되, Object.prototype 의 기본 속성(constructor, toString 등)은 치환하지 않는다
    const inherited = key in msgParam && Object.prototype.hasOwnProperty.call(Object.prototype, key) && !Object.prototype.hasOwnProperty.call(msgParam, key) && (msgParam as any)[key] === (Object.prototype as any)[key];
    return key in msgParam && !inherited ? String(msgParam[key]) : match;
  });
}
