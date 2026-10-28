import { formatMessage } from "@/common/message/message-utils";


describe("formatMessage", () => {
  it("일반 치환", () => {
    expect(formatMessage("Hello {name}", { name: "Alice" })).toBe("Hello Alice");
  });

  it("앞에 $가 있으면 치환 안됨", () => {
    expect(formatMessage("Hello ${name}", { name: "Alice" })).toBe("Hello ${name}");
  });

  it("앞에 \\가 있으면 치환 안됨", () => {
    expect(formatMessage("Hello \\{name}", { name: "Alice" })).toBe("Hello \\{name}");
  });

  it("없는 키는 그대로 유지", () => {
    expect(formatMessage("Hello {unknown}", {})).toBe("Hello {unknown}");
  });

  it("파라미터를 생략하면 원문 유지", () => {
    expect(formatMessage("Hello {name}")).toBe("Hello {name}");
    expect(formatMessage("Hello {name}", undefined)).toBe("Hello {name}");
  });

  it("점과 밑줄, 숫자가 포함된 키 치환", () => {
    expect(formatMessage("{user.name}/{user_id}/{0}", {
      "user.name": "Alice",
      user_id: 10,
      "0": "first"
    })).toBe("Alice/10/first");
  });

  it("인접한 토큰과 이스케이프된 토큰을 독립적으로 처리", () => {
    expect(formatMessage("{name}{name} ${name}{name} \\{name}{name}", {
      name: "A"
    })).toBe("AA ${name}A \\{name}A");
  });

  it("원문의 바로 앞 문자를 기준으로 이스케이프 판단", () => {
    expect(formatMessage("{dollar}{name}{slash}{name}", {
      dollar: "$",
      slash: "\\",
      name: "Alice"
    })).toBe("$Alice\\Alice");
  });

  it("문자열 이외의 값도 기존처럼 문자열로 변환", () => {
    expect(formatMessage("{zero}/{flag}/{nil}/{missing}", {
      zero: 0,
      flag: false,
      nil: null,
      missing: undefined
    })).toBe("0/false/null/undefined");
  });

  it("기존처럼 상속받은 키도 치환", () => {
    const params = Object.create({ name: "Alice" });
    expect(formatMessage("{name}", params)).toBe("Alice");
  });

  it("치환 값의 특수 문자를 그대로 유지하고 다시 치환하지 않음", () => {
    expect(formatMessage("{value}", {
      value: "$&{name}",
      name: "Alice"
    })).toBe("$&{name}");
  });
});

