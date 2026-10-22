import { useTranslation } from 'react-i18next'
import { CATEGORY_GROUPS } from '../themed-modes/categoryTree'
import { MODE_VISUALS } from '../themed-modes/modeVisuals'
import type { ThemedModeId } from '../themed-modes/modeTypes'

/** Name and edition of a category: «LIGA BRASILEÑA» + «ACTUALIDAD 2026». Modes outside the tree keep their own name and no edition. */
export function useEditionNames(mode: ThemedModeId) {
  const { t } = useTranslation()
  const group = CATEGORY_GROUPS.find((item) => (item.modes as readonly ThemedModeId[]).includes(mode))
  if (!group) return { title: t(mode === 'ARGENTINA_CLUBS' ? 'modes.items.argentinaClubs.name' : `categoryTree.options.${mode}`), edition: '' }
  const legend = Boolean(MODE_VISUALS[mode]?.legend)
  return { title: t(`categoryTree.groups.${group.id}`), edition: t(legend ? 'editionHero.legends' : 'editionHero.current') }
}

