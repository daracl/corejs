/**
 * uuid
 *
 * @param {boolean} dash Remove Flag
 * @returns {String}
 */
export function uuid(dashRemoveFlag: boolean | undefined = true): string {
  let d = new Date().getTime();

  const reval = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);

    return (c === "x" ? r : (r & 0x7) | 0x8).toString(16);
  });

  return dashRemoveFlag ? reval.replace(/-/g, "") : reval;
}
