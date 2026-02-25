import { registerRootComponent } from 'expo';

import App from './App';
import { registerServiceWorker } from './src/shared/utils/serviceWorker';
import { registerFontsWeb } from './src/shared/utils/registerFontsWeb';

// Inject vector-icons fonts for web explicitly
registerFontsWeb();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
registerServiceWorker();
