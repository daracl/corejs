export interface Position {
  x: number;
  y: number;
}

/**
 * event stopPropagation and preventDefault
 *
 * @param e event
 */
export function stopPreventCancel (e: Event): void {
  e.preventDefault();
  e.stopPropagation();
};


/**
 * event position
 *
 * @param e event
 * @returns
 */
export function eventPosition (e: Event): Position {
  let evt;
  if (typeof TouchEvent !== "undefined" && e instanceof TouchEvent && e.touches.length > 0) {
    evt = e.touches[0];
  } else if (e instanceof MouseEvent) {
    evt = e;
  } else {
    evt = { pageX: 0, pageY: 0 };
  }
  return {
    x: evt.pageX,
    y: evt.pageY,
  };
};

/**
 * 클릭 이벤트가 유효한 '왼쪽 클릭(mouse)' 또는 '터치(touch)'인지 확인하는 유틸 함수
 *
 * @param e MouseEvent 또는 TouchEvent 객체
 * @returns true: 왼쪽 클릭 또는 터치 / false: 오른쪽 클릭, 휠 클릭 등 무시해야 할 경우
 */
export function isClickEvent(e: Event): boolean {
  // 모바일 터치 이벤트인 경우 항상 클릭으로 간주 (버튼 없음)
  if (e.type === "touchstart") {
    return true;
  }

  // 마우스 이벤트인 경우
  if (e instanceof MouseEvent) {
    // 왼쪽 버튼 클릭인지 확인 (button === 0)
    return e.button === 0;
  }

  // 그 외의 경우 (안전 장치)
  return false;
}
