
export function eqAttributeValue(element: HTMLElement, attr: string, value: string) {
  return element.getAttribute(attr) == value;
}

/**
 * add attribute
 * @param attrs element attribute object
 * @returns DaraElement
 */
export function addAttr(el: HTMLElement, attrs: any) {
  for (let key in attrs) {
    el.setAttribute(key, attrs[key]);
  }
}

/**
 * remove html element attribute
 *
 * @param {HTMLElement} el element
 * @param {...string[]} attrKey attribute key
 */
export function removeAttr(element: HTMLElement | NodeList, ...attrKey: string[]) {
  let elements;
  if (element instanceof HTMLElement) {
    elements = [element];
  } else {
    elements = element;
  }

  elements.forEach((ele) => {
    for (let attr of attrKey) {
      (ele as HTMLElement).removeAttribute(attr);
    }
  });
}
