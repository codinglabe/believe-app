import { usePage } from "@inertiajs/react"
import type {
  BrpParticipationModuleKey,
  BrpParticipationModuleSettings,
  BrpParticipationSettings,
} from "@/lib/brp-participation"

type PageWithBrpSettings = {
  brpParticipationSettings?: BrpParticipationSettings | null
}

export function useBrpParticipation(module: BrpParticipationModuleKey) {
  const { brpParticipationSettings } = usePage<PageWithBrpSettings>().props
  const mod: BrpParticipationModuleSettings | undefined = brpParticipationSettings?.modules?.[module]
  const award = Number(mod?.award ?? 0)

  return {
    enabled: Boolean(mod?.enabled) && award > 0,
    award,
    label: mod?.label ?? "",
    rule: mod?.rule ?? "",
    module: mod?.module ?? module,
  }
}
