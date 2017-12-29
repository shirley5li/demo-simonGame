# demo-simonGame
A demo learned from freeCodeCamp.

User story:

I am presented with a random series of button presses.

Each time I input a series of button presses correctly, I see the same series of button presses but with an additional step.

I hear a sound that corresponds to each button both when the series of button presses plays, and when I personally press a button.

If I press the wrong button, I am notified that I have done so, and that series of button presses starts again to remind me of the pattern so I can try again.

I can see how many steps are in the current series of button presses.

If I want to restart, I can hit a button to do so, and the game will return to a single step.

I can play in strict mode where if I get a button press wrong, it notifies me that I have done so, and the game restarts at a new random series of button presses.

I can win the game by getting a series of 20 steps correct. I am notified of my victory, then the game starts over.

关于游戏中的声效，利用了HTML5 Web Audio API，可参考博客[利用HTML5 Web Audio API给网页JS交互增加声音](http://www.zhangxinxu.com/wordpress/2017/06/html5-web-audio-api-js-ux-voice/)。
另外，还有一些逻辑还搞不太清，回头需要再思考。

[demo on github pages](http://shirley5li.me/demo-simonGame/index.html)