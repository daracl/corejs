export interface DebouncedFunction<Args extends unknown[], Context> {
  (this: Context, ...args: Args): void;
  cancel(): void;
}

/** 호출을 지연하고 마지막 인자·this를 보존합니다. cancel로 타이머를 정리합니다. */
export function debounce<Args extends unknown[], Context>(callback: (this: Context, ...args: Args) => void, delay: number): DebouncedFunction<Args, Context> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => { clearTimeout(timer); timer = undefined; };
  const debounced = function(this: Context, ...args: Args): void {
    cancel();
    if (delay < 1) { callback.apply(this, args); return; }
    timer = setTimeout(() => { timer = undefined; callback.apply(this, args); }, delay);
  };
  debounced.cancel = cancel;
  return debounced;
}
