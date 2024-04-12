module.exports = grammar({
  name: 'gram',

  rules: {
    gram: $ => repeat(choice(
      $.pattern,
      $.series,
      $.record
    )),

    pattern: $ => commaSep1($._path),

    // segment: $ => choice(
    //   $.node,
    //   seq($.node, $._relationship, $._node_pattern)
    // ),
    
    _path: $ => choice(
      $.relationship,
      $.node
    ),

    node: $ => seq("(", optional($._attributes),")"),

    relationship: $ => seq(field("left", $.node), field("value", $._relationship_value), field("right", $._path)),

    series: $ => seq("[", optional($._attributes), optional($.members),"]"),

    members: $ => seq(field("operator", $.operator), commaSep1($._member)),

    operator: $ => token(/<{0,2}[-~=\/\|+*%]{1,3}>{0,2}/),

    _member: $ => choice(
      $._identifier,
      $._path
    ),

    _attributes: $ => choice(
      choice(field("identifier", $._identifier), field("labels", $.labels), field("record", $.record)), 
      seq(field("identifier", $._identifier), field("labels", $.labels)),
      seq(field("identifier", $._identifier), field("record", $.record)),
      seq(field("labels", $.labels), field("record", $.record)),
      seq(field("identifier", $._identifier), field("labels", $.labels), field("record", $.record))
    ),

    _identifier: $ => choice(
      $.symbol,
      $._numeric_literal,
      $._string_literal
    ),

    labels: $ => seq(":", colonSep1($.symbol)),

    record: $ => seq("{", commaSep1(choice($.value_pair, $.type_pair)), "}"),

    value_pair: $ => seq(
      field('key', $.symbol),
      ':',
      field('value', $._value),
    ),

    type_pair: $ => seq(
      field('key', $.symbol),
      token('::'),
      field('type', $.symbol),
      optional(field('cardinality', choice('!', '?', '*', '+')))
    ),

    symbol: $ => {
      const alphanumeric = /[a-zA-Z_@.][0-9a-zA-Z_@.]*/;      
      return token(alphanumeric);
    },

    _value: $ => choice(
      $.symbol,
      $._numeric_literal,
      $._string_literal,
    ),

    _numeric_literal: $ => choice(
      $.integer,
      $.decimal,
      $.hexadecimal,
      $.octal,
      $.measurement
    ),

    integer: $ => {
      const integer = /-?(0|[1-9]\d*)/;      
      return token(integer);
    },

    decimal: $ => {
      const decimal = /-?(0|[1-9]\d*)\.\d+/;      
      return token(decimal);
    },

    hexadecimal: $ => {
      const hexadecimal = /0x[0-9a-fA-F]+/;      
      return token(hexadecimal);
    },

    octal: $ => {
      const octal = /0[0-7]+/;      
      return token(octal);
    },

    measurement: $ => {
      // /-?(?:[0-9]|[1-9][0-9]+)(?:\.[0-9]+)?[a-zA-Z]+\b(?!@)/
      const measurement = /-?(0|[1-9]\d*)([a-zA-Z]+)/;      
      return token(measurement);
    },

    _string_literal: $ => choice(
      $.single_quoted_string,
      $.double_quoted_string,
      $.backticked_string,
      $.tagged_string
    ),

    single_quoted_string: $ => {
      const quoted = /'(\\['bfnrt/\\]|[^'])*'/;      
      return token(quoted);
    },

    double_quoted_string: $ => {
      const quoted = /"(\\["bfnrt/\\]|[^"])*"/;      
      return token(quoted);
    },

    backticked_string: $ => {
      const quoted = /`(\\[`bfnrt/\\]|[^`])*`/;      
      return token(quoted);
    },

    tagged_string: $ => {
      const tagged = /[a-zA-Z][0-9a-zA-Z_.@]*`[^`]*`/;      
      return token(tagged);
    },

    _relationship_value: $ => choice(
      $.undirected_single,
      $.single_arrow_right,
      $.single_arrow_left,
      $.undirected_double_arrow,
      $.double_arrow_right,
      $.double_arrow_left,
      $.undirected_squiggle,
      $.squiggle_arrow_right,
      $.squiggle_arrow_left,
    ),
      
    undirected_single: $ => seq("-", optional(seq("[", $._attributes, "]")), "-"),

    single_arrow_right: $ => seq("-", optional(seq("[", $._attributes, "]")), "->"),

    single_arrow_left: $ => seq("<-", optional(seq("[", $._attributes, "]")), "-"),
      
    undirected_double_arrow: $ => seq("=", optional(seq("[", $._attributes, "]")), "="),

    double_arrow_right: $ => seq("=", optional(seq("[", $._attributes, "]")), "=>"),

    double_arrow_left: $ => choice(
      "<==",
      seq("<==", optional(seq("[", $._attributes, "]")), "="),
    ),
      
    undirected_squiggle: $ => seq("~", optional(seq("[", $._attributes, "]")), "~"),

    squiggle_arrow_right: $ => seq("~", optional(seq("[", $._attributes, "]")), "~>"),

    squiggle_arrow_left: $ => seq("<~", optional(seq("[", $._attributes, "]")), "~"),

  }
});

/**
 * Creates a rule to match one or more of the rules separated by a comma
 *
 * @param {RuleOrLiteral} rule
 *
 * @return {SeqRule}
 *
 */
function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}

/**
 * Creates a rule to optionally match one or more of the rules separated by a comma
 *
 * @param {RuleOrLiteral} rule
 *
 * @return {ChoiceRule}
 *
 */
function commaSep(rule) {
  return optional(commaSep1(rule));
}


/**
 * Creates a rule to match one or more of the rules separated by a colon
 *
 * @param {RuleOrLiteral} rule
 *
 * @return {SeqRule}
 *
 */
function colonSep1(rule) {
  return seq(rule, repeat(seq(':', rule)));
}


/**
 * Creates a rule to match one or more of the rules separated by another rule
 *
 * @param {RuleOrLiteral} rule
 *
 * @return {SeqRule}
 *
 */
function ruleSep1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}