/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import { UIManager } from 'react-native';
import Video from './src/Video';

UIManager.setLayoutAnimationEnabledExperimental && UIManager.setLayoutAnimationEnabledExperimental(true);
AppRegistry.registerComponent(appName, () => App);
//
// export default Video;
