import { getURLParams, getURLParam } from "../../src/utils/getURLParams";

describe('URL Parameter Utilities Test', () => {

    // 테스트에 사용할 기준 URL
    const BASE_URL = "https://example.com";
    const TEST_URL = "https://test.site/path?id=100&q=hello+world&id=200&flag=true&lang=ko-KR&empty=";
    const EMPTY_PARAM_URL = "https://test.site/another/path";
    const ENCODED_URL = "https://data.api/?data=%ED%95%9C%EA%B8%80%20%ED%85%8C%EC%8A%A4%ED%8A%B8&space=a%26b";

    // --- getURLParams 테스트 ---
    describe('getURLParams', () => {
        it('1. 일반적인 URL에서 모든 파라미터를 배열 형태로 정확히 추출해야 한다.', () => {
            const params = getURLParams(TEST_URL);
            expect(params).toEqual({
                id: ["100", "200"],
                q: ["hello world"], // URLSearchParams는 '+'를 공백으로 디코딩함
                flag: ["true"],
                lang: ["ko-KR"],
                empty: [""], // 값이 빈 문자열인 파라미터 처리
            });
        });

        it('2. 파라미터가 없는 URL을 처리해야 한다.', () => {
            const params = getURLParams(EMPTY_PARAM_URL);
            expect(params).toEqual({});
        });

        it('3. 특수 문자 및 한글이 포함된 URL 파라미터를 정확히 디코딩해야 한다.', () => {
            const params = getURLParams(ENCODED_URL);
            expect(params).toEqual({
                data: ["한글 테스트"],
                space: ["a&b"], // %26가 '&'로 디코딩됨
            });
        });

        it('4. 기본 URL만 주어졌을 때 빈 객체를 반환해야 한다.', () => {
            const params = getURLParams(BASE_URL);
            expect(params).toEqual({});
        });
    });

    // --- getURLParam 테스트 ---
    describe('getURLParam', () => {
        it('1. 존재하는 파라미터의 첫 번째 값을 정확히 반환해야 한다.', () => {
            expect(getURLParam(TEST_URL, 'q')).toBe('hello world');
        });

        it('2. 동일한 이름의 파라미터가 여러 개일 경우 첫 번째 값만 반환해야 한다.', () => {
            // id=100&id=200 에서 첫 번째 값인 100을 반환해야 함
            expect(getURLParam(TEST_URL, 'id')).toBe('100');
        });

        it('3. 존재하지 않는 파라미터에 대해 null을 반환해야 한다.', () => {
            expect(getURLParam(TEST_URL, 'nonexistent')).toBeNull();
        });

        it('4. 값이 없는 파라미터(예: &empty=)에 대해 빈 문자열("")을 반환해야 한다.', () => {
            expect(getURLParam(TEST_URL, 'empty')).toBe('');
        });

        it('5. 인코딩된 파라미터 값을 정확히 디코딩하여 반환해야 한다.', () => {
            expect(getURLParam(ENCODED_URL, 'data')).toBe('한글 테스트');
        });

        it('6. 쿼리 파라미터가 없는 URL에 대해 null을 반환해야 한다.', () => {
            expect(getURLParam(EMPTY_PARAM_URL, 'test')).toBeNull();
        });
    });
});