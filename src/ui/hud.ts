export function setStatus(text: string): void {
  const el = document.getElementById('status');
  if (el) el.textContent = text;
}
