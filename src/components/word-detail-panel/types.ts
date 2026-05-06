export interface RelationItem {
  word: string
  type: string
  strength: number
}

export interface WordDetailData {
  word: string
  phonetic: string
  partOfSpeech: string
  level: string
  definition: string
  examples: string[]
  relations: RelationItem[]
  isCenter: boolean
}

export interface WordDetailPanelProps {
  wordData: WordDetailData
  groupedRelations: Record<string, RelationItem[]>
  onNavigateToWord: (word: string) => void
  onPlayExample: (text: string) => void
}
