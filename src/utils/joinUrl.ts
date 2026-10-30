const ABSOLUTE_URL = /^([a-z][a-z\d+\-.]*:)?\/\//i;

/**
 * baseUrl 과 url 을 슬래시가 겹치거나 빠지지 않게 합친다.
 * 절대 URL(http://, //) 은 baseUrl 을 붙이지 않고, 쿼리(?)/해시(#) 로 시작하는 url 은 그대로 이어 붙인다.
 *
 * @param {string | undefined} baseUrl
 * @param {string} url
 * @returns {string}
 */
export function joinUrl(baseUrl: string | undefined, url: string): string {
  if (!baseUrl || ABSOLUTE_URL.test(url)) return url;
  if (!url) return baseUrl;
  if (url[0] === "?" || url[0] === "#") return baseUrl + url;
  return `${baseUrl.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`;
}
