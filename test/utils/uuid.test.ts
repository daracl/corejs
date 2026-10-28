import { createUuid, uuid } from "../../src/utils/uuid";

const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, "crypto");
const nativeValue = "123e4567-e89b-42d3-a456-426614174000";
const compactValue = nativeValue.replace(/-/g, "");
const compactPattern = /^[0-9a-f]{12}4[0-9a-f]{3}[89ab][0-9a-f]{15}$/;

function setCrypto(value: unknown): void {
  Object.defineProperty(globalThis, "crypto", { configurable: true, value });
}

afterEach(() => {
  jest.restoreAllMocks();
  if (originalCrypto) Object.defineProperty(globalThis, "crypto", originalCrypto);
  else Reflect.deleteProperty(globalThis, "crypto");
});

describe("UUID 생성과 기존 API 호환성", () => {
  it("네이티브 randomUUID를 우선 사용하고 crypto의 this를 유지한다", () => {
    const crypto = { randomUUID: jest.fn(() => nativeValue), getRandomValues: jest.fn() };
    setCrypto(crypto);
    const random = jest.spyOn(Math, "random");
    expect(createUuid()).toBe(compactValue);
    expect(crypto.randomUUID.mock.contexts[0]).toBe(crypto);
    expect(crypto.getRandomValues).not.toHaveBeenCalled();
    expect(random).not.toHaveBeenCalled();
  });

  it.each([undefined, true, false])("uuid(%s)의 기존 하이픈 옵션을 유지한다", flag => {
    setCrypto({ randomUUID: () => nativeValue });
    expect(uuid(flag)).toBe(flag === false ? nativeValue : compactValue);
  });

  it.each([0, 255])("getRandomValues의 %s 바이트에 버전·variant를 적용한다", value => {
    const getRandomValues = jest.fn((bytes: Uint8Array) => bytes.fill(value));
    setCrypto({ getRandomValues });
    const random = jest.spyOn(Math, "random");
    const result = uuid(false);
    expect(result).toBe(value === 0 ? "00000000-0000-4000-8000-000000000000" : "ffffffff-ffff-4fff-bfff-ffffffffffff");
    expect(getRandomValues).toHaveBeenCalledTimes(1);
    expect(random).not.toHaveBeenCalled();
  });

  it.each([undefined, {}])("crypto API가 없으면 난수 fallback으로 16바이트를 채운다: %p", crypto => {
    setCrypto(crypto);
    const random = jest.spyOn(Math, "random").mockReturnValue(0);
    const result = createUuid();
    expect(result).toBe("00000000000040008000000000000000");
    expect(result).toMatch(compactPattern);
    expect(random).toHaveBeenCalledTimes(16);
  });

  it("난수 상한에서도 variant가 8~b 범위를 유지한다", () => {
    setCrypto(undefined);
    jest.spyOn(Math, "random").mockReturnValue(1 - Number.EPSILON);
    expect(createUuid()).toBe("ffffffffffff4fffbfffffffffffffff");
  });

  it("네이티브 API 오류를 약한 난수로 숨기지 않고 전달한다", () => {
    const error = new Error("crypto failure");
    const getRandomValues = jest.fn();
    setCrypto({ randomUUID: () => { throw error; }, getRandomValues });
    expect(() => uuid()).toThrow(error);
    expect(getRandomValues).not.toHaveBeenCalled();
  });
});
