import { config } from '@tamagui/config/v3';
import { createTamagui } from 'tamagui';

// Monochrome (black & white) ramps to match the old CS Notes app.
// color1 = app background (lightest in light mode) … color12 = primary text (darkest).
const lightGray = {
  color1: '#f5f5f5', // screen background (old app: light_white)
  color2: '#ffffff', // cards / surfaces (old app: white)
  color3: '#d3d3d3', // selected list item (old app: list_select)
  color4: '#e2e2e2', // borders / separators
  color5: '#d6d6d6',
  color6: '#c9c9c9',
  color7: '#b3b3b3',
  color8: '#8f8f8f',
  color9: '#696969', // muted (dates) — old app: grey
  color10: '#5c5c5c', // secondary text / icons
  color11: '#333333',
  color12: '#000000', // primary text — old app: black
  background: '#f5f5f5',
  backgroundHover: '#ececec',
  backgroundPress: '#e4e4e4',
  backgroundFocus: '#ececec',
  color: '#000000',
  colorHover: '#000000',
  colorPress: '#000000',
  colorFocus: '#000000',
  borderColor: '#e2e2e2',
  borderColorHover: '#d6d6d6',
  borderColorPress: '#c9c9c9',
  borderColorFocus: '#d6d6d6',
  placeholderColor: '#9a9a9a',
};

const darkGray = {
  color1: '#0d0d0d', // screen background
  color2: '#1a1a1a', // cards / surfaces
  color3: '#202020',
  color4: '#2a2a2a', // borders / separators
  color5: '#333333',
  color6: '#3f3f3f',
  color7: '#555555',
  color8: '#6f6f6f',
  color9: '#8a8a8a', // muted (dates)
  color10: '#a8a8a8', // secondary text / icons
  color11: '#d0d0d0',
  color12: '#f5f5f5', // primary text
  background: '#0d0d0d',
  backgroundHover: '#171717',
  backgroundPress: '#202020',
  backgroundFocus: '#171717',
  color: '#f5f5f5',
  colorHover: '#ffffff',
  colorPress: '#ffffff',
  colorFocus: '#ffffff',
  borderColor: '#2a2a2a',
  borderColorHover: '#333333',
  borderColorPress: '#3f3f3f',
  borderColorFocus: '#333333',
  placeholderColor: '#6f6f6f',
};

export const screenBackground = { light: lightGray.color1, dark: darkGray.color1 };
export const primaryText = { light: lightGray.color12, dark: darkGray.color12 };

const themes = {
  ...config.themes,
  light: { ...config.themes.light, ...lightGray },
  dark: { ...config.themes.dark, ...darkGray },
};

export const tamaguiConfig = createTamagui({ ...config, themes });

export default tamaguiConfig;

export type Conf = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
