import { Fragment } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

/**
 * Splits a (translated) sentence on ﷺ so the honorific can render in the
 * Arabic font inside a Text, wherever the translation puts it.
 */
export function sallaParts(text: string, style: StyleProp<TextStyle>) {
  return text.split('ﷺ').map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <Text style={style}>ﷺ</Text>}
      {part}
    </Fragment>
  ));
}
