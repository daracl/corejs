import { isPlainObject } from "./isPlainObject";
import { isArray } from "./isArray";
import { isFunction } from "./isFunction";
import { isString } from "./isString";
import { hasProperty } from "./hasProperty";

export type ErrorFactory = (message: string) => Error;
export type FunctionRegistry = Record<string, (...args: never[]) => unknown>;
export const FUNCTION_REF_PREFIX = "@fn:";

/** 컴포넌트 접두사를 붙이는 Error 생성 함수를 반환합니다. */
export function createErrorFactory(prefix: string): ErrorFactory {
  return message => new Error(`${prefix} ${message}`);
}

/** JSON 구문 오류를 지정한 Error 생성 함수로 전달합니다. */
export function parseJson(json: string, createError: ErrorFactory = message => new Error(message)): unknown {
  try { return JSON.parse(json); }
  catch (error) { throw createError(`invalid JSON : ${(error as Error).message}`); }
}

function walkConfig(value: unknown, visitor: (node: unknown, path: string) => { handled: boolean; value?: unknown }, startPath = ""): unknown {
  const active = new WeakSet<object>();
  const walk = (node: unknown, path: string): unknown => {
    const result = visitor(node, path);
    if (result.handled) return result.value;
    if (!isArray(node) && !isPlainObject(node)) return node;
    if (active.has(node as object)) throw new TypeError(`Cyclic config: ${path}`);
    active.add(node as object);
    try {
      if (isArray(node)) return node.map((item, index) => walk(item, `${path}[${index}]`));
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(node as object)) {
        const next = walk(value, path ? `${path}.${key}` : key);
        if (next !== undefined) Object.defineProperty(out, key, { value: next, enumerable: true, configurable: true, writable: true });
      }
      return out;
    } finally { active.delete(node as object); }
  };
  return walk(value, startPath);
}

/** 등록된 함수는 @fn:이름으로 저장하고 제외된 함수 경로도 반환합니다. */
export function stringifyWithFunctions(value: unknown, functions: FunctionRegistry = {}): { json: string | undefined; omitted: string[] } {
  const names = new Map<unknown, string>(Object.entries(functions).map(([name, fn]) => [fn, name]));
  const omitted: string[] = [];
  const converted = walkConfig(value, (node, path) => {
    if (!isFunction(node)) return { handled: false };
    const name = names.get(node);
    if (name !== undefined) return { handled: true, value: `${FUNCTION_REF_PREFIX}${name}` };
    omitted.push(path);
    return { handled: true, value: undefined };
  });
  return { json: JSON.stringify(converted, null, 2), omitted };
}

/** @fn: 참조를 등록된 함수로 복원하며 상속된 함수 이름은 허용하지 않습니다. */
export function restoreFunctions<T>(value: unknown, functions: FunctionRegistry = {}, createError: ErrorFactory = message => new Error(message), path = ""): T {
  return walkConfig(value, (node, at) => {
    if (!isString(node) || !node.startsWith(FUNCTION_REF_PREFIX)) return { handled: false };
    const name = node.slice(FUNCTION_REF_PREFIX.length);
    if (!hasProperty(functions, name) || !isFunction(functions[name])) throw createError(`${at || "value"} : function "${name}" is not registered`);
    return { handled: true, value: functions[name] };
  }, path) as T;
}

/** 객체 설정 JSON을 해석하고 함수 참조를 복원합니다. */
export function parseConfigJson<T>(json: string, functions: FunctionRegistry = {}, createError: ErrorFactory = message => new Error(message)): T {
  const config = restoreFunctions<unknown>(parseJson(json, createError), functions, createError);
  if (!isPlainObject(config)) throw createError("config JSON must be an object");
  return config as T;
}

/** 선택한 텍스트 파일을 문자열로 읽습니다. */
export function readTextFile(file: Blob): Promise<string> { return file.text(); }
