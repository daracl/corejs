import { isSafeUrl } from "./dom";

/**
 * 내용까지 제거하는 태그 (스크립트 실행 / 외부 문서 / 입력 요소 / 스타일 전역 변경)
 */
const DROP_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
  'link',
  'meta',
  'base',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'option',
  'svg',
  'math',
  'template',
  'noscript',
  'title',
]);

/**
 * 허용 태그. 그 외 태그는 태그만 제거하고 내용(자식)은 유지한다.
 */
const ALLOWED_TAGS = new Set([
  'a',
  'abbr',
  'b',
  'blockquote',
  'br',
  'caption',
  'code',
  'col',
  'colgroup',
  'dd',
  'del',
  'div',
  'dl',
  'dt',
  'em',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'ins',
  'li',
  'mark',
  'ol',
  'p',
  'pre',
  's',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);

/**
 * 허용 속성 (on* 이벤트 속성 등 그 외 속성은 모두 제거한다)
 */
const ALLOWED_ATTRS = new Set([
  'class',
  'style',
  'title',
  'alt',
  'href',
  'src',
  'target',
  'width',
  'height',
  'colspan',
  'rowspan',
  'align',
  'valign',
  'dir',
  'lang',
]);

const URL_ATTRS = new Set(['href', 'src']);

/**
 * style 값에서 차단하는 패턴 (외부 리소스 로드 / 구형 브라우저 스크립트 실행)
 */
const UNSAFE_STYLE = /url\s*\(|expression\s*\(|javascript:|@import|behavior\s*:|-moz-binding|\\|\/\*/i;

function sanitizeElement(el: Element): void {
  Array.from(el.attributes).forEach((attr) => {
    const name = attr.name.toLowerCase();
    const value = attr.value;
    const keep =
      ALLOWED_ATTRS.has(name) &&
      (!URL_ATTRS.has(name) || isSafeUrl(value)) &&
      (name !== 'style' || !UNSAFE_STYLE.test(value)) &&
      (name !== 'target' || value === '_blank' || value === '_self');
    if (!keep) el.removeAttribute(attr.name);
  });
  if (el.tagName === 'A' && el.getAttribute('target') === '_blank') {
    el.setAttribute('rel', 'noopener noreferrer');
  }
}

function sanitizeChildren(parent: ParentNode): void {
  Array.from(parent.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) return;
    if (node.nodeType !== Node.ELEMENT_NODE) {
      // 주석 / processing instruction 등은 제거한다.
      node.parentNode?.removeChild(node);
      return;
    }
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (DROP_TAGS.has(tag)) {
      el.remove();
      return;
    }
    sanitizeChildren(el);
    if (ALLOWED_TAGS.has(tag)) {
      sanitizeElement(el);
    } else {
      // 허용하지 않는 태그는 태그만 벗기고 자식은 유지한다.
      el.replaceWith(...Array.from(el.childNodes));
    }
  });
}

/**
 * html 문자열을 허용 목록(태그 / 속성) 기준으로 정리한 DocumentFragment 를 반환한다.
 *
 * 리포트 JSON 은 외부에서 불러올 수 있으므로 html 컴포넌트는 반드시 이 함수를 거쳐 표시한다.
 * - script / style / iframe / form 등은 내용까지 제거
 * - on* 이벤트 속성, javascript: 등 위험한 url, url() 이 들어간 style 제거
 * - template 으로 파싱하므로 파싱 중에는 스크립트 실행 / 이미지 로드가 일어나지 않는다.
 *
 * @param html html 문자열
 */
export function sanitizeHtml(html: string): DocumentFragment {
  const template = document.createElement('template');
  template.innerHTML = html;
  const fragment = template.content;
  sanitizeChildren(fragment);
  // template.content 는 inert 문서 소속이므로 현재 문서로 가져온다.
  return document.importNode(fragment, true);
}
