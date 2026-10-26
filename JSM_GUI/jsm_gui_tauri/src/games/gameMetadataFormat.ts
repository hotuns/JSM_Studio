/** These are ordinary JSM comments; retain them across import and formatting. */
export const GAME_METADATA_PREFIX = '# JSM_STUDIO_GAME '
export const ACTION_METADATA_PREFIX = '# JSM_STUDIO_ACTION '
export const isGameMetadataComment = (line: string) =>
  line.trimStart().startsWith(GAME_METADATA_PREFIX) || line.trimStart().startsWith(ACTION_METADATA_PREFIX)
