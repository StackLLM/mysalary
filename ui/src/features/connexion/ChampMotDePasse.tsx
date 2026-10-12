import { Eye, EyeOff } from 'lucide-react'
import { useState, type ComponentProps } from 'react'
import { Champ } from '../../components/Champ'

/** Mot de passe avec « afficher / masquer ». */
export function ChampMotDePasse(props: Omit<ComponentProps<typeof Champ>, 'type' | 'action'>) {
  const [visible, setVisible] = useState(false)
  return (
    <Champ
      {...props}
      type={visible ? 'text' : 'password'}
      action={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          aria-pressed={visible}
          className="grid h-9 w-9 place-items-center rounded-pilule text-gris-icone transition-colors hover:bg-teinte hover:text-encre"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
    />
  )
}
