/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {Component} from 'react';
import Video from './src/Video';

export default class App extends Component{
    render() {
        return (
            <Video
                source={{uri: 'https://ifeng.com-l-ifeng.com/20190803/28355_135e0628/index.m3u8'}}
                themeColor={'red'}
                title={'哪吒'}
                // onFullScreen={(value) => console.log(value)}
                // startTime={1000}
                // onProgress={(event) => console.log(event)}
            />
        );
    }
}
