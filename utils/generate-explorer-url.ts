import { config } from "../config";

export function generateExplorerUrl(
  identifier: string,
  isAddress: boolean = false
): string {
  if (!identifier) return "";
  const baseUrl = config.explorerUrl;
  const localSuffix = `?cluster=${config.cluster}`;
  const slug = isAddress ? "address" : "tx";
  return `${baseUrl}/${slug}/${identifier}${localSuffix}`;
}
