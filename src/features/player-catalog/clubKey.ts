import { getClubIdentity } from './clubRegistry'
import { referenceTeamKey } from './referenceCareers'

/** Canonical club of a reference tag: the registry identity, with the reviewed explicit aliases (e.g. atletico_madrid / atletico_de_madrid) merged. */
export const canonicalClubKey = (clubTag: string): string => referenceTeamKey(getClubIdentity(clubTag)?.name ?? clubTag)
