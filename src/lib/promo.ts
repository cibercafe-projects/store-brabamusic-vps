export type PromoInfo = {
  promo_ativa: boolean;
  promo_valor: number | null;
  promo_link_pagamento: string;
  promo_descricao: string | null;
  promo_inicio_em: string | null;
  promo_expira_em: string | null;
};

export type ResolvePrecoArgs = {
  precoCheio: number;
  promo: PromoInfo | null | undefined;
  linkPadrao: string;
};

export type PrecoEfetivo = {
  precoCheio: number;
  precoEfetivo: number;
  emPromocao: boolean;
  paymentLink: string;
};

function inIntervalo(vigoraDesde: string | null, expiraEm: string | null, now: number): boolean {
  if (vigoraDesde && now < new Date(vigoraDesde).getTime()) return false;
  if (expiraEm && now > new Date(expiraEm).getTime()) return false;
  return true;
}

export function resolvePrecoEfetivo({
  precoCheio,
  promo,
  linkPadrao,
}: ResolvePrecoArgs): PrecoEfetivo {
  const ativa =
    !!promo &&
    promo.promo_ativa &&
    promo.promo_valor != null &&
    promo.promo_valor < precoCheio &&
    inIntervalo(promo.promo_inicio_em, promo.promo_expira_em, Date.now());

  if (!ativa) {
    return { precoCheio, precoEfetivo: precoCheio, emPromocao: false, paymentLink: linkPadrao };
  }

  const promoLink = promo!.promo_link_pagamento?.trim();
  return {
    precoCheio,
    precoEfetivo: promo!.promo_valor as number,
    emPromocao: true,
    paymentLink: promoLink ? promoLink : linkPadrao,
  };
}
