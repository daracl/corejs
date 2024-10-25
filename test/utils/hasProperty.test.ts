import { hasProperty } from "../../src/utils/hasProperty";

describe("hasProperty", () => {
  const person = {
    name: "daracl",
    age: 30,
    hobbies: ["reading", "traveling"],
  };

  it("name check", () => {
    expect(true).toBe(hasProperty(person, "name"));
  });

  it("age  check", () => {
    expect(true).toBe(hasProperty(person, "age"));
  });

  it("hobbies check", () => {
    expect(false).toBe(hasProperty(person, "address"));
  });

  it("address check", () => {
    expect(false).toBe(hasProperty(person, "address"));
  });

  it("null object check", () => {
    expect(false).toBe(hasProperty(null, "name"));
  });

  it("null object check", () => {
    expect(false).toBe(hasProperty(undefined, "name"));
  });
});
