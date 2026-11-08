/**
 * Copies text to the user's clipboard using the Clipboard API with a textarea fallback.
 *
 * @param text - Plain text string to copy.
 * @returns Promise resolving to true if copied successfully, false otherwise.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through to fallback */
    }
  }

  if (typeof document !== 'undefined') {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(ta);
      return successful;
    } catch {
      return false;
    }
  }

  return false;
}
