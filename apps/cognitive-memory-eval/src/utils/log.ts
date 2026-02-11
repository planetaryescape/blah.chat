const startedAt = Date.now();

function ts() {
  const s = ((Date.now() - startedAt) / 1000).toFixed(1);
  return `${s}s`;
}

export function log(msg: string) {
  // Keep logs minimal + grep-friendly.
  // eslint-disable-next-line no-console
  console.log(`[cogmem-eval ${ts()}] ${msg}`);
}

export function logBlank() {
  // eslint-disable-next-line no-console
  console.log("");
}

export function counter(label: string, total: number) {
  let done = 0;
  const tick = (suffix?: string) => {
    done += 1;
    const line = `${label} ${done}/${total}${suffix ? ` ${suffix}` : ""}`;
    process.stdout.write(`\r${line}   `);
    if (done >= total) process.stdout.write("\n");
  };
  return { tick };
}
