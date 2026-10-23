/** Navigation configuration only; Microsoft authenticates access to the destination. */
export function cloudFolderUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash) return null;
    if (!/^[a-z0-9-]+\.sharepoint\.com$/.test(url.hostname)) return null;
    if (!url.pathname.startsWith('/personal/') && !url.pathname.startsWith('/sites/')) return null;
    return url.href;
  } catch { return null; }
}
