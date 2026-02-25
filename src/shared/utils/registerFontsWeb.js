import { Platform } from 'react-native';

export function registerFontsWeb() {
  if (Platform.OS !== 'web') return;

  const fonts = `
    @font-face {
      font-family: 'Ionicons';
      src: url('/fonts/Ionicons.ttf') format('truetype');
    }
    @font-face {
      font-family: 'Material Design Icons';
      src: url('/fonts/MaterialCommunityIcons.ttf') format('truetype');
    }
    @font-face {
      font-family: 'MaterialCommunityIcons';
      src: url('/fonts/MaterialCommunityIcons.ttf') format('truetype');
    }
  `;

  const style = document.createElement('style');
  style.type = 'text/css';
  if (style.styleSheet) {
    style.styleSheet.cssText = fonts;
  } else {
    style.appendChild(document.createTextNode(fonts));
  }
  document.head.appendChild(style);
}
