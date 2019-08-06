import React, {Component} from 'react';
import {View, LayoutAnimation, StatusBar, BackHandler, PanResponder, Slider, TouchableOpacity, ActivityIndicator, Text, Dimensions, StyleSheet} from 'react-native';
import RnVideo from 'react-native-video';
import {timeFormat} from './utils/timeformat';
import Icon from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import Orientation from 'react-native-orientation';
import KeepAwake from 'react-native-keep-awake';

const {width, height} = Dimensions.get('window');

export default class Video extends Component{
    constructor(props) {
        super(props);
        this.state = {
            width: width,
            height: this.props.height||250,
            duration: 0,
            playableDuration: 0,
            currentTime: 0,
            current: 0,
            paused: false,
            isError: false,
            isEnd: false,
            isMoved: true,
            isSet: false,
            isBuffering: true,
            isSeeking: false,
            isShowBar: false,
            isFull: false,
            clickTime: 0,
        }
    }

    componentWillMount() {
        this._panResponder = PanResponder.create({
            // 要求成为响应者：
            onStartShouldSetPanResponder: (evt, gestureState) => true,
            onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
            onMoveShouldSetPanResponder: (evt, gestureState) => true,
            onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,
            // 开始手势操作
            onPanResponderGrant: (evt, gestureState) => this.onPanResponderGrant(evt, gestureState),
            // 移动距离
            onPanResponderMove: (evt, gestureState) => this.onPanResponderMove(evt, gestureState),
            onPanResponderTerminationRequest: (evt, gestureState) => true,
            // 结束手势操作
            onPanResponderRelease: (evt, gestureState) => this.onPanResponderRelease(evt, gestureState),
            onPanResponderTerminate: (evt, gestureState) => {
                // 另一个组件已经成为了新的响应者，所以当前手势将被取消。
            },
            onShouldBlockNativeResponder: (evt, gestureState) => {
                // 返回一个布尔值，决定当前组件是否应该阻止原生组件成为JS响应者
                // 默认返回true。目前暂时只支持android。
                return true;
            },
        });
        BackHandler.addEventListener('hardwareBackPress',  () => this.BackHandler());
    }

    componentWillUnmount(){
        this.timer&&clearTimeout(this.timer);
        Orientation.lockToPortrait();
        BackHandler.removeEventListener('hardwareBackPress', () => this.BackHandler())
    }

    /**
     * 后退
     */
    BackHandler() {
        if (this.state.isFull) {
            this._fullScreen();
            return true;
        }
        return false;
    }

    /**
     * 通知是否全屏
     */
    _onFullScreen(value){
        this.props.onFullScreen&&this.props.onFullScreen(value);
    }

    /**
     * 转屏
     */
    _fullScreen(){
        if(this.state.isFull){
            this.setState({
                isFull: false,
            }, () => {
                Orientation.lockToPortrait();
                this._onFullScreen(this.state.isFull);
            });
        }else{
            this.setState({
                isFull: true,
            }, () => {
                Orientation.lockToLandscape();
                this._onFullScreen(this.state.isFull);
            });
        }
    }

    /**
     * 双击暂停
     * @private
     */
    _doubleClickPause(){
        if(Math.round(new Date().getTime()) - this.state.clickTime <= 500){
            this._togglePlay();
        }else{
            this.setState({
                clickTime: Math.round(new Date().getTime()),
            })
        }
    }

    // 开始手势
    onPanResponderGrant(evt, gestureState) {
        // 判断手势移动
        // if(Math.abs(gestureState.dx)>0||Math.abs(gestureState.dy)>0){
        //     this.setState({
        //         isMoved: false
        //     })
        // }
        this._doubleClickPause();
    }

    onPanResponderMove(evt, gestureState) {
        if(!this.state.duration){
            if(Math.abs(gestureState.dx)>20||Math.abs(gestureState.dy)>20){
                this.setState({
                    isMoved: true
                })
            }
            return false
        }
        //进度
        if(Math.abs(gestureState.dx)>20&&Math.abs(gestureState.dy)<50){
            let current = this.state.currentTime+parseInt(gestureState.dx/10)*15;
            if(current < 0){
                current = 0;
            }
            if(current > this.state.duration){
                current = this.state.duration;
            }
            this.setState({
                current: current,
                isSet: true,
                isMoved: false,
            });
        }else{
            this.setState({
                isSet: false,
                isMoved: true,
            });
        }
    };

    onPanResponderRelease = (evt, gestureState) => {
        if(this.state.isSet){
            this.setState({
                isMoved: true,
                isSet: false
            }, () => this._toSeek(this.state.current, true));
        }
        if(this.state.isMoved){
            const {isShowBar} = this.state;
            if(isShowBar){
                this._hideBar();
            }else{
                this._showBar();
            }
        }
    };

    _hideBar = () => {
        this.timer&&clearTimeout(this.timer);
        LayoutAnimation.easeInEaseOut();
        this.setState({
            isShowBar:false
        })
    };

    _showBar = () => {
        this.timer&&clearTimeout(this.timer);
        LayoutAnimation.easeInEaseOut();
        this.setState({
            isShowBar:true
        });
        this.timer = setTimeout(()=>{
            this._hideBar()
        },5000)
    };

    _onBuffer(value){
        this.setState({
            isBuffering: value.isBuffering
        })
    }

    /**
     * 媒体加载并准备播放回调
     * @param value
     * @private
     */
    _onLoad(value){
        this.setState({
            height: (value.naturalSize.height/value.naturalSize.width)*width,
            duration: value.duration,
            playableDuration: value.duration,
            currentTime: value.currentTime,
            isBuffering: false,
        });
        KeepAwake.activate();
        this.props.startTime&&this._toSeek(this.props.startTime, true, true);
    }

    /**
     * Seek
     * @param value
     * @param bool
     * @param show
     */
    _toSeek(value,bool,show) {
        LayoutAnimation.easeInEaseOut();
        this.setState({
            currentTime: value,
        });
        if(bool){
            this.player.seek(value);
        }else{
            this.setState({
                isSeeking: true,
            })
        }
        if(show){
            this._showBar();
        }
    }

    _onProgress(data) {
        this.props.onProgress&&this.props.onProgress(data);
        if(!this.state.isSeeking){
            this.setState({
                currentTime: data.currentTime,
                playableDuration: data.currentTime,
                isSeeking: false,
                isError: false,
                isEnd: false,
            });
        }
    };

    _onError(data){
        this.setState({
            isError: true,
            isBuffering:false
        })
    }

    _onEnd(data){
        this.timer&&clearTimeout(this.timer);
        LayoutAnimation.easeInEaseOut();
        this.setState({
            paused: true,
            isEnd: true
        });
    }

    _togglePlay(){
        LayoutAnimation.easeInEaseOut();
        if(this.state.paused)
            KeepAwake.activate();
        else
            KeepAwake.deactivate();
        this.setState({
            paused: !this.state.paused
        })
    }

    render() {
        const {playableDuration, paused, isShowBar, isError, isEnd, isFull, isMoved, isBuffering, current, currentTime, duration} = this.state;
        const {titleLeft, themeColor, source, title} = this.props;
        return (
            <View
                style={[styles.container, isFull?{flex: 1}:{height: this.state.height, width: this.state.width}]}
            >
                <StatusBar hidden={isFull} />
                <RnVideo
                    style={styles.video}
                    ref={(ref) => this.player = ref}
                    source={source}
                    controls={false}
                    paused={paused}
                    resizeMode={'contain'}
                    onLoad={(value) => this._onLoad(value)}
                    onProgress={(value) => this._onProgress(value)}
                    onFullscreenPlayerWillPresent={(callback) => console.log(callback)}
                    onBuffer={(value) => this._onBuffer(value)}
                    onError={(value) => this._onError(value)}
                    onEnd={(value) => this._onEnd(value)}
                />
                <View {...this._panResponder.panHandlers} style={[styles.fullScreen, !isFull&&{flex: 1}, {zIndex:5}]}>
                    <ActivityIndicator pointerEvents="none" color={themeColor} size={isFull?'large':'small'} style={!isBuffering&&{opacity:0,zIndex:-1}} />
                    <Text pointerEvents="none" style={[styles.tips,{opacity:isError?1:0}]}>╮(╯﹏╰）╭ 抱歉，视频播放失败</Text>
                    {/*<Text pointerEvents="none" style={[styles.tips,{opacity:isEnd?1:0}]}>播放完成</Text>*/}
                    <Text pointerEvents="none" style={[styles.showTime, {opacity: isMoved?0:null}]}>
                        <Text style={{color:themeColor}}>{timeFormat(current)}</Text>
                        /{timeFormat(duration)}
                    </Text>
                </View>
                {
                    paused?<View
                        style={[styles.videoPause]}
                    >
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={() => this._togglePlay()}
                        >
                            <Icon name={'play-circle'} size={50} color={'#fff'} />
                        </TouchableOpacity>
                    </View>:null
                }
                <LinearGradient
                    colors={['rgba(0,0,0,.6)', 'rgba(255,255,255,0)']}
                    style={[styles.titlebar, !paused&&!isShowBar&&{top: isFull?-110:-70}, isFull&&{paddingHorizontal: 20}]}
                >
                    {
                        titleLeft
                    }
                    <Text
                        style={{color: '#fff', fontSize: 20}}
                    >{title}</Text>
                </LinearGradient>
                <LinearGradient
                    colors={['rgba(255,255,255,0)', 'rgba(0,0,0,.6)']}
                    style={[styles.videobar, !paused&&!isShowBar&&{bottom: isFull?-70:-40}, isFull&&{paddingHorizontal: 20}]}
                >
                    <TouchableOpacity
                        onPress={() => this._togglePlay()}
                        activeOpacity={1}
                    >
                        <Icon name={paused?'play-circle':'pause-circle'} size={20} color={'#fff'}/>
                    </TouchableOpacity>
                    <Text style={[styles.videotime, isFull&&{fontSize:14}]}>
                        {timeFormat(currentTime)+' / '+timeFormat(duration)}
                    </Text>
                    <Slider
                        style={styles.videosliderbar}
                        value={currentTime}
                        onValueChange={(value) => this._toSeek(value,false,true)}
                        onSlidingComplete={(value) => this._toSeek(value,true,true)}
                        maximumValue={duration}
                        maximumTrackTintColor="#fff"
                        minimumTrackTintColor={themeColor}
                        thumbTintColor={themeColor}
                    />
                    <TouchableOpacity
                        onPress={() => this._fullScreen()}
                        activeOpacity={1}
                    >
                        <Icon name={isFull?'compress':'expand'} size={20} color={'#fff'}/>
                    </TouchableOpacity>
                </LinearGradient>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#000',
        zIndex: -1,
    },
    video: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
    },
    fullScreen: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tips:{
        color:'#fff',
        position:'absolute'
    },
    showTime:{
        position: 'absolute',
        zIndex:20,
        backgroundColor:'rgba(255,255,255,.7)',
        color:'#333',
        fontSize:18,
        paddingHorizontal:10,
        paddingVertical:5,
        borderRadius:5
    },
    titlebar: {
        position: 'absolute',
        zIndex:10,
        left: 0,
        top: 0,
        right: 0,
        flexDirection:'row',
        alignItems: 'center',
        // backgroundColor:'rgba(255,255,255,.7)',
        paddingVertical: 5,
        paddingHorizontal: 10,
    },
    videoPause: {
        zIndex: 5,
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    videobar:{
        position: 'absolute',
        zIndex:10,
        left: 0,
        bottom: 0,
        right: 0,
        flexDirection:'row',
        alignItems: 'center',
        // backgroundColor:'rgba(255,255,255,.7)',
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    videotime:{
        fontSize:12,
        color:'#fff',
        paddingHorizontal:10,
    },
    videosliderbar: {
        flex: 1,
    }
});
