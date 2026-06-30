/** Scroll to, focus and red-highlight the field that failed validation. */
export function highlightField(el: Element | null): void {
  if (!el) return;
  document.querySelectorAll('.input-err').forEach(e => e.classList.remove('input-err'));
  el.classList.add('input-err');
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const focusable = el as HTMLElement;
  if (typeof focusable.focus === 'function') {
    try { focusable.focus({ preventScroll: true }); } catch { focusable.focus(); }
  }
  const clear = () => { el.classList.remove('input-err'); el.removeEventListener('input', clear); };
  el.addEventListener('input', clear);
}
