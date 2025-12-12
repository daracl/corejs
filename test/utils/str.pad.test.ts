import { leftPad, rightPad, leftPadClamp, rightPadClamp }from "../../src/utils/str";

describe('String Padding Functions Test (Modified Clamp Logic)', () => {

  // --- leftPad 테스트 (채우기 기능) ---
  describe('leftPad (No Clamp)', () => {
      const len = 5;

      it('1. 길이가 짧은 문자열을 왼쪽에 기본 문자(0)로 채운다.', () => {
          // '123' (len 3) -> '00123' (len 5)
          expect(leftPad('123', len)).toBe('00123');
      });

      it('2. 길이가 같은 문자열은 그대로 반환한다.', () => {
          expect(leftPad('12345', len)).toBe('12345');
      });

      it('3. 길이가 긴 문자열은 그대로 반환한다. (Clamp: false)', () => {
          // '1234567' (len 7) -> '1234567' (len 7)
          expect(leftPad('1234567', len)).toBe('1234567');
      });

      it('4. 다른 문자(*)로 왼쪽에 채운다.', () => {
          expect(leftPad('ABC', 6, '*')).toBe('***ABC');
      });

      it('5. 숫자(number)를 입력하면 문자열로 변환하여 채운다.', () => {
          expect(leftPad(98, 4)).toBe('0098');
      });
  });

  // --- rightPad 테스트 (채우기 기능) ---
  describe('rightPad (No Clamp)', () => {
      const len = 5;

      it('1. 길이가 짧은 문자열을 오른쪽에 기본 문자(0)로 채운다.', () => {
          // '123' (len 3) -> '12300' (len 5)
          expect(rightPad('123', len)).toBe('12300');
      });

      it('2. 길이가 같은 문자열은 그대로 반환한다.', () => {
          expect(rightPad('12345', len)).toBe('12345');
      });

      it('3. 길이가 긴 문자열은 그대로 반환한다. (Clamp: false)', () => {
          expect(rightPad('1234567', len)).toBe('1234567');
      });

      it('4. 다른 문자(#)로 오른쪽에 채운다.', () => {
          expect(rightPad('ABC', 6, '#')).toBe('ABC###');
      });
  });

  // --- leftPadClamp 테스트 (왼쪽 채우기 + 길이 고정) ---
  describe('leftPadClamp (Left Padding + Clamp)', () => {
      const len = 6;
      const fillChar = 'X';

      it('1. 길이가 짧은 문자열을 왼쪽에 채운다.', () => {
          // '123' (len 3) -> 'XXX123' (len 6)
          expect(leftPadClamp('123', len, fillChar)).toBe('XXX123');
      });

      it('2. 길이가 같은 문자열은 그대로 반환한다.', () => {
          expect(leftPadClamp('ABCDEF', len, fillChar)).toBe('ABCDEF');
      });

      it('3. 길이가 긴 문자열을 왼쪽 기준으로 잘라 길이를 고정한다.', () => {
          // '12345678' (len 8) -> 앞에서 6자리만: '123456' (len 6)
          expect(leftPadClamp('12345678', len, fillChar)).toBe('123456');
      });
      
      it('4. 아주 긴 문자열도 지정된 길이로 잘라낸다.', () => {
          // 'Hello World' (len 11) -> 앞에서 5자리만: 'Hello' (len 5)
          expect(leftPadClamp('Hello World', 5, '0')).toBe('Hello');
      });
  });

  // --- rightPadClamp 테스트 (오른쪽 채우기 + 길이 고정) ---
  describe('rightPadClamp (Right Padding + Clamp)', () => {
      const len = 5;
      const fillChar = 'Z';

      it('1. 길이가 짧은 문자열을 오른쪽에 채운다.', () => {
          // 'A' (len 1) -> 'AZZZZ' (len 5)
          expect(rightPadClamp('A', len, fillChar)).toBe('AZZZZ');
      });

      it('2. 길이가 같은 문자열은 그대로 반환한다.', () => {
          expect(rightPadClamp('12345', len, fillChar)).toBe('12345');
      });

      it('3. 길이가 긴 문자열을 왼쪽 기준으로 잘라 길이를 고정한다.', () => {
          // 'ABCDEFG' (len 7) -> 앞에서 5자리만: 'ABCDE' (len 5)
          expect(rightPadClamp('ABCDEFG', len, fillChar)).toBe('ABCDE');
      });
      
      it('4. 숫자 0을 포함하여 테스트', () => {
          // 1234567 (len 7) -> 앞에서 4자리만: '1234' (len 4)
          expect(rightPadClamp(1234567, 4, '0')).toBe('1234');
      });
  });
});