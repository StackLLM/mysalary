# Recettes UI (les patterns qui ont convergé)

## lib/animations.ts — variantes framer-motion partagées

```ts
import type { Variants } from 'framer-motion'
export const conteneurCascade: Variants = { cache: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } }
export const elementApparition: Variants = { cache: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 220, damping: 24 } } }
export const transitionVue = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 }, transition: { duration: 0.35, ease: [0.22,1,0.36,1] as const } }
```

## App.tsx — fenêtre rectangle + RAIL EN VERRE (couche arrière) + carte blanche devant

Le point clé qui rend le rail *réellement* transparent : le rail est une **couche
arrière posée sur le fond de page**, et la **carte blanche est devant et la
chevauche** (`sm:-ml-8`). Les blobs dérivent derrière et transparaissent à travers.

```tsx
<div className="relative flex min-h-screen items-stretch justify-center overflow-hidden p-4 sm:p-7 lg:p-10">
  {/* blobs d'ambiance (dérive lente, visibles à travers le verre) */}
  <div className={`pointer-events-none absolute -left-16 top-16 h-80 w-80 rounded-full bg-foret/20 blur-3xl ${animations ? 'animate-[deriver_18s_ease-in-out_infinite]' : ''}`} aria-hidden />
  <div className={`pointer-events-none absolute -right-24 bottom-4 h-96 w-96 rounded-full bg-saphir/20 blur-3xl ${animations ? 'animate-[deriver_22s_ease-in-out_infinite_reverse]' : ''}`} aria-hidden />

  <div className="relative flex w-full max-w-7xl items-stretch">
    {/* RAIL : panneau translucide, couche arrière, posé sur le fond */}
    <aside className="relative z-0 hidden shrink-0 items-stretch rounded-[40px] border border-white/50 bg-white/25 py-5 pl-3 pr-11 shadow-carte backdrop-blur-2xl sm:flex">
      <RailLateral onNouveau={reinitialiser} />
    </aside>
    {/* CARTE BLANCHE : couche avant, chevauche le rail */}
    <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden rounded-fenetre bg-white shadow-fenetre ring-1 ring-encre/5 sm:-ml-8">
      <BarreSuperieure />
      <main className="flex min-h-0 flex-1 flex-col px-5 pb-6 sm:px-10 lg:px-16">
        <AnimatePresence mode="wait">
          {vue === 'accueil'
            ? <motion.div key="accueil" {...transitionVue} className="flex min-h-0 flex-1 flex-col"><PageAccueil onEnvoyer={envoyer} /></motion.div>
            : <motion.div key="conversation" {...transitionVue} className="flex min-h-0 flex-1 flex-col"><PageConversation .../></motion.div>}
        </AnimatePresence>
      </main>
    </div>
  </div>
</div>
```

`RailLateral` : `<nav className="flex h-full flex-col items-center gap-3">` → bouton `+`
Encre plein en haut ; outils en **pastilles claires** (`rounded-full border border-white/70
bg-white/70 text-encre/55 hover:bg-white`) ; marque en pied (`mt-auto`). Icônes lucide
selon l'image (`Plus, Search, Compass, LayoutGrid, History`).

## PageAccueil — champ ANCRÉ EN BAS (occupe l'espace)

```tsx
<motion.div variants={conteneurCascade} initial="cache" animate="visible"
  className="mx-auto flex h-full w-full max-w-4xl flex-col gap-7 py-3">
  <ZoneHeros />
  <motion.div variants={elementApparition} className="grid gap-4 sm:grid-cols-3 sm:items-start">
    {CARTES.map(c => <CarteFeature key={c.id} carte={c} />)}
  </motion.div>
  <div className="mt-auto pt-4"><BarreActions onEnvoyer={onEnvoyer} /></div>   {/* ← mt-auto = bas */}
</motion.div>
```

## Composeur — champ premium (dégradé + glow + envoi dégradé + micro contour)

```tsx
<form onSubmit={...}
  className="group relative rounded-[30px] bg-gradient-to-r from-foret/45 via-saphir/35 to-saphir/50 p-[1.6px]
             shadow-[0_26px_60px_-28px_rgba(14,26,36,0.42)] transition-all duration-300
             focus-within:from-foret focus-within:via-saphir focus-within:to-foret
             focus-within:shadow-[0_30px_72px_-26px_rgba(27,95,140,0.5)]">
  <div className="flex items-center gap-3 rounded-[28px] bg-white px-4 py-3">
    <button className="grid h-9 w-9 place-items-center rounded-full text-meta hover:bg-papier-100 hover:text-encre"><Plus size={20}/></button>
    <span className="h-7 w-px bg-encre/10" />
    <textarea rows={1} placeholder={`Exemple : « ${exemple} »`}
      className="max-h-40 flex-1 resize-none bg-transparent py-2 text-[15.5px] text-encre outline-none placeholder:text-meta" />
    {/* micro = cercle CONTOUR */}
    <button className="grid h-10 w-10 place-items-center rounded-full border border-encre/15 text-meta hover:border-encre/30 hover:text-encre"><Mic size={18}/></button>
    {/* envoi = dégradé */}
    <button type="submit" disabled={!texte.trim()}
      className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-foret to-saphir text-white
                 shadow-[0_10px_24px_-8px_rgba(27,95,140,0.6)] transition-all hover:-translate-y-0.5
                 active:scale-95 disabled:opacity-35 disabled:shadow-none">
      <Send size={18} className="-translate-x-px" /></button>
  </div>
</form>
```
Placeholder d'exemples qui **défile** via `setInterval` (coupé si `!animations`). Entrée
envoie, Maj+Entrée = saut de ligne. Champ contrôlé → bouton envoi `disabled` si vide.

## ZoneHeros — titre mixte + mascotte + bulle À GAUCHE (ne cache pas le visage)

```tsx
<div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
  <motion.h1 variants={elementApparition} className="max-w-xl text-4xl leading-[1.05] sm:text-[52px]">
    <span className="font-display italic text-meta">Bonjour Melko,</span><br/>
    <span className="font-bold text-encre">prêt à explorer votre activité ?</span>
  </motion.h1>
  <motion.div variants={elementApparition} className="relative z-20 shrink-0 self-center sm:-mb-16 sm:translate-y-4 sm:self-end">
    {/* bulle ENTIÈREMENT à gauche du robot */}
    <motion.div className="absolute right-full top-6 z-10 mr-2 w-max max-w-[190px] rounded-2xl rounded-br-md bg-white px-4 py-2.5 text-sm font-medium text-encre shadow-bulle ring-1 ring-encre/5">
      Bonjour 👋<br/>Besoin d’un coup de pouce ?
    </motion.div>
    <Mascotte taille={200} />
  </motion.div>
</div>
```

## Mascotte DEPUIS L'ASSET FOURNI (ne pas redessiner)

1. Optimiser une fois (sharp, en `--no-save` pour ne pas polluer les deps) :

```js
// ui/redim-robot.mjs (jetable, supprimer après)
import sharp from 'sharp'
const info = await sharp('../<Asset>.jpg')
  .trim({ threshold: 12 })            // enlève la marge blanche
  .resize({ width: 1000, withoutEnlargement: true })
  .webp({ quality: 92 })
  .toFile('public/robot-askme.webp')
console.log('OK', info.width + 'x' + info.height, Math.round(info.size/1024) + ' Ko')
```
```
cd ui && npm install --no-save sharp && node redim-robot.mjs && del redim-robot.mjs
```

2. L'afficher — `mix-blend-multiply` efface le fond blanc sur **n'importe quel** fond :

```tsx
const robotUrl = '/robot-askme.webp'  // servi depuis public/ (URL directe, pas d'import)
export const Mascotte = memo(function Mascotte({ taille = 220 }: { animee?: boolean; taille?: number }) {
  return <img src={robotUrl} alt="" aria-hidden draggable={false}
    style={{ width: taille }} className="h-auto max-w-none select-none mix-blend-multiply" />
})
```
Statique par défaut (pas d'animation). Si pas d'asset fourni ET que le user veut du 3D :
possible via `@react-three/fiber` + `drei`, mais lourd et bloque les captures — préférer
l'asset. `frameloop="demand"` quand animations off.

## Vue conversation
- `useConversation` : `useState<Message[]>` + `useMutation({ mutationFn: poserQuestion })` ;
  `envoyer(q)` → `setVue('conversation')`, push question, `mutation.mutate(q)` ; `enReflexion =
  mutation.isPending` ; `reinitialiser()` remet `accueil`.
- `BulleMessage` : question à droite (Encre plein), réponse à gauche (avatar + carte + `SourcesCitees`).
- `SourcesCitees` : chips numérotés dépliables (façon NotebookLM).
- `IndicateurReflexion` : 3 points `animate-[rebondir]` + « … réfléchit ».
- `PageConversation` : fil qui défile (`scrollIntoView?.(...)` — l'optionnel évite le crash jsdom) + `Composeur autoFocus` en bas.
- `lib/api.ts` : `MODE_DEMO=true` → réponse locale de `donneesDemo` après un `setTimeout`,
  sinon `POST /api/<projet>/question`. Prêt à brancher le RAG.
