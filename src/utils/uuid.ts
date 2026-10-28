/**
 * UUID v4를 생성합니다. 기본값은 하이픈 없는 32자리입니다.
 *
 * @param dashRemoveFlag false이면 하이픈을 포함한 36자리를 반환합니다.
 * @returns UUID 문자열
 */
export function uuid(dashRemoveFlag: boolean | undefined = true): string {
  const value = createUuid();
  return dashRemoveFlag ? value : value.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
}

/** 하이픈 없는 UUID v4를 생성합니다. crypto 미지원 환경에서는 Math.random을 사용합니다. */
export function createUuid(): string {
  const cryptoObj = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") return cryptoObj.randomUUID().replace(/-/g, "");

  const bytes = new Uint8Array(16);
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index++) bytes[index] = Math.floor(Math.random() * 256);
  }
  // version 4와 variant 10xx 비트를 고정합니다.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}
