export function sortByCreatedAtDesc<T extends { createdAt: string }>(items: readonly T[]): T[] {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}
