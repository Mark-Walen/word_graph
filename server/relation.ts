export const RELATION_TYPES: Record<string, string> = {
  SYNONYM: "synonym",
  ANTONYM: "antonym",
  HYPERNYM: "hypernym",
  HYPONYM: "hyponym",
  HOLONYM: "holonym",
  MERONYM: "meronym",
  SISTER_TERM: "sister_term",

  HOMOPHONE: "homophone",
  HOMONYM: "homonym",
  PARONYM: "paronym",
  SIMILAR: "similar",
  DERIVATION: "derivation",
  ABBREVIATION: "abbreviation",
  VARIANT: "variant",

  BASE_FORM: "base_form",
  THIRD_PERSON: "third_person",
  PAST_TENSE: "past_tense",
  PAST_PARTICIPLE: "past_participle",
  PRESENT_PARTICIPLE: "present_participle",
  PLURAL_FORM: "plural_form",
  POSSESSIVE: "possessive",
  COMPARATIVE: "comparative",
  SUPERLATIVE: "superlative",
  TO_NOUN: "to_noun",
  TO_VERB: "to_verb",
  TO_ADJ: "to_adj",
  TO_ADV: "to_adv",

  COLLOCATION: "collocation",
  COMPOUND: "compound",
  PHRASE_COMPOSITION: "phrase_composition",
  MODIFIER_HEAD: "modifier_head",
  VERB_OBJECT: "verb_object",
  SUBJECT_PREDICATE: "subject_predicate",
  RELATED: "related",
  IDIOM_COMPONENT: "idiom_component",
  SEMANTIC_ROLE: "semantic_role",
  CONTEXTUAL: "contextual",
  CUSTOM: "custom",
}

export const RELATION_GROUPS: Record<string, string[]> = {
  semantic: [
    "synonym", "antonym", "hypernym", "hyponym",
    "holonym", "meronym", "sister_term",
  ],
  formal: [
    "homophone", "homonym", "paronym", "similar",
    "derivation", "abbreviation", "variant",
  ],
  morphological: [
    "base_form", "third_person", "past_tense", "past_participle",
    "present_participle", "plural_form", "possessive",
    "comparative", "superlative", "to_noun", "to_verb", "to_adj", "to_adv",
  ],
  associative: [
    "collocation", "compound", "phrase_composition",
    "modifier_head", "verb_object", "subject_predicate",
    "related", "idiom_component", "semantic_role", "contextual", "custom",
  ],
}

export const RELATION_GROUP_LABELS: Record<string, string> = {
  semantic: "语义关系",
  formal: "形式关系",
  morphological: "形态关系",
  associative: "联想与用法关系",
  other: "其他关系",
}

export type RelationDirection = "bidirectional" | "directed" | "paired"

export const RELATION_DIRECTION: Record<string, RelationDirection> = {
  synonym: "bidirectional",
  antonym: "bidirectional",
  hypernym: "paired",
  hyponym: "paired",
  holonym: "paired",
  meronym: "paired",
  sister_term: "bidirectional",

  homophone: "bidirectional",
  homonym: "bidirectional",
  paronym: "bidirectional",
  similar: "bidirectional",
  derivation: "directed",
  abbreviation: "directed",
  variant: "bidirectional",

  base_form: "directed",
  third_person: "directed",
  past_tense: "directed",
  past_participle: "directed",
  present_participle: "directed",
  plural_form: "directed",
  possessive: "directed",
  comparative: "directed",
  superlative: "directed",
  to_noun: "directed",
  to_verb: "directed",
  to_adj: "directed",
  to_adv: "directed",

  collocation: "directed",
  compound: "directed",
  phrase_composition: "directed",
  modifier_head: "directed",
  verb_object: "directed",
  subject_predicate: "directed",
  related: "bidirectional",
  idiom_component: "directed",
  semantic_role: "directed",
  contextual: "bidirectional",
  custom: "bidirectional",
}

export const PAIRED_RELATION: Record<string, string> = {
  hypernym: "hyponym",
  hyponym: "hypernym",
  holonym: "meronym",
  meronym: "holonym",
}

export const RELATION_LABELS: Record<string, string> = {
  synonym: "同义词",
  antonym: "反义词",
  hypernym: "上位词",
  hyponym: "下位词",
  holonym: "整体词",
  meronym: "部分词",
  sister_term: "同位词",

  homophone: "同音词",
  homonym: "同形词",
  paronym: "近音词",
  similar: "拼写相似",
  derivation: "派生词",
  abbreviation: "缩写",
  variant: "变体形式",

  base_form: "原形",
  third_person: "第三人称",
  past_tense: "过去式",
  past_participle: "过去分词",
  present_participle: "现在分词",
  plural_form: "复数形式",
  possessive: "所有格",
  comparative: "比较级",
  superlative: "最高级",
  to_noun: "名词化",
  to_verb: "动词化",
  to_adj: "形容词化",
  to_adv: "副词化",

  collocation: "固定搭配",
  compound: "复合词",
  phrase_composition: "短语构成",
  modifier_head: "修饰关系",
  verb_object: "动宾关系",
  subject_predicate: "主谓关系",
  related: "相关词",
  idiom_component: "习语成分",
  semantic_role: "语义角色",
  contextual: "上下文关联",
  custom: "自定义关系",
}

export function getRelationDirection(type: string): RelationDirection {
  return RELATION_DIRECTION[type] ?? "directed"
}

export function getPairedType(type: string): string {
  return PAIRED_RELATION[type] ?? type
}

export function getRelationColor(type: string): string {
  if (RELATION_GROUPS.semantic.includes(type)) return "#4CAF50"
  if (RELATION_GROUPS.formal.includes(type)) return "#2196F3"
  if (RELATION_GROUPS.morphological.includes(type)) return "#9C27B0"
  if (RELATION_GROUPS.associative.includes(type)) return "#FF9800"
  return "#607D8B"
}

export function getRelationGroup(type: string): string {
  for (const [group, types] of Object.entries(RELATION_GROUPS)) {
    if (types.includes(type)) return group
  }
  return "other"
}

export function getRelationGroupLabel(group: string): string {
  return RELATION_GROUP_LABELS[group] ?? "其他关系"
}

export function getRelationLabel(type: string): string {
  return RELATION_LABELS[type] || type
}
