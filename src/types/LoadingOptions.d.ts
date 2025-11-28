export interface LoadingOptions {
  /**
   * 사라지는 시간(밀리초).
   * 지정하지 않으면 자동으로 사라지지 않습니다.
   *
   * @type {number|undefined}
   */
  timeout?: number;

  /**
   * 시간 표시 여부. true이면 시간(또는 남은 시간)을 표시합니다.
   *
   * @type {boolean|undefined}
   */
  enableTime?: boolean;

  /**
   * 표시할 텍스트 내용.
   *
   * @type {string|undefined}
   */
  content?: string;

  /**
   * 배경 색상(CSS color 문자열).
   *
   * @type {string|undefined}
   */
  bgColor?: string;

  /**
   * z-index 값으로 레이어 우선순위를 지정합니다.
   *
   * @type {number|undefined}
   */
  zIndex?: number;

  /**
   * 불투명도(opacity) 값(CSS 문자열 또는 숫자 형식).
   *
   * @type {string|undefined}
   */
  opacity?: string;

  /**
   * 로딩 이미지 경로 또는 base64 데이터 문자열.
   *
   * @type {string|undefined}
   */
  loadingImg?: string;

  /**
   * 마우스 커서 스타일(CSS cursor 값).
   *
   * @type {string|undefined}
   */
  cursor?: string;

  /**
   * 취소 버튼 표시 여부.
   *
   * @type {boolean|undefined}
   */
  enableCancelButton?: boolean;

  /**
   * 취소 또는 완료 시 호출되는 콜백 함수.
   * 콜백에 현재 옵션 객체를 전달하며, boolean을 반환하면 내부 동작을 제어할 수 있습니다.
   *
   * @param {LoadingOptions} param - 호출 시 전달되는 현재 옵션 객체
   * @returns {boolean|void} - true/false를 반환하거나 아무 것도 반환하지 않을 수 있습니다.
   */
  callback?: (param: LoadingOptions) => boolean | void;
}