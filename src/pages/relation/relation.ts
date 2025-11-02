export const RELATION_TYPES = {
  // ==================== 语义关系 (基于含义) ====================
  SYNONYM: "synonym",           // 同义词
  ANTONYM: "antonym",           // 反义词
  HYPERNYM: "hypernym",         // 上位词/父类词
  HYPONYM: "hyponym",           // 下位词/子类词
  HOLONYM: "holonym",           // 整体词
  MERONYM: "meronym",           // 部分词
  SISTER_TERM: "sister_term",   // 同位词/兄弟概念

  // ==================== 形式关系 (基于拼写、发音、构词法) ====================
  HOMOPHONE: "homophone",       // 同音异形异义词
  HOMONYM: "homonym",           // 同形异义词
  PARONYM: "paronym",           // 近音词
  SIMILAR: "similar",           // 拼写相似词
  DERIVATION: "derivation",     // 派生关系
  ABBREVIATION: "abbreviation", // 缩写/简写关系
  VARIANT: "variant",           // 变体形式

  // ==================== 形态关系 (基于单词的语法形态变化) ====================
  BASE_FORM: "base_form",               // 基础形式(原形)
  THIRD_PERSON: "third_person",         // 第三人称单数现在时
  PAST_TENSE: "past_tense",             // 过去式
  PAST_PARTICIPLE: "past_participle",   // 过去分词
  PRESENT_PARTICIPLE: "present_participle", // 现在分词/动名词
  PLURAL_FORM: "plural_form",           // 复数形式
  POSSESSIVE: "possessive",             // 所有格形式
  COMPARATIVE: "comparative",           // 比较级
  SUPERLATIVE: "superlative",           // 最高级
  TO_NOUN: "to_noun",     // 转换为名词
  TO_VERB: "to_verb",     // 转换为动词
  TO_ADJ: "to_adj",       // 转换为形容词
  TO_ADV: "to_adv",       // 转换为副词

  // ==================== 联想与用法关系 (基于经验、语境和自定义) ====================
  COLLOCATION: "collocation",           // 固定搭配
  COMPOUND: "compound",                 // 复合词关系(如"car door")
  PHRASE_COMPOSITION: "phrase_composition", // 短语构成关系
  MODIFIER_HEAD: "modifier_head",       // 修饰语-中心语关系
  VERB_OBJECT: "verb_object",           // 动宾关系
  SUBJECT_PREDICATE: "subject_predicate", // 主谓关系
  RELATED: "related",                   // 相关词(宽泛语境关联)
  IDIOM_COMPONENT: "idiom_component",   // 习语构成成分
  SEMANTIC_ROLE: "semantic_role",       // 语义角色关系
  CONTEXTUAL: "contextual",             // 上下文关联关系
  CUSTOM: "custom"                     // 自定义关系
};

// 关系类型分组
export const RELATION_GROUPS = {
  semantic: [
      RELATION_TYPES.SYNONYM,
      RELATION_TYPES.ANTONYM,
      RELATION_TYPES.HYPERNYM,
      RELATION_TYPES.HYPONYM,
      RELATION_TYPES.HOLONYM,
      RELATION_TYPES.MERONYM,
      RELATION_TYPES.SISTER_TERM
  ],
  formal: [
      RELATION_TYPES.HOMOPHONE,
      RELATION_TYPES.HOMONYM,
      RELATION_TYPES.PARONYM,
      RELATION_TYPES.SIMILAR,
      RELATION_TYPES.DERIVATION,
      RELATION_TYPES.ABBREVIATION,
      RELATION_TYPES.VARIANT
  ],
  morphological: [
      RELATION_TYPES.BASE_FORM,
      RELATION_TYPES.THIRD_PERSON,
      RELATION_TYPES.PAST_TENSE,
      RELATION_TYPES.PAST_PARTICIPLE,
      RELATION_TYPES.PRESENT_PARTICIPLE,
      RELATION_TYPES.PLURAL_FORM,
      RELATION_TYPES.POSSESSIVE,
      RELATION_TYPES.COMPARATIVE,
      RELATION_TYPES.SUPERLATIVE,
      RELATION_TYPES.TO_NOUN,
      RELATION_TYPES.TO_VERB,
      RELATION_TYPES.TO_ADJ,
      RELATION_TYPES.TO_ADV
  ],
  associative: [
      RELATION_TYPES.COLLOCATION,
      RELATION_TYPES.COMPOUND,
      RELATION_TYPES.PHRASE_COMPOSITION,
      RELATION_TYPES.MODIFIER_HEAD,
      RELATION_TYPES.VERB_OBJECT,
      RELATION_TYPES.SUBJECT_PREDICATE,
      RELATION_TYPES.RELATED,
      RELATION_TYPES.IDIOM_COMPONENT,
      RELATION_TYPES.SEMANTIC_ROLE,
      RELATION_TYPES.CONTEXTUAL,
      RELATION_TYPES.CUSTOM
  ]
};

// 关系类型中文标签
export const RELATION_LABELS = {
  [RELATION_TYPES.SYNONYM]: "同义词",
  [RELATION_TYPES.ANTONYM]: "反义词",
  [RELATION_TYPES.HYPERNYM]: "上位词",
  [RELATION_TYPES.HYPONYM]: "下位词",
  [RELATION_TYPES.HOLONYM]: "整体词",
  [RELATION_TYPES.MERONYM]: "部分词",
  [RELATION_TYPES.SISTER_TERM]: "同位词",

  [RELATION_TYPES.HOMOPHONE]: "同音词",
  [RELATION_TYPES.HOMONYM]: "同形词",
  [RELATION_TYPES.PARONYM]: "近音词",
  [RELATION_TYPES.SIMILAR]: "拼写相似",
  [RELATION_TYPES.DERIVATION]: "派生词",
  [RELATION_TYPES.ABBREVIATION]: "缩写",
  [RELATION_TYPES.VARIANT]: "变体形式",

  [RELATION_TYPES.BASE_FORM]: "原形",
  [RELATION_TYPES.THIRD_PERSON]: "第三人称",
  [RELATION_TYPES.PAST_TENSE]: "过去式",
  [RELATION_TYPES.PAST_PARTICIPLE]: "过去分词",
  [RELATION_TYPES.PRESENT_PARTICIPLE]: "现在分词",
  [RELATION_TYPES.PLURAL_FORM]: "复数形式",
  [RELATION_TYPES.POSSESSIVE]: "所有格",
  [RELATION_TYPES.COMPARATIVE]: "比较级",
  [RELATION_TYPES.SUPERLATIVE]: "最高级",
  [RELATION_TYPES.TO_NOUN]: "名词化",
  [RELATION_TYPES.TO_VERB]: "动词化",
  [RELATION_TYPES.TO_ADJ]: "形容词化",
  [RELATION_TYPES.TO_ADV]: "副词化",

  [RELATION_TYPES.COLLOCATION]: "固定搭配",
  [RELATION_TYPES.COMPOUND]: "复合词",
  [RELATION_TYPES.PHRASE_COMPOSITION]: "短语构成",
  [RELATION_TYPES.MODIFIER_HEAD]: "修饰关系",
  [RELATION_TYPES.VERB_OBJECT]: "动宾关系",
  [RELATION_TYPES.SUBJECT_PREDICATE]: "主谓关系",
  [RELATION_TYPES.RELATED]: "相关词",
  [RELATION_TYPES.IDIOM_COMPONENT]: "习语成分",
  [RELATION_TYPES.SEMANTIC_ROLE]: "语义角色",
  [RELATION_TYPES.CONTEXTUAL]: "上下文关联",
  [RELATION_TYPES.CUSTOM]: "自定义关系"
};

export const getRelationColor = (relationType: string): string => {
  if (RELATION_GROUPS.semantic.includes(relationType)) {
      return "#4CAF50"; // 绿色
  } else if (RELATION_GROUPS.formal.includes(relationType)) {
      return "#2196F3"; // 蓝色
  } else if (RELATION_GROUPS.morphological.includes(relationType)) {
      return "#9C27B0"; // 紫色
  } else if (RELATION_GROUPS.associative.includes(relationType)) {
      return "#FF9800"; // 橙色
  }
  return "#607D8B"; // 默认灰色
}

export const getRelationGroup = (relationType: string): string | null => {
  for (const [group, types] of Object.entries(RELATION_GROUPS)) {
    if (types.includes(relationType)) {
      return group;
    }
  }
  return null;
}

export const getRelationLabel = (relationType: string): string => {
  return RELATION_LABELS[relationType] || relationType;
}
