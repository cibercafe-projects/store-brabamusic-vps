const AUTH_ERROR_MESSAGES: ReadonlyArray<readonly [RegExp, string]> = [
  [/invalid login credentials/i, "E-mail ou senha inválidos."],
  [/invalid credential/i, "E-mail ou senha inválidos."],
  [/email not confirmed/i, "E-mail ainda não confirmado. Verifique sua caixa de entrada."],
  [/user not found/i, "Usuário não encontrado. Verifique o e-mail informado."],
  [/already registered/i, "Este e-mail já está cadastrado."],
  [/too many requests/i, "Muitas tentativas. Aguarde alguns instantes e tente novamente."],
  [
    /for security purposes, you can only request this after/i,
    "Aguarde alguns instantes antes de pedir um novo link.",
  ],
  [/smtp/i, "Não foi possível enviar o e-mail agora. Tente novamente em instantes."],
  [
    /over email send rate limit/i,
    "Muitos e-mails enviados recentemente. Aguarde alguns instantes e tente novamente.",
  ],
  [
    /email address is not authorized/i,
    "Este e-mail não está autorizado. Fale com a administração.",
  ],
  [/password should be at least/i, "A senha deve ter no mínimo 8 caracteres."],
  [/password must be different/i, "A nova senha precisa ser diferente da anterior."],
  [/rate limit/i, "Muitas tentativas. Aguarde alguns instantes."],
  [
    /token has expired|invalid otp|otp is not|otp expired/i,
    "Código inválido ou expirado. Peça um novo link de redefinição.",
  ],
  [/timed out|timeout/i, "A requisição demorou demais. Tente novamente."],
  [/network|fetch failed/i, "Falha de conexão. Verifique sua internet e tente novamente."],
];

export function translateAuthError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  for (const [pattern, message] of AUTH_ERROR_MESSAGES) {
    if (pattern.test(raw)) return message;
  }
  if (!raw || raw === "undefined") return "Ocorreu um erro inesperado. Tente novamente.";
  return `Ocorreu um erro: ${raw}`;
}
