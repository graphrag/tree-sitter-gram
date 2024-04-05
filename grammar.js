module.exports = grammar({
  name: 'gram',

  rules: {
    gram: $ => repeat(choice(
      $.pattern,
      $.series,
      $.record
    )),

    pattern: $ => commaSep1($.part),

    // segment: $ => choice(
    //   $.node,
    //   seq($.node, $._relationship, $._node_pattern)
    // ),
    
    part: $ => ruleSep1($.node, $._relationship),

    node: $ => seq("(", optional($.attributes),")"),

    series: $ => seq("[", optional($.attributes), optional($.members),"]"),

    attributes: $ => choice(
      choice(field("identifier", $._identifier), field("labels", $.labels), field("record", $.record)), 
      seq(field("identifier", $._identifier), field("labels", $.labels))
    ),

    members: $ => seq("|", commaSep1($.symbol)),

    _identifier: $ => choice(
      $.symbol,
      $._string_literal
    ),

    labels: $ => seq(":", colonSep1($.symbol)),

    record: $ => seq("{", commaSep1($.pair), "}"),

    pair: $ => seq(
      field('key', $.symbol),
      ':',
      field('value', $._value),
    ),

    symbol: $ => {
      const alphanumeric = /[0-9a-zA-Z_@.]+/;      
      return token(alphanumeric);
    },

    _value: $ => choice(
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
      const octal = /[0o][0-7]+/;      
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

    _relationship: $ => choice(
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
      
    undirected_single: $ => seq("-", optional(seq("[", $.attributes, "]")), "-"),

    single_arrow_right: $ => seq("-", optional(seq("[", $.attributes, "]")), "->"),

    single_arrow_left: $ => seq("<-", optional(seq("[", $.attributes, "]")), "-"),
      
    undirected_double_arrow: $ => seq("=", optional(seq("[", $.attributes, "]")), "="),

    double_arrow_right: $ => seq("=", optional(seq("[", $.attributes, "]")), token(/>?=>/)),

    double_arrow_left: $ => seq(token(/<=<?/), optional(seq("[", $.attributes, "]")), "="),
      
    undirected_squiggle: $ => seq("~", optional(seq("[", $.attributes, "]")), "~"),

    squiggle_arrow_right: $ => seq("~", optional(seq("[", $.attributes, "]")), "~>"),

    squiggle_arrow_left: $ => seq("<~", optional(seq("[", $.attributes, "]")), "~"),

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