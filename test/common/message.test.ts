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
});

