/** Gabarit des e-mails : un titre, quelques paragraphes, un bouton. Chaque message existe en texte et en HTML. */
export interface Gabarit {
  titre: string
  paragraphes: string[]
  bouton: { libelle: string; lien: string }
  pied: string
}

const echapper = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function composer({ titre, paragraphes, bouton, pied }: Gabarit): { texte: string; html: string } {
  const texte = [titre, ...paragraphes, `${bouton.libelle} :\n${bouton.lien}`, pied].join('\n\n')
  // Mise en page en tableau et styles en ligne : seule façon fiable de s'afficher dans les messageries.
  const html = `<!doctype html>
<html lang="fr"><body style="margin:0;background:#F9FAFB;font-family:Arial,Helvetica,sans-serif;color:#121413">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:16px">
<tr><td style="padding:32px">
<p style="margin:0 0 24px;font-size:20px;font-weight:800;color:#4F6D5C">MySalary<span style="color:#7D8C82">.</span></p>
<h1 style="margin:0 0 16px;font-size:22px;line-height:28px">${echapper(titre)}</h1>
${paragraphes.map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:22px;color:#3D4140">${echapper(p)}</p>`).join('\n')}
<p style="margin:24px 0"><a href="${echapper(bouton.lien)}" style="display:inline-block;background:#7D8C82;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:16px;padding:14px 28px;border-radius:12px">${echapper(bouton.libelle)}</a></p>
<p style="margin:0 0 16px;font-size:13px;line-height:20px;color:#6F7276">Si le bouton ne marche pas, copie ce lien dans ton navigateur :<br><span style="word-break:break-all">${echapper(bouton.lien)}</span></p>
<p style="margin:0;font-size:13px;line-height:20px;color:#6F7276">${echapper(pied)}</p>
</td></tr></table></td></tr></table></body></html>`
  return { texte, html }
}
