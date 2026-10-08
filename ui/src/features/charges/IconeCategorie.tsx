import type { IconeCategorie as NomIcone } from '@mysalary/partage'
import {
  Car,
  Circle,
  Dumbbell,
  GraduationCap,
  Gift,
  HeartPulse,
  Home,
  Landmark,
  PartyPopper,
  Repeat,
  Shield,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../../lib/cn'

const ICONES: Record<NomIcone, LucideIcon> = {
  maison: Home,
  panier: ShoppingBasket,
  voiture: Car,
  telephone: Smartphone,
  sante: HeartPulse,
  bouclier: Shield,
  famille: Users,
  abonnement: Repeat,
  loisirs: PartyPopper,
  sport: Dumbbell,
  shopping: ShoppingBag,
  banque: Landmark,
  education: GraduationCap,
  cadeau: Gift,
  autre: Circle,
}

/** Pastille ronde teintée avec l'icône de la catégorie (décorative : le libellé est toujours affiché). */
export function IconeCategorie({ icone, className }: { icone: NomIcone; className?: string }) {
  const Icone = ICONES[icone] ?? Circle
  return (
    <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-pilule bg-teinte text-lien', className)} aria-hidden>
      <Icone className="h-4 w-4" />
    </span>
  )
}
