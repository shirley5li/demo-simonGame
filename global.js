/***不支持IE，适用在较高版本的Firefox, Chrome, Safari上***/

$(document).ready(function(){
  // 测试浏览器的Web Audio API, AudioContext对象 是HTML5 API，是一个专门用于音频处理的接口，
  //工作原理是将AudioContext创建出来的各种节点(AudioNode)相互连接，音频数据流经这些节点并作出相应处理
  
  var AudioContext = window.AudioContext // Default
    || window.webkitAudioContext // Safari and old versions of Chrome
    || false;//考虑浏览器兼容性

  if(!AudioContext) {
    //如果用户浏览器不存在AudioContext对象，则提示升级浏览器版本
    alert('Sorry, but the Web Audio API is not supported by your browser.'
    + ' Please, consider downloading the latest version of '
    + 'Google Chrome or Mozilla Firefox');
  } else {
    //浏览器存在AudioContext对象
    var audioCtx = new AudioContext();//将AudioContext对象实例化
    //发出的声音频率数据，表现为音调的高低
    var frequencies = [329.63,261.63,220,164.81];
    // 创建一个OscillatorNode, 它表示一个周期性波形（振荡），基本上来说创造了一个控制音调节点
    //（点击色块错误时的声音）
    var errOsc = audioCtx.createOscillator();
    // 指定音调的类型，即音调周期性振荡波形，其他还有square|sine|sawtooth
    errOsc.type = 'triangle';
    // 设置当前播放声音的频率(周期)，也就是最终播放声音的调调
    errOsc.frequency.value = 110;
    // 音调开始播放起点
    errOsc.start(0.0); //delay optional parameter is mandatory on Safari

    // 创建一个GainNode,它可以控制音频的总音量，即创建一个控制音量节点
    //（点击色块错误时的声音）
    var errNode = audioCtx.createGain();
    // 将音调和音量节点相关联
    errOsc.connect(errNode);
    //设置音量初始值
    errNode.gain.value = 0;
    // 将音量节点和终节点相关联
    // audioCtx.destination返回AudioDestinationNode对象，表示当前audio context中所有节点的最终节点，一般表示音频渲染设备
    errNode.connect(audioCtx.destination);

    //音量依次递增或递减需要处理的参数
    var ramp = 0.01;
    var vol = 0.5;

    //游戏状态对象
    var gameStatus = {};

    //游戏状态对象重置
    gameStatus.reset = function(){
      this.init();
      this.strict = false;
    };

    //游戏状态初始化
    gameStatus.init = function(){
      this.lastPush = $('#0');//最新点击的色块
      this.sequence = [];//记录依次正确点亮的色块序列，即首次电脑演示的色块序列
      // this.tStepInd = 0;
      this.index = 0;//记录色块序列的索引
      this.count = 0;//记录成功点亮的轮次数
      this.lock = false;//标识色块是否处于可点击状态
    };

    // 生成音调振荡器节点（点击色块正确时的声音）
    var oscillators = frequencies.map(function(frq){
      var osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frq;
      osc.start(0.0); //delay optional parameter is mandatory on Safari
      return osc;
    });
    // 生成音量节点（点击色块正确时的声音）
    var gainNodes = oscillators.map(function(osc){
      var g = audioCtx.createGain();
      osc.connect(g);
      g.connect(audioCtx.destination);
      g.gain.value = 0;//初始化音量为0
      return g;
    });

    // 正确点击色块声音，亮色+正确音
    function playGoodTone(num){
      // ramp秒后音量为线性变化到vol
      gainNodes[num].gain.linearRampToValueAtTime(vol, audioCtx.currentTime + ramp);
      gameStatus.currPush = $('#'+num);//获得正在点击的正确色块
      gameStatus.currPush.addClass('light');//通过添加.light类名，改变该色块的背景色为亮色
    };

    //正确点击色块后的声音及背景色变化，暗色+停止正确音
    function stopGoodTones(){
      if(gameStatus.currPush) gameStatus.currPush.removeClass('light');//如果gameStatus.currPush有值，即之前正确点击了该色块，则熄灭之前点亮状态
      gainNodes.forEach(function(g){
        // ramp秒后音量为线性变化到0
        g.gain.linearRampToValueAtTime(0, audioCtx.currentTime + ramp);
      });
      gameStatus.currPush = undefined;
      // gameStatus.currOsc = undefined;
    }

    // 错误点击色块声音
    function playErrTone(){
      errNode.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + ramp);
    }

    //错误点击色块后的声音变化
    function stopErrTone(){
      errNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + ramp);
    }

    //游戏开始逻辑
    function gameStart(){
      resetTimers();//重置定时器
      stopGoodTones();
      stopErrTone();
      $('.count').text('--').removeClass('led-off');
      flashMessage('--',1);
      gameStatus.init();
      addStep();
    }

    // 根据成功点亮的轮次数不同，设置不同阶段需要的点亮时间间隔
    function setTimeStep(num){
      var tSteps = [1250 , 1000 , 750, 500 ];
      if (num < 4)
        return tSteps[0];
      if (num < 8)
        return tSteps[1];
      if (num < 12)
        return tSteps[2];
      return tSteps[3];
    }

    // 点亮色块错误处理
    function notifyError(pushObj){
      // 游戏状态锁定
      gameStatus.lock = true;
      // 色块不可点击
      $('.push').removeClass('clickable').addClass('unclickable');
      // 错误提示音
      playErrTone();
      // 如果已经点击了某个错误色块
      if(pushObj) pushObj.addClass('light');// 将该错误点击色块点亮
      // 接下来的游戏状态处理
      gameStatus.toHndl = setTimeout(function(){
        // 停止错误提示音
        stopErrTone();
        // 熄灭点亮的错误色块
        if(pushObj) pushObj.removeClass('light');
        // 采用严格模式时的游戏状态严格处理函数
        gameStatus.toHndlSt = setTimeout(function(){
          // 若采用严格模式，游戏从头开始
          if(gameStatus.strict) gameStart();
            else playSequence();
        },1000);
      },1000);
      flashMessage('!!',2);
    };

    // 点亮色块正确处理函数，判断是否赢得比赛，20个就赢了。不是很懂这个地方！！！
    function notifyWin(){
      var cnt = 0;//正确点亮的色块数
      // 获得最后一个点击色块的id属性值
      var last = gameStatus.lastPush.attr('id');
      // 接下来的游戏状态色块处理函数
      gameStatus.seqHndl = setInterval(function(){
        //播放最新点击色块的正确提示音
        playGoodTone(last);
        // 停止播放正确提示音
        gameStatus.toHndl = setTimeout(stopGoodTones,80);
        cnt++;
        if(cnt === 8){
          clearInterval(gameStatus.seqHndl);
        }
      },160);
      flashMessage('**',2);
    }

    // 计数方格信息显示逻辑，输入参数为要显示的信息和信息闪烁次数
    function flashMessage(msg,times){
      // 将要显示的信息作为计数框框的文本信息
      $('.count').text(msg);
      var lf = function(){
        // 定义计数框框里的led闪烁效果逻辑，先将led熄灭，250毫秒后再点亮
        $('.count').addClass('led-off');
        gameStatus.toHndlFl = setTimeout(function(){
          $('.count').removeClass('led-off');
        },250);
      };
      var cnt = 0;//记录闪烁次数
      lf();
      // 游戏状态闪烁处理函数
      gameStatus.flHndl = setInterval(function(){
        lf();
        cnt++;
        if(cnt === times)
          clearInterval(gameStatus.flHndl);
      },500)
    }

    // 显示计数函数
    function displayCount(){
      // 如果获胜轮次小于10，则显示框框的最高位为0，否则为空字符串
      var p = (gameStatus.count < 10) ? '0' : '';
      $('.count').text(p+(gameStatus.count+''));
    }

    // 电脑依次点亮色块序列(同时伴随声音)
    function playSequence(){
      var i = 0;
      gameStatus.index = 0;
      gameStatus.seqHndl = setInterval(function(){
        displayCount();
        gameStatus.lock = true;
        playGoodTone(gameStatus.sequence[i]);
        gameStatus.toHndl = setTimeout(stopGoodTones,gameStatus.timeStep/2 - 10);
        i++;
        // 点亮完序列后取消定时
        if(i === gameStatus.sequence.length){
          clearInterval(gameStatus.seqHndl);
          $('.push').removeClass('unclickable').addClass('clickable');
          gameStatus.lock = false;
          gameStatus.toHndl = setTimeout(notifyError,5*gameStatus.timeStep);
        }
      },gameStatus.timeStep);
    }

    function addStep(){
      // 根据成功点亮的轮次数不同，设置不同阶段需要的点亮时间间隔
      gameStatus.timeStep = setTimeStep(gameStatus.count++);
      // 随机生成四个色块的序号0~3，并push进sequence数组。记得对随机产生的数取之整，千万记得，记得！！！！
      gameStatus.sequence.push(Math.floor(Math.random()*4));
      gameStatus.toHndl=setTimeout(playSequence,500);
    }

    // 重置定时器
    function resetTimers(){
      clearInterval(gameStatus.seqHndl);
      clearInterval(gameStatus.flHndl);
      clearTimeout(gameStatus.toHndl);
      clearTimeout(gameStatus.toHndlFl);
      clearTimeout(gameStatus.toHndlSt);
    }

    // 点击色块颜色处理逻辑
    function pushColor(pushObj){
      // 如果游戏状态没有锁定
      if(!gameStatus.lock) {
        // 清除游戏状态处理定时器
        clearTimeout(gameStatus.toHndl);
        // pushNr表示点击的色块的id属性值
        var pushNr = pushObj.attr('id');
        // 如果点击的该色块id和电脑演示的色块序列值一致
        if( pushNr == gameStatus.sequence[gameStatus.index] && gameStatus.index < gameStatus.sequence.length){
          // 播放正确点击提示音
          playGoodTone(pushNr);
          // 更新gameStatus.lastPush为刚刚点击的色块pushObj
          gameStatus.lastPush = pushObj;
          gameStatus.index++;
          // 如果游戏状态索引，即用户点击的某轮次的第index+1个色块索引，小于电脑该轮次生成的色块序列长度
          if(gameStatus.index < gameStatus.sequence.length){
            // 游戏状态错误检测处理
            gameStatus.toHndl = setTimeout(notifyError,5*gameStatus.timeStep);
          }else if (gameStatus.index == 20){//当电脑产生的序列长度为20时
            $('.push').removeClass('clickable').addClass('unclickable');
            // 测试最新的点击色块是否正确
            gameStatus.toHndl = setTimeout(notifyWin,gameStatus.timeStep);
          }else{
            $('.push').removeClass('clickable').addClass('unclickable');
            addStep();
          }
        }else{
          $('.push').removeClass('clickable').addClass('unclickable');
          notifyError(pushObj);
        }
      }
    }

    /***鼠标事件处理***/

    // 按下鼠标，执行pushColor()，判断点击色块是否跟给出的色块序列颜色一致，再播放相应的提示音
    $('.push').mousedown(function(){
      pushColor($(this));
    });

    // 抬起鼠标
    $('*').mouseup(function(e){
      e.stopPropagation();
      if(!gameStatus.lock)
        stopGoodTones();
    });

    // 切换严格模式
    function toggleStrict(){
      // 通过交替添加类名led-on来交替严格模式与一般模式
      $('#mode-led').toggleClass('led-on');
      gameStatus.strict = !gameStatus.strict;
    }

    // 点击电源开关按钮事件处理
    $('.sw-slot').click(function(){
      //通过给#pwr-sw元素交替添加switch-on类来切换开与关状态，即滑动橙色方格
      $('#pwr-sw').toggleClass('switch-on');
      // 游戏处于关闭状态
      if($('#pwr-sw').hasClass('switch-on')==false){
        // 游戏重置
        gameStatus.reset();
        $('.count').text('--');
        $('.count').addClass('led-off');
        $('#mode-led').removeClass('led-on');
        $('.push').removeClass('clickable').addClass('unclickable');
        $('#start').off('click');
        $('#mode').off('click');
        $('.btn').removeClass('unclickable').addClass('clickable');
        resetTimers();
        stopGoodTones();
        stopErrTone();
      }else{
        $('.btn').removeClass('unclickable').addClass('clickable');
        $('.count').removeClass('led-off');
        $('#start').click(gameStart);
        $('#mode').click(toggleStrict);
      }
    });

    gameStatus.reset();

  }
});
