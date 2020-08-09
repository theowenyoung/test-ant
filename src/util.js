const has = require("lodash.has");

const template = function (text, object, options) {
  let includeVariableRegex = /(^on)|(^toJson\(on\.?)/;
  let interpolate = /\$\{\{([\S\s]*?)\}\}/g;
  let shouldReplaceUndefinedToEmpty = false;
  if (options) {
    if (options.interpolate) {
      interpolate = options.interpolate;
    }
    if (options.includeVariableRegex) {
      includeVariableRegex = options.includeVariableRegex;
    }
    if (typeof options.shouldReplaceUndefinedToEmpty !== "undefined") {
      shouldReplaceUndefinedToEmpty = options.shouldReplaceUndefinedToEmpty;
    }
  }
  // Andrea Giammarchi - WTFPL License
  let stringify = JSON.stringify,
    re = interpolate,
    evaluate = [],
    i = 0,
    m;
  const variableHandle = ({
    regex,
    regexResult,
    currentIndex,
    shouldReplaceUndefinedToEmpty,
  }) => {
    if (shouldReplaceUndefinedToEmpty) {
      const functionRegex = /toJson\(([\S\s]*?)\)/;
      const matched = functionRegex.exec(regexResult[1]);
      let variableName = regexResult[1];
      if (matched) {
        variableName = matched[1];
      }
      if (has(object, variableName)) {
        return [
          stringify(
            text.slice(currentIndex, regex.lastIndex - regexResult[0].length)
          ),
          "(" + regexResult[1] + ")",
        ];
      } else {
        return [
          stringify(
            text.slice(currentIndex, regex.lastIndex - regexResult[0].length)
          ),
        ];
      }
    } else {
      return [
        stringify(
          text.slice(currentIndex, regex.lastIndex - regexResult[0].length)
        ),
        "(" + regexResult[1] + ")",
      ];
    }
  };
  while ((m = re.exec(text))) {
    if (includeVariableRegex) {
      if (includeVariableRegex.exec(m[1].trim())) {
        // yes
        evaluate = evaluate.concat(
          variableHandle({
            regex: re,
            currentIndex: i,
            regexResult: m,
            shouldReplaceUndefinedToEmpty,
          })
        );
        i = re.lastIndex;
      } else {
        evaluate.push(stringify(text.slice(i, re.lastIndex)));
        i = re.lastIndex;
      }
    } else {
      evaluate = evaluate.concat(
        variableHandle({
          regex: re,
          currentIndex: i,
          regexResult: m,
          shouldReplaceUndefinedToEmpty,
        })
      );
      i = re.lastIndex;
    }
  }
  evaluate.push(stringify(text.slice(i)));
  // Function is needed to opt out from possible "use strict" directive
  return Function(
    "var toJson = function(obj){return JSON.stringify(obj,null,2)};with(this)return" +
      evaluate.join("+")
  ).call(object);
};

module.exports = {
  template,
};
