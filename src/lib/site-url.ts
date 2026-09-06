export function getPublicSiteUrl(): string {
  return process.env.PUBLIC_SITE_URL ?? "https://loja.brabamusic.com.br";
}

export function getSenderDomain(): string {
  return process.env.SMTP_FROM?.split("@")[1] ?? "brabamusic.com.br";
}

export function getDefaultFromEmail(): string {
  return process.env.SMTP_FROM ?? `noreply@${getSenderDomain()}`;
}
