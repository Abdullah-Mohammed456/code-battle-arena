export class JudgeError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/* eslint-disable no-control-regex -- Remove untrusted terminal control sequences. */
export function sanitize(output: string) {
  return output
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "")
    .replace(/\/(?:[\w.-]+\/)*[\w.-]+/g, "[path]")
    .slice(0, 4096);
}
