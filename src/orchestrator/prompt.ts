export function substitutePlaceholders(
  template: string,
  ctx: { stagedFiles: string[]; stagedDiff: string },
): string {
  return template.replace('{{stagedFiles}}', ctx.stagedFiles.join('\n')).replace('{{diff}}', ctx.stagedDiff);
}
