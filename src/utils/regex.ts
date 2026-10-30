/** 정규식 특수문자를 이스케이프해 리터럴로 검색할 수 있게 합니다. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 제한 없는 반복(*, +, {n,})이 이 개수를 넘으면 역추적 비용이 크게 늘어나 위험하게 봅니다. */
const MAX_UNBOUNDED_QUANTIFIERS = 3;

const UNBOUNDED_BRACE = /^\{\d+,\d*\}/;

/**
 * 제한 없는 반복이 1개 이하이면 일치 실패 시에도 비용이 텍스트 길이의 제곱, 2개면 세제곱, 3개면 네제곱으로 늘어납니다.
 * 반복 개수별로 정규식을 적용해도 1초 안에 끝나는 텍스트 길이 상한입니다.
 */
const TEXT_LENGTH_LIMITS = [10000, 10000, 1000, 200];

/**
 * 정규식 소스를 검사해 정규식 검색을 적용할 수 있는 텍스트 길이 상한을 반환합니다.
 * 위험한 정규식(isRiskyRegex)이면 0 입니다. 호출자는 이보다 긴 텍스트는 리터럴로 검색해야 합니다.
 *
 * @param pattern 검사할 정규식 소스
 * @returns 정규식을 적용할 수 있는 최대 텍스트 길이
 */
export function maxRegexTextLength(pattern: string): number {
  const { risky, unbounded } = analyzeRegex(pattern);
  return risky ? 0 : TEXT_LENGTH_LIMITS[unbounded];
}

export function isRiskyRegex(pattern: string): boolean {
  return analyzeRegex(pattern).risky;
}

function analyzeRegex(pattern: string): { risky: boolean; unbounded: number } {
  let unbounded = 0;
  let inClass = false;
  const groups: { inner: boolean }[] = [];
  const markInner = () => {
    if (groups.length) groups[groups.length - 1].inner = true;
  };

  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index];
    if (char === "\\") {
      if (/[1-9k]/.test(pattern[index + 1] ?? "")) return { risky: true, unbounded };
      index++;
      continue;
    }
    if (inClass) {
      if (char === "]") inClass = false;
      continue;
    }
    if (char === "[") {
      inClass = true;
      continue;
    }
    if (char === "(") {
      groups.push({ inner: false });
      continue;
    }
    if (char === "|") {
      markInner();
      continue;
    }
    if (char === ")") {
      const group = groups.pop();
      const rest = pattern.slice(index + 1);
      const quantified = rest[0] === "*" || rest[0] === "+" || UNBOUNDED_BRACE.test(rest);
      if (group) {
        if (quantified && group.inner) return { risky: true, unbounded };
        if (quantified || group.inner) markInner();
      }
      continue;
    }
    if (char === "*" || char === "+") {
      unbounded++;
      markInner();
      continue;
    }
    if (char === "{") {
      const match = UNBOUNDED_BRACE.exec(pattern.slice(index));
      if (match) {
        unbounded++;
        markInner();
        index += match[0].length - 1;
      }
    }
  }
  return { risky: unbounded > MAX_UNBOUNDED_QUANTIFIERS, unbounded };
}
