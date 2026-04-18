export function isColumnSolved(column: string[]): boolean {
  if (column.length === 0) return true;
  return column.every((segment) => segment === column[0]);
}

export function checkWin(columns: string[][]): boolean {
  return columns.every(isColumnSolved);
}
