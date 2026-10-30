
/**
 * keyboard event key
 *
 * @export
 * @param {KeyboardEvent} e  keyboard event
 * @returns {string} key
 */
export function keyboardEventKey(e: KeyboardEvent): string {
  return (e.key || "").toLowerCase();
}

/**
 * event key code
 * @param e Event
 * @returns
 */
export function eventKeyCode (e: Event): number | undefined {
  const evt = e as KeyboardEvent & { keyCode?: number; which?: number };

  if (typeof evt.keyCode === "number" && evt.keyCode > 0) {
    return evt.keyCode;
  }

  if (typeof evt.which === "number" && evt.which > 0) {
    return evt.which;
  }

  return undefined;
};


/**
 * shift key check
 *
 * @param {Event} evt event
 * @returns {boolean}
 */
export function isShiftKey(evt: Event): boolean {
  // 키보드·마우스가 아닌 이벤트에는 shiftKey 가 없으므로 항상 boolean 으로 반환한다
  return !!(evt as KeyboardEvent).shiftKey;
}

/**
 * ctrl key check
 *
 * @param {Event} evt event
 * @returns {boolean}
 */
export function isCtrlKey(evt: Event): boolean {
  return !!(evt as KeyboardEvent).ctrlKey;
}

/**
 * spacebar check
 *
 * @param {Event} evt event
 * @returns {boolean}
 */
export function isSpacebar(evt: Event): boolean {
  const event = evt as KeyboardEvent;

  if (event.key === " " || event.code === "Space") {
    return true;
  }
  return false;
}

/**
 * enter key check
 *
 * @param {Event} evt event
 * @returns {boolean}
 */
export function isEnter(evt: Event): boolean {
  const event = evt as KeyboardEvent;

  if (event.key === "Enter" || event.code === "Enter") {
    return true;
  }
  return false;
}