Contents  内容
- Quick Start  快速入门
- Commands  命令
  - Digital Inputs  数字输入
    - Tap & Hold  点击并按住
    - Binding Modifiers  绑定修饰符
    - Simultaneous Press  同时印刷
    - Diagonal Press  对角线按压
    - Chorded Press  和弦出版社
    - Double Press  双击
    - Gyro Button  陀螺仪按钮
  - Analog Triggers  模拟触发器
    - Analog to digital  模拟信号转数字信号
    - Full pull and modes
全拉拔和模式
    - Adaptive Triggers  自适应触发器
  - Stick Configuration  棒状配置
    - Standard AIM mode  标准 AIM 模式
    - FLICK mode and variants
轻弹模式及其变体
    - Other mouse modes  其他鼠标模式
    - Digital modes  数字模式
    - Motion Stick and lean bindings
Motion Stick 和 Lean Bindings
  - Gyro Mouse Inputs  陀螺仪鼠标输入
  - Real World Calibration  实际校准
    - Prerequisites  先决条件
    - Calculating the real world calibration in a 3D game
在 3D 游戏中计算真实世界校准
    - Calculating the real world calibration in a 2D game
在 2D 游戏中计算真实世界校准
  - ViGEm Virtual Controller
ViGEm 虚拟控制器
    - Xbox bindings  Xbox 按键绑定
    - DS4 bindings  DS4 绑定
    - Virtual Controller Gyro  虚拟控制器陀螺仪
  - Modeshifts  模式转换
  - Touchpad  触摸板
    - Touch Sticks  触控杆
  - Miscellaneous Commands  杂项命令
- Configuration Files  配置文件
  - OnStartup.txt
  - OnReset.txt
  - Autoload feature  自动加载功能
  - Autoconnect feature  自动连接功能
- Troubleshooting  故障排除
- Known and Perceived Issues
已知问题和感知问题
- Credits  鸣谢
- Helpful Resources  实用资源
- License  执照
---
Quick Start  快速入门
1. Connect your controller either with a usb cable or via bluetooth. Most modern controllers will be suported, including all Xbox, Playstation and Switch controllers, although Xbox and many others don't have the gyro sensor required for gyro controls.
您可以使用 USB 数据线或蓝牙连接控制器。大多数现代控制器都受支持，包括所有 Xbox、PlayStation 和 Switch 控制器，但 Xbox 和许多其他控制器没有陀螺仪控制所需的陀螺仪传感器。
1. Run the JoyShockMapper executable, and you should see a console window welcoming you to JoyShockMapper.
运行 JoyShockMapper 可执行文件，您应该会看到一个控制台窗口，欢迎您使用 JoyShockMapper。
  - In the console you can start entering bindings : [button name] = [key name]. See Digital Inputs section for details on how buttons and keys are named.
在控制台中，您可以开始输入按键绑定：[按钮名称] = [按键名称]。有关按钮和按键命名方式的详细信息，请参阅 “数字输入”部分 。
  - Sticks, the gyro and analog triggers require some more configuration: typically some MODE you want to set, a sensitivity value and some other settings. Each is explained in the corresponding section. They follow the same format : [setting name] = [value]
摇杆 、 陀螺仪和模拟扳机需要进行一些额外的配置：通常需要设置模式、灵敏度值和其他一些设置。每项设置都在相应的章节中进行解释。它们的格式相同：[设置名称] = [值]
  - Buttons and settings will display their current values if you only enter their name in the console.
如果只在控制台中输入按钮和设置的名称，它们将显示当前值。
  - Settings can display a short description of what they do if you enter [setting name] HELP
输入[设置名称] HELP，即可查看设置的简要说明。
  - There are quite a few commands that do not work as assignments like above but just runs a function. For example RECONNECT_CONTROLLERS will update the controller listing, and RESET_MAPPINGS will set all settings and bindings to default. README will lead you to this document!
有很多命令并非像上面那样作为赋值语句使用，而是直接运行函数。例如，`RECONNECT_CONTROLLERS` 会更新控制器列表，而 `RESET_MAPPINGS` 会将所有设置和绑定恢复为默认值。README 文件会引导您找到本文档！
  - You will find a JoyShockMapper icon in the system tray: right click on it to display a quick list of commands and configuration files.
您会在系统托盘中找到 JoyShockMapper 图标：右键单击它以显示命令和配置文件的快速列表。
1. JoyShockMapper can load all the commands contained in a text file.
JoyShockMapper 可以加载文本文件中包含的所有命令。
  - Enter the file's path and name in the console. If the file path is too long, or contains unusual characters, enter the relative path instead (eg: GyroConfigs/config.txt).
在控制台中输入文件的路径和名称。如果文件路径过长或包含特殊字符，请改为输入相对路径（例如：GyroConfigs/config.txt）。
  - Every line of the text file will be run as a command typed directly into the console. The pound # symbol starts a comment until the end of the line and will be ignored by JoyShockMapper.
文本文件中的每一行都会作为直接在控制台中输入的命令运行。井号 (#) 表示注释，注释会一直持续到行尾，JoyShockMapper 会忽略它。
  - You can find example configuration files in the GyroConfigs folder. Files can refer one another : feel free to edit those in GyroConfigs as your customized gyro configuration for example.
您可以在 GyroConfigs 文件夹中找到示例配置文件。文件之间可以相互引用：您可以随意编辑 GyroConfigs 中的文件，例如，将其作为您自定义的陀螺仪配置。
  - Find more details in the Configuration Files section.
更多详情请参见 “配置文件” 部分。
1. If you're using a configuration that utilises gyro controls, the gyro will need to be calibrated (to be told what "not moving" is). See Gyro Mouse Inputs section for more info on that, but here's the short version:
如果您使用的是基于陀螺仪控制的配置，则需要对陀螺仪进行校准（以确定“静止”状态）。有关更多信息，请参阅 “陀螺仪鼠标输入”部分 ，但简而言之：
  - Put all controllers down on a still surface;
将所有控制器放在静止的表面上；
  - Enter the command RESTART_GYRO_CALIBRATION to begin calibrating them;
输入命令 RESTART_GYRO_CALIBRATION 开始校准；
  - After just a couple of seconds, enter the command FINISH_GYRO_CALIBRATION to finish calibrating them.
只需几秒钟，输入命令 FINISH_GYRO_CALIBRATION 即可完成校准。
  - These commands are also accessible via the tray icon contextual menu as well.
这些命令也可以通过托盘图标上下文菜单访问。
  - JoyShockMapper relies on a Real World Calibration value for some features such as flick stick. If you didn't find this value in the online database, check the Real World Calibration section to calculate it yourself.
JoyShockMapper 的某些功能（例如摇杆）依赖于实际校准值。如果您在在线数据库中找不到此值，请查看 “实际校准” 部分自行计算。
1. If you run into some issues, make sure you check the Troubleshooting section and Known and Perceived Issues. If you couldn't find your answer, you can find more help online on the GyroGaming subreddit and its affiliated Discord Server.
如果遇到问题，请务必查看 “故障排除” 部分和 “已知及疑似问题”部分 。如果找不到答案，您可以在 GyroGaming 子版块及其关联的 Discord 服务器上找到更多帮助。
Commands  命令
Commands can be executed by simply typing them into the JoyShockMapper console windows and hitting 'enter'. You can see the list of all available commands by entering HELP, or all commands containing STICK by typing HELP STICK for example. Since there's a quite a lot of them, they are organized in this document by what part of the controller or software they affect.
只需在 JoyShockMapper 控制台窗口中输入命令并按“回车”键即可执行命令。输入 HELP 可查看所有可用命令列表，例如，输入 HELP STICK 可查看所有包含 STICK 的命令。由于命令数量较多，本文档将根据命令影响的控制器或软件部分进行分类。
Commands can mostly be split into 8 categories:
命令大致可以分为 8 类：
1. Digital Inputs. These are the simplest. Map a button press or stick movement to a key or mouse button. There are many binding options available, such as tap & hold, simultaneous press, chorded press and more.
数字输入 。这是最简单的输入方式。您可以将按钮按下或摇杆移动映射到键盘或鼠标按钮。有很多绑定选项可供选择，例如点击并按住、同时按下、组合键按下等等。

---
1. Analog Triggers. Many controllers have 2 analog triggers: L2 and R2 on Playstation for example. JoyShockMapper can set different bindings on both "soft pull" and "full pull" of the trigger, maximizing use of those triggers.
模拟扳机键 。许多游戏手柄都配备两个模拟扳机键，例如 PlayStation 上的 L2 和 R2。JoyShockMapper 可以为扳机键的“轻扣”和“全扣”分别设置不同的按键绑定，从而最大限度地利用这些扳机键。
This feature is unavailable to controllers that have digital triggers, like the Nintendo Pro and Joycons.
此功能不适用于带有数字扳机的控制器，例如 Nintendo Pro 和 Joy-Con。

---
1. Stick Configuration. Joysticks can drive the mouse or trigger key presses in many different ways, such as flick stick or scroll wheel. They need to be set a mode, and some settings particular to that mode. This is all explained in this section.
摇杆配置 。游戏摇杆可以通过多种方式驱动鼠标或触发按键，例如甩动摇杆或滚轮。它们需要设置一种模式，以及一些特定于该模式的设置。本节将对此进行详细说明。

---
1. Gyro Mouse Inputs. Controlling the mouse with gyro generally provides far more precision than controlling it with a stick. Think of a gyro as a mouse on an invisible, frictionless mousepad. The mousepad extends however far you're comfortable rotating the controller.
陀螺仪鼠标输入 。使用陀螺仪控制鼠标通常比使用摇杆控制鼠标更加精准。你可以把陀螺仪想象成一只放在隐形、无摩擦的鼠标垫上的鼠标。鼠标垫的范围取决于你舒适地旋转控制器的角度。
For games where you control the camera directly, stick mouse inputs provide convenient ways to complete big turns with little precision, while gyro mouse inputs allow you to make more precise, quick movements within a relatively limited range.
对于可以直接控制摄像机的游戏，摇杆鼠标输入可以方便地以较低的精度完成大幅度的转弯，而陀螺仪鼠标输入则允许你在相对有限的范围内进行更精确、更快速的移动。

---
1. Real World Calibration. This calibration value makes it possible for flick stick to work correctly, for the gyro and aim stick settings to have meaningful real-life values, and for players to share the same settings between different games.
真实世界校准 。此校准值可确保摇杆正常工作，陀螺仪和瞄准摇杆的设置具有有意义的实际值，并使玩家能够在不同的游戏中共享相同的设置。
2. ViGEm Virtual Controller. JoyShockMapper can connect to Nefarius' ViGEm bus software to create virtual xbox controllers and virtual DS4 controllers. To make use of this feature you need to download and install the latest release at this link.
ViGEm 虚拟控制器 。JoyShockMapper 可以连接到 Nefarius 的 ViGEm 总线软件，创建虚拟 Xbox 控制器和虚拟 DS4 控制器。要使用此功能，您需要从此链接下载并安装最新版本 。
3. Modeshifts. The controller configuration can dynamically change depending on the current button presses, in a way akin to chorded presses. This is handy to handle weapon wheels for example. These are called modeshifts to echo the Steam Input naming convention.
模式切换 。控制器配置可以根据当前按键动态改变，类似于组合键操作。例如，这对于控制武器轮盘非常方便。之所以称之为模式切换，是为了与 Steam 输入的命名规则保持一致。
4. Miscellaneous Commands. These don't fit in the above categories, but are nevertheless useful. They typically are related to JoyShockMapper itself rather than the controller configuration.
杂项命令 。这些命令不属于上述类别，但仍然很有用。它们通常与 JoyShockMapper 本身相关，而不是与控制器配置相关。
So let's dig into the available commands.
那么让我们深入了解一下可用的命令。
1. Digital Inputs  1. 数字输入
Digital inputs are really simple. They are structured mostly like the following:
数字输入非常简单，其结构大多如下：
[Controller Input] = [Key or Mouse Button]
[控制器输入] = [按键或鼠标按钮]
For example, to map directional pad LEFT to the F1 key, you'd enter:
例如，要将方向键左映射到 F1 键，您需要输入：
LEFT = F1  左 = F1
One important feature of JoyShockMapper is that a configuration that works for a PlayStation controller works the same for a pair of JoyCons or a Pro Controller. Because JoyCons can have slightly more inputs than the DualShock 4, the button names are mostly from the Nintendo devices. The main exceptions are the face buttons and the stick-clicks. Because they are named more concisely, the stick-clicks are named after the DualShock 4: L3 and R3.
JoyShockMapper 的一个重要特性是，适用于 PlayStation 手柄的配置同样适用于 Joy-Con 或 Pro 手柄。由于 Joy-Con 的输入按键比 DualShock 4 略多，因此按键名称大多沿用了任天堂设备的名称。主要的例外是功能键和摇杆按键。由于摇杆按键的名称更为简洁，因此它们沿用了 DualShock 4 的名称： L3 和 R3 。
The face buttons are a more complicated matter.
面部按键的情况就比较复杂了。

---
The Xbox layout has become the defacto layout for PC controllers.
Xbox 的布局已经成为 PC 控制器的标准布局。
Most PC gamers who use some sort of controller will be familiar with the Xbox layout, whether from Xbox controllers, Steam controller, or other 3rd party controllers that can be interpreted by a game as an Xbox controller.
大多数使用某种控制器的 PC 游戏玩家都会熟悉 Xbox 的布局，无论是 Xbox 控制器、Steam 控制器，还是其他可以被游戏识别为 Xbox 控制器的第三方控制器。
Even PlayStation users will be somewhat used to interpreting Xbox face button names.
即使是 PlayStation 用户也会对 Xbox 的按键名称有所了解。
Nintendo devices have thesame face buttons in a different layout. X and Y are swapped, and so are A and B. Nintendo's layout has also been around for longer, but is less familiar to PC players.
任天堂设备的按键布局与 PC 不同 ，但功能相同 。X 键和 Y 键互换，A 键和 B 键也互换。任天堂的按键布局出现时间更长，但 PC 玩家可能不太熟悉。

---
So the best solution, in my opinion, is to use neither layout, and use an unambiguous layout with button names that aren't used by any controller, but still have obvious positions: the cardinal layout. North, East, South, West, denoted by N, E, S, W, respectively.
因此，我认为最好的解决方案是不使用这两种布局，而是使用一种明确的布局，按钮名称不会被任何控制器使用，但位置仍然很明显：即方位布局 。北、东、南、西分别用 N 、 E 、 S 、 W 表示。
So, here's the complete list of digital inputs:
以下是所有数字输入设备的完整列表：
UP, DOWN, LEFT, RIGHT: D-pad directional buttons
L: L1, LB or L the top left shoulder button
ZL: L2, LT or ZL the bottom left shoulder button (or trigger)
R: R1, RB or R, the top right shoulder button
ZR: R2, RT or ZR, the bottom right shoulder button
ZRF: Full pull binding of right trigger, only on controllers with analog triggers
ZLF: Full pull binding of left trigger, only on controllers with analog triggers
-: Share, Back or -
+: Options, Start or +
HOME: PS, Guide or Home
CAPTURE: Touchpad click or Capture
LSL, RSL: SL on JoyCons, or left paddles on Xbox elite
LSR, RSR: SR on JoyCons, or right paddles on Xbox elite
L3: L3 or Left-stick click
R3: R3 or Right-stick click
N: The North face button, △, Y (Xbox) or X (Nintendo)
E: The East face button, ○, B (Xbox) or A (Nintendo)
S: The South face button, ⨉, A (Xbox) or B (Nintendo)
W: The West face button, □, X (Xbox) or Y (Nintendo)
LUP, LDOWN, LLEFT, LRIGHT: Left stick tilted up, down left or right
LRING: Left ring binding, either inner or outer.
RUP, RDOWN, RLEFT, RRIGHT: Right stick tilted up, down, left or right
RRING: Right ring binding, either inner or outer.
MUP, MDOWN, MLEFT, MRIGHT: Motion stick tilted forward, back, left or right
MRING: Motion ring binding, either inner or outer.
LEAN_LEFT, LEAN_RIGHT: Tilt the controller to the left or right
TOUCH : The Playstation touchpad senses a finger
MIC: The Sony Dualsense microphone button
These can all be mapped to the following keyboard and mouse inputs:
这些功能都可以映射到以下键盘和鼠标输入：
0-9: number keys across the top of the keyboard
N0-N9: numpad number keys
ADD, SUBTRACT, DIVIDE, MULTIPLY, DECIMAL: numpad operator and decimal keys
F1-F29: F1, F2, F3... etc
A-Z: letter keys
UP, DOWN, LEFT, RIGHT: the arrow keys
LCONTROL, RCONTROL, CONTROL: left Ctrl, right Ctrl, generic Ctrl, respectively
LALT, RALT, ALT: left Alt, right Alt, generic Alt, respectively
LSHIFT, RSHIFT, SHIFT: left Shift, right Shift, generic Shift, respectively
LWINDOWS, RWINDOWS, CONTEXT: Both Windows keys and the context menu key
TAB, ESC, ENTER, SPACE, BACKSPACE, CAPS_LOCK, SCROLL_LOCK, NUM_LOCK, 
PAGEUP, PAGEDOWN, HOME, END, INSERT, DELETE
LMOUSE, MMOUSE, RMOUSE: mouse left click, middle click and right click respectively
BMOUSE, FMOUSE: mouse back (button 4) click and mouse forward (button 5) click respectively
SCROLLUP, SCROLLDOWN: scroll the mouse wheel up, down, respectively
VOLUME_UP, VOLUME_DOWN, MUTE: Volume controls
NEXT_TRACK, PREV_TRACK, STOP_TRACK, PLAY_PAUSE: media control
SCREENSHOT: print screen button
NONE, DEFAULT: No input
CALIBRATE: recalibrate gyro when pressing this input
GYRO_ON, GYRO_OFF: Enable or disable gyro
GYRO_INVERT, GYRO_INV_X, GYRO_INV_Y: Invert gyro, or in just the x or y axes, respectively
GYRO_TRACKBALL, GYRO_TRACK_X, GYRO_TRACK_Y: Keep last gyro input, or in just the x or y axes, respectively
; ' , . / \ [ ] + - `
"any console command": Any console command can be run on button press, including loading a file
SMALL_RUMBLE, BIG_RUMBLE, Rhhhh: rumble commands. The 'h' are capital hex digits, such as 'R8000' or 'RFFFF'
For example, in a game where R is 'reload' and E is 'use’, you can do the following to map □ to 'reload' and △ to 'use':
例如，在 R 代表“装弹”，E 代表“使用”的游戏中，你可以执行以下操作，将 □ 映射到“装弹”，将 △ 映射到“使用”：
W = R
N = E

---
Those familiar with Steam Input can implement Action Layers and Action Sets using the quotation marks to load a file on demand. That file can contain partial or full remapping of the controller bindings.
熟悉 Steam 输入的用户可以使用引号按需加载文件，从而实现动作层和动作集。该文件可以包含控制器按键的部分或全部重新映射。
This is very useful for having a different scheme for vehicles, menus or characters.
这对于为车辆、菜单或角色设置不同的方案非常有用。

---
# Load the driving control scheme.
HOME = "Autoload/GTA5/GTA_driving.txt" # That file should bind HOME to loading the walking scheme file!
Take note that the command bound in this way cannot contain quotation marks, and thus cannot contain the binding of a command itself. In this case, you should put the command in a file and load that file.
请注意，以这种方式绑定的命令不能包含引号，因此不能包含命令本身的绑定。在这种情况下，您应该将命令放在一个文件中并加载该文件。
1.1 Tap & Hold  1.1 轻按并按住

---
Since a keyboard has many more inputs available than most controllers, console games will often map multiple actions to the same button while the PC version has those actions mapped to different keys.
由于键盘比大多数控制器拥有更多的输入方式，主机游戏通常会将多个操作映射到同一个按键上，而 PC 版本则会将这些操作映射到不同的按键上。
In order to fit keyboard mappings onto a controller, JoyShockMapper allows you to map taps and holds of a button to different keyboard/mouse inputs.
为了将键盘映射适配到控制器上，JoyShockMapper 允许您将按钮的点击和按住映射到不同的键盘/鼠标输入。
So let's take that same game and make it so we can tap □ to 'reload' or hold □ to 'use':
那么，让我们在原有的游戏基础上，改为点击□键“重新加载”，按住□键“使用”：

---
W = R E
If you want □ to 'reload' when tapped, but do nothing at all when held, you can do the following:
如果您希望点击□时“重新加载”，但按住时不做任何操作，您可以执行以下操作：
W = R NONE
The time to hold the button before enabling the hold binding can be changed by assigning a number of milliseconds to HOLD_PRESS_TIME. The default value is 150 milliseconds.
可以通过给 HOLD_PRESS_TIME 赋值毫秒数来更改启用长按绑定前需要按住按钮的时间。默认值为 150 毫秒。
See the tap press and hold press event modifiers below for more details on how keybinds are applied.
有关按键绑定如何应用的更多详细信息，请参阅下面的点击、按下和按住事件修饰符。
1.2 Binding Modifiers  1.2 绑定修饰符

---
Taps and holds are the most common bindings used on a controller. But sometimes, you will find the need to require bindings that are somewhat more complicated, either because you want to work around an in-game behaviour, or you want to create some unusual key press combination.
轻按和长按是手柄上最常用的按键绑定方式。但有时，您可能需要更复杂的按键绑定，可能是因为您需要应对游戏中的某些行为，或者想要创建一些不常见的按键组合。
In any case, JoyShockMapper allows you to highly customize how mappings are assigned to your button through binding modifiers.
总之，JoyShockMapper 允许您通过绑定修饰符高度自定义按钮的映射方式。

---
Before we dive in, there's a few notions to understand. A key press always involves a key down and a key up action. In a simple binding, JoyShockMapper will match the button down and button up events with a key down and key up action respectively. However when you use Tap and Hold bindings, JoyShockMapper will bind the key down and key up to different events that will happen a certain time while the button is down and after the button is released. Some bindings do not have a matching "key up" action such as scroll wheel bindings and console command bindings.
在深入探讨之前，我们需要了解一些概念。按键操作总是包含按下和松开两个动作 。在简单的按键绑定中，JoyShockMapper 会将按键按下和松开事件分别对应到相应的按键按下和松开动作。但是，当您使用“点击并按住”绑定时，JoyShockMapper 会将按键按下和松开绑定到不同的事件 ，这些事件会在按键按下和松开的特定时间点发生。某些绑定没有对应的“松开”动作，例如滚轮绑定和控制台命令绑定。

---
There are two kinds of modifiers that can be applied to key bindings: action modifiers and event modifiers. They are represented by symbols added before and after the key name respectively. And each binding can only ever have one of each.
按键绑定可以应用两种类型的修饰符：动作修饰符和事件修饰符。它们分别用添加到按键名称之前和之后的符号表示。每个按键绑定只能包含一个动作修饰符和一个事件修饰符。
You can however have multiple keys bound to the same events, thus sending multiple key presses at once.
但是，您可以将多个按键绑定到同一事件，从而一次发送多个按键事件。

---
Action modifiers affect how the key down and key up actions are bound to the events. They come in three kinds: toggle (^), instant (!) and release (-).
动作修饰符会影响按键按下和按键抬起动作与事件的绑定方式。它们分为三种类型： 切换（^） 、 即时（!） 和释放（-） 。
- ^ Toggle makes it so that the key will alternate between applying and releasing the key at each press.
^切换功能使按键在每次按下时交替执行施加和释放操作。
- ! Instant will send the key up action very shortly after the key down, making it seem instant.
! Instant 会在按键按下后立即发送按键抬起动作，使其看起来像是瞬间完成的。
- Release simply sends the key up action. This can be used to clear toggles or process key up prematurely.
- Release 操作仅发送按键抬起动作。这可用于清除切换开关或提前处理按键抬起操作。
Event Modifiers affect what button events the key up and key down actions will be bound to. They come in five kinds: start press (\), release press (/), tap press ('), hold press (_),\ and turbo (+).
事件修饰符会影响按键抬起和按下动作绑定到哪些按键事件。它们有五种类型： 开始按下（\） 、 释放按下（/） 、 轻击按下（'） 、 按住按下（_） 、\ 和加速（+） 。
- \ Start press is the default event modifier when there is only a single key bind. It will apply the key down action as soon as the button is pressed and the key up when the button is released by default. This can be useful to have a key held while other keys are being activated.
当只有一个按键绑定时，“开始按下”是默认的事件修饰符。默认情况下，它会在按下按钮时触发按键按下动作，在松开按钮时触发按键抬起动作。这在需要按住某个按键的同时激活其他按键时非常有用。
- / Release press will apply the binding when the button is released. A binding on release press needs an action modifier to be valid.
/ 松开按钮时，释放按键操作将生效。释放按键操作的绑定需要有动作修饰符才能生效。
- ' Tap press is the default event modifier for the first key bind when there are multiple of them. It will apply the key press when the button is released if the total press time is less than the HOLD_PRESS_TIME. By default the key press is released a short time after, with that time being longer for gyro related actions and calibration.
“轻击”是多个按键绑定时第一个按键的默认事件修饰符。如果总按键时间小于 HOLD_PRESS_TIME ，则会在按键释放时触发按键事件。默认情况下，按键事件会在短时间内释放，而对于陀螺仪相关操作和校准，释放时间会更长。
- _ Hold press is the default event modifier for the second key bind when there are multiple of them. It will apply the key only after the button is held down for the HOLD_PRESS_TIME. By default, the key is released when the button is released as well.
当绑定了多个按键时，第二个按键的默认事件修饰符是“按住按下”。它只会在按键被按住 HOLD_PRESS_TIME 时间后才会触发该按键。默认情况下，松开按键时，该按键也会被释放。
- Turbo will apply a key press repeatedly (with consideration of action modifiers), resulting in a fast pulsing of the key. The turbo pulsing starts only after the button has been held for HOLD_PRESS_TIME.
+ Turbo 会重复按下某个键（并考虑动作修饰符），从而导致按键快速脉冲。Turbo 脉冲仅在按键按住 HOLD_PRESS_TIME 后开始。
These modifiers can enable you to work around in game tap and holds, or convert one form of press into another. Here's a few example of how you can make use of those modifiers.
这些修饰符可以帮助你绕过游戏中的点击和长按操作，或者将一种按压方式转换为另一种。以下是一些如何使用这些修饰符的示例。
ZL = ^RMOUSE\ RMOUSE_ # ADS toggle on tap and release the toggle on hold
E  = !C\ !C/          # Convert in game toggle crouch to regular press
UP = !1\ 1            # Convert Batarang throw double press to hold press
W  = R E\             # In Halo MCC, reload on tap but apply E right away to cover for in-game hold processing
-,S = SPACE+          # Turbo press for button mash QTEs. No one likes to button mash :(
R3 = !1\ LMOUSE+ !Q/  # Half life melee button
UP,UP = !ENTER\ LSHIFT\ !G\ !L\ !SPACE\ !H\ !F\ !ENTER/ # Pre recorded message
UP,E = BACKSPACE+     # Erase pre recorded message if I change my mind
Take note that the Simultaneous Press below introduce delays in the raising of the events (notably StartPress) until the right mapping is determined. Those time windows are not added but events will be pushed together within a poll callback or two.
请注意，下面的同步按下操作会在事件触发（尤其是 StartPress 事件）时引入延迟，直到确定正确的映射关系。这些时间窗口不会被叠加，但事件会在一到两次轮询回调中被合并在一起。
Also, Double Press bindings has some special timing handling in order to give the user the option to have the first binding skippable or not. See its dedicated section below for details
此外，双击绑定还有一些特殊的时序处理机制，以便用户可以选择是否跳过第一次绑定。详情请参见下文的专门章节 。
Finally, Here is a graph containing a comprehensive description of when the button events are raised over the course of a press.
最后，这里有一张图表，其中包含了按钮事件在按下过程中触发的详细描述。
                                        less than 150 ms hold time
    150 ms hold time    80ms turbo period          V         500 ms for gyro and calibration
            V                 V                    |------|< actions or 40 ms otherwise
______|-----|---|---|---|---|---|--|___________|---|____________
      \____________________________/           \___/      |
      |     |   |   |   |   |   |  |           |   |      |
     (a)   (b) (c) (c) (c) (c) (c)(d)         (a) (d)    (g)
           (c)                    (f)             (e)
a: start press \
b: hold press _
c: turbo +
d: release press /
e: tap press '
f: hold release
g: tap release
Events a, b, c, d and e have an Instant Release event attached to them 40ms after they occur.
1.3 Simultaneous Press  1.3 同时按压
JoyShockMapper additionally allows you to map simultaneous button presses to different mappings. For example you can bind character abilities on your bumpers and an ultimate ability on both like this:
JoyShockMapper 还允许您将同时按下的按键映射到不同的功能。例如，您可以将角色技能绑定到肩键，并将终极技能绑定到肩键和肩键上，如下所示：
L = LSHIFT # Ability 1
R = E      # Ability 2
L+R = Q    # Ultimate Ability

---
To enable a simultaneous binding, both buttons need to be pressed within a very short time of each other. Doing so will ignore the individual button bindings and apply the specified binding until either of the button is released.
要启用同时绑定，需要在极短的时间内同时按下两个按钮。这样做会忽略单个按钮的绑定设置，并应用指定的绑定，直到其中一个按钮被松开为止。
Simultaneous bindings also support tap & hold bindings as well as modifiers just like other mappings. This feature is great to add useful commands like gyro calibration and gyro control without taking away accessible buttons.
同时绑定功能也支持点击并按住绑定以及组合键，就像其他映射一样。这项功能非常棒，可以在不占用现有按键的情况下添加陀螺仪校准和陀螺仪控制等实用命令。

---
The time window in which both buttons need to be pressed can be changed by assigning a different number of milliseconds to SIM_PRESS_WINDOW. This setting cannot be changed by modeshift (covered later).
可以通过给 SIM_PRESS_WINDOW 分配不同的毫秒数来改变需要同时按下两个按钮的时间窗口。此设置无法通过模式切换（稍后介绍）进行更改。
1.4 Diagonal Press  1.4 对角线按压
Diagonal Presses is another way to apply a mapping on two separate buttons. It is designed specifically for diagonals of the dpad, face buttons and sticks, but it is not limited to those at all, and works with any two JSM Buttons.
斜向按键映射是另一种将功能映射到两个独立按键的方法。它专为方向键、功能键和摇杆的斜向按键而设计，但并不局限于这些，它适用于任意两个 JSM 按键。

---
Diagonal press work in a way similar to simultaneous presses, in that a separate binding is activated when two buttons are pressed at the same time. The difference is that they don't need to be pressed simultaneously.
斜向按压的工作原理与同时按压类似，即同时按下两个按钮时会激活一个单独的绑定。不同之处在于，斜向按压不需要同时按下两个按钮。
Instead the active binding of the first button pressed is released when the second button of the diagonal press is pressed.
相反，当按下对角线上的第二个按钮时，第一个被按下的按钮的活动绑定将被释放。
Then, releasing either of the two buttons will not only release the diagonal binding but also activate the binding of the other button.
然后，松开这两个按钮中的任何一个，不仅会解除对角线绑定，还会激活另一个按钮的绑定。

---
# Weapon Wheel 1~8 on the dpad
UP = 1
UP*RIGHT = 2     # Diagonal
RIGHT = 3
RIGHT*DOWN = 4   # Diagonal
DOWN = 5
DOWN*LEFT = 6    # Diagonal
LEFT = 7
LEFT*UP = 8      # Diagonal
Known Limitation  已知局限性
- Activating multiple diagonal presses at the same time lead to undetermined behaviour
同时按下多个对角线键会导致不确定的行为
1.5 Chorded Press  1.5 和弦出版社

---
Chorded press works differently from Simultaneous Press, despite being similar at first blush. A chorded press mapping allows you to override a button mapping when the chord button is down.
组合按键与同时按键虽然乍看之下相似，但其工作原理却截然不同。组合按键映射允许您在按下组合键时覆盖其他按键的映射。
This enables a world of different practical combinations, allowing you to have contextual bindings.
这可以实现各种各样的实用组合，使您可以进行上下文绑定。
Here's an example for Left 4 Dead 2, that would enable you to equip items without lifting the thumb from the left stick.
以下是《求生之路2》的一个例子，它可以让你在不将拇指从左摇杆上移开的情况下装备物品。

---
W = R E # Reload / Use
S = SPACE # Jump
E = CONTROL # Crouch
N = T # Voice Chat

L = Q NONE # Other weapon, hold to select with face button.
L,W = 3 # Explosives
L,S = 4 # Pills
L,E = 5 # Medpack
L,N = F # Flashlight

---
A button can be chorded with multiple other buttons. In this case, the latest chord takes precedence over previous chords. This can be understood as a stack of layers being put on top of the binding each time a chord is pressed, where only the top one is active.
一个按钮可以与其他多个按钮组合使用。在这种情况下，最新的组合会优先于之前的组合。这可以理解为每次按下组合键时，都会在绑定层之上叠加一层，而只有最顶层才会生效。
Notice that you don't need to have NONE as a binding : the chord binding could very well be bound to a button that brings up a weapon wheel for example.
请注意，您不必将 NONE 设置为绑定：例如，组合键绑定可以绑定到一个按钮，该按钮会弹出武器轮盘。

---
1.6 Double Press  1.6 双击
You can also assign the double press of a button to a different binding. Double press notation is the same as chorded button notation, except the button is chorded with itself. It supports taps & holds and modifiers like all previous entries.
您还可以将双击按钮的功能分配给不同的按键绑定。双击表示法与组合键表示法相同，区别在于组合键是将按钮自身连接起来。它支持点击和长按以及各种修饰键，与之前的所有功能一样。

---
The double press binding is applied when a down press occurs within 150 milliseconds from a previous down press. The regular binding will apply any on press event on the first press, but will only apply the tap binding if the second press is ommitted and with a delay.
双击绑定会在两次按下操作间隔 150 毫秒内发生时生效。常规绑定会在第一次按下时触发任何按下事件，但只有在省略第二次按下操作并延迟一段时间后才会触发点击绑定。
The double press binding also supports tap & hold bindings as well as modifiers.
双击绑定还支持点击并按住绑定以及修饰键。
The time window in which to perform the double press can be changed by assigning a different number of milliseconds toDBL_PRESS_WINDOW.
可以通过给 DBL_PRESS_WINDOW 分配不同的毫秒数来改变执行双击的时间窗口。

---
N = SCROLLDOWN # Cycle weapon
N,N = X        # Cycle weapon fire mode

W = !E\        # Pick up item
W,W = I        # Pick up item and open Inventory

E = C'         # Crouch
E,E = Z        # Don't crouch but go prone
1.7 Gyro Button  1.7 陀螺仪按钮
Lastly, there is one digital input that works differently, because it can overlap with any other input. Well, two inputs, but you'll use at most one of them in a given configuration:
最后，还有一个数字输入的工作方式有所不同，因为它可以与其他任何输入重叠。确切地说，是两个输入，但在给定的配置中，您最多只会使用其中一个：
GYRO_OFF
GYRO_ON

---
When you assign a button to GYRO_ON, gyro mouse only work while that button is pressed. GYRO_OFF disables the gyro while the button is pressed.
将按钮设置为 GYRO_ON 时，陀螺仪鼠标仅在按下该按钮时工作。 GYRO_OFF 则会在按下该按钮时禁用陀螺仪。
This is a really important feature absent from most games that have gyro aiming -- just as a PC gamer can temporarily "disable" the mouse by lifting it off the mousepad in order to reposition it, a gyro gamer should be able to temporarily disable the gyro in order to reposition it.
这是大多数具有陀螺仪瞄准功能的游戏中缺失的一个非常重要的功能——就像 PC 玩家可以通过将鼠标从鼠标垫上抬起来暂时“禁用”鼠标以重新定位一样，使用陀螺仪的玩家也应该能够暂时禁用陀螺仪以重新定位。
This binding doesn't affect other mappings associated with that button.
此绑定不会影响与该按钮关联的其他映射。
This is so that the gyro can be enabled alongside certain in-game actions, or so that the gyro can be disabled or enabled instantly regardless of what taps or holds are mapped to that button.
这样一来，就可以在执行某些游戏内操作时启用陀螺仪，或者无论该按钮映射了什么点击或按住操作，都可以立即禁用或启用陀螺仪。

---
For games that really need to use all the buttons available on the controller, but one of those inputs is rarely used and can be toggled easily (like crouching, for example), it might make sense to make that input tap-only, and make it double as the gyro-off button when held:
对于那些确实需要使用控制器上所有可用按钮的游戏，但其中一个输入很少使用且可以轻松切换（例如蹲伏），将该输入设置为仅单击即可，并在按住时兼作陀螺仪关闭按钮，这可能是一个合理的选择：
E = LCONTROL NONE
GYRO_OFF = E
Or if you really can't spare a button for disabling the gyro, you can use LEFT_STICK or RIGHT_STICK to disable the gyro while that input is being used:
或者，如果您实在没有多余的按钮来禁用陀螺仪，您可以在使用该输入时使用左摇杆或右摇杆来禁用陀螺仪：
GYRO_OFF = RIGHT_STICK # Disable gyro while aiming with stick
GYRO_OFF = RIGHT_STICK # 使用摇杆瞄准时禁用陀螺仪
I prefer to be able to use stick aiming (or flick stick) at the same time as aiming with the gyro, but this can still be better than having no way to disable the gyro at all if your game doesn't have an obvious function to tie to enabling gyro aiming (like a dedicated "aim weapon" button as is common in third-person action games).
我更喜欢能够同时使用摇杆瞄准（或拨动摇杆）和陀螺仪瞄准，但如果你的游戏没有明显的功能来启用陀螺仪瞄准（例如像第三人称动作游戏中常见的专用“瞄准武器”按钮），那么这仍然比完全无法禁用陀螺仪要好。
GYRO_ON is really useful for games where you only sometimes need to aim precisely. If ZL causes your character to aim their bow (like in Zelda: Breath of the Wild or Shadow of Mordor), maybe that's the only time you want to have gyro aiming enabled:
GYRO_ON 对于那些只需要偶尔精确瞄准的游戏来说非常有用。如果 ZL 键会让你的角色瞄准弓箭（例如在 《塞尔达传说：旷野之息》 或《中土世界： 暗影魔多 》中），那么可能只有在这种情况下你才需要启用陀螺仪瞄准：
ZL = RMOUSE   # Aim with Bow
GYRO_ON = ZL  # Turn on gyro when ZL is pressed
GYRO_ON and GYRO_OFF can also be bound as an action to particular buttons. Contrary to the command above, this takes the spot of the action binding. But you can still find creative ways with taps & holds or chorded press to bind the right gyro control where you need it.
GYRO_ON 和 GYRO_OFF 也可以绑定到特定按钮上。与上述命令不同，这种方式会占用操作绑定的位置。不过，您仍然可以利用点击和长按或组合键等方式，找到合适的方法来绑定所需的陀螺仪控制。
Take note that taps apply gyro-related bindings for half a second. Another option is inverting the gyro input with GYRO_INVERT. Such a binding can be handy if you play with a single joycon because you don't have a second stick. When that action is enabled, the inversion makes it so that you can recenter the hands by continuing to turn in the opposite direction!
请注意，轻击操作会将陀螺仪相关的绑定功能应用半秒钟。另一个选项是使用 GYRO_INVERT 反转陀螺仪输入。如果您只使用一个 Joy-Con 手柄（因为没有第二个摇杆），这种绑定功能会非常实用。启用此功能后，反转后的陀螺仪输入可以让您通过继续向相反方向转动来重新调整双手的位置！
SL + SR = GYRO_OFF GYRO_INVERT  # Disable for .5s / Invert axis on simultaneous bumper hold
Bound gyro actions like those have priority over the assigned gyro button should they conflict.
如果与指定的陀螺仪按钮发生冲突，则绑定的陀螺仪动作（例如上述动作）具有更高的优先级。
The command NO_GYRO_BUTTON can be used to remove the gyro-on or gyro-off mapping, making gyro always enabled. To have it always disabled, just set GYRO_ON = NONE or leave GYRO_SENS at 0.
命令 NO_GYRO_BUTTON 可用于移除陀螺仪开启或关闭的映射，使陀螺仪始终启用。要使其始终禁用，只需将 GYRO_ON = NONE 或将 GYRO_SENS 设置为 0 即可。

---
If you're using GYRO_TRACKBALL or its single-axis variants, you can use TRACKBALL_DECAY to choose how quickly the trackball effect loses momentum. It can be set to 0 for no decay. Its default value of 1 halves the gyro trackball's momentum over each second. 2 will halve it in 1/2 seconds, 3 in 1/3 seconds, and so on.
如果您使用的是 GYRO_TRACKBALL 或其单轴变体，则可以使用 TRACKBALL_DECAY 来选择轨迹球效果动量衰减的速度。将其设置为 0 表示无衰减。其默认值 1 表示每秒将陀螺仪轨迹球的动量减半。设置为 2 表示每 0.5 秒减半，设置为 3 表示每 1/3 秒减半，依此类推。
Some smoothing is applied when getting the trackball initial velocity in order to reduce the effects of noise or controller instability when pressing the button.
在获取轨迹球初始速度时会进行一些平滑处理，以减少按下按钮时噪声或控制器不稳定的影响。

---
2. Analog Triggers  2. 模拟触发器
2.1 Analog to digital  2.1 模拟到数字转换
The following section does not apply to Joycons and Switch Pro controllers because they only have digital triggers.
以下部分不适用于 Joy-Con 和 Switch Pro 控制器，因为它们只有数字扳机。

---
Analog triggers report a value between 0% and 100% representing how far you are pulling the trigger. Binding a digital button to an analog trigger is done using a threashold value.
模拟触发器会报告一个介于 0% 到 100% 之间的值，表示您扣动扳机的程度。将数字按钮绑定到模拟触发器是通过设置阈值来实现的。
The button press is sent when the trigger value crosses the threashold value, sitting between 0% and 100%. The default threashold value is 0, meaning the slightest press of the trigger sends the button press.
当触发值超过阈值（介于 0% 和 100% 之间）时，就会发送按钮按下事件。默认阈值为 0，这意味着即使最轻微地按下触发器也会发送按钮按下事件。
This is great for responsiveness, but could result in accidental presses.
这对于提高响应速度来说很好，但可能会导致误触。
The threashold can be customized by running the following command:
可以通过运行以下命令自定义阈值：

---
TRIGGER_THRESHOLD = 0.5   #Send Trigger values at half press
The same threashold value is used for both triggers. A value of 1.0 or higher makes the binding impossible to reach.
两个触发器使用相同的阈值。阈值设为 1.0 或更高时，绑定将无法达成。

---
Hair trigger is also implemented: to enable it, assign a value of -1 as the trigger threshold. When hair trigger is used, the binding is enabled when the trigger is being pressed and held, and released when the trigger is being released.
还实现了灵敏触发功能：要启用此功能，请将触发阈值设置为 -1。启用灵敏触发功能后，按住扳机键时绑定功能启用，松开扳机键时绑定功能解除。
This allows quick tap shooting by pulsing the trigger.
这样就可以通过快速按压扳机来实现快速连发。

---
2.2 Full pull and modes
2.2 全拉拔模式
JoyShockMapper can assign different bindings to the full pull of the trigger, allowing you to double the number of bindings put on the triggers. The way the trigger handles these bindings is set with the variables ZR_MODE and ZL_MODE, for R2 and L2 triggers. Once set, you can assign keys to ZRF and ZLF to make use of the R2 and L2 full pull bindings respectively. In this context, ZL and ZR are called the soft pull binding because they activate before the full pull binding does at 100%. Here is the list of all possible trigger modes.
JoyShockMapper 可以为扳机键的完全扣动分配不同的按键绑定，从而使扳机键的绑定数量翻倍。扳机键处理这些绑定的方式由变量 ZR_MODE 和 ZL_MODE 设置，分别对应 R2 和 L2 扳机键。设置完成后，您可以将按键分配给 ZRF 和 ZLF ，以分别使用 R2 和 L2 的完全扣动绑定。在此上下文中， ZL 和 ZR 被称为“轻扣绑定”，因为它们会在完全扣动绑定（即 100% 扣动）之前激活。以下是所有可能的扳机模式列表。
NO_FULL (default): Ignore full pull binding. This mode is enforced on controllers who have digital triggers.
NO_SKIP: Never skip the soft pull binding. Full pull binding activates anytime the trigger is fully pressed.
NO_SKIP_EXCLUSIVE: Never skip the soft pull binding. When Full pull binding is active, the soft pull binding isn't.
MUST_SKIP: Only send full pull binding on a quick full press of the trigger, ignoring soft pull binding.
MAY_SKIP: Combines NO_SKIP and MUST_SKIP: Soft binding may be skipped on a quick full press, and full pull can be activated on top of soft pull binding.
MUST_SKIP_R: Responsive version of MUST_SKIP. See below.
MAY_SKIP_R: Responsive version of MAY_SKIP. See below.
For example, in Call of Duty you have a binding to hold your breath when aiming with a sniper. You can bind ADS on a soft trigger press and hold breath on the full press like this:
例如，在《使命召唤》中，你可以设置一个按键绑定，让狙击枪瞄准时可以屏住呼吸。你可以将轻按扳机绑定到瞄准，将完全按下扳机绑定到屏住呼吸，就像这样：
ZL_MODE = NO_SKIP   # Enable full pull binding, never skip ADS
ZL = RMOUSE         # Aim Down Sights
ZLF = LSHIFT        # Hold breath
Using NO_SKIP mode makes it so that LSHIFT is only active if RMOUSE is active as well. Then on the right trigger, you can bind your different attack bindings: use the skipping functionality to avoid having them conflict with eachother like this:
使用 NO_SKIP 模式后，只有当鼠标右键也处于激活状态时，左 Shift 键才会激活。然后，你可以在右扳机键上绑定不同的攻击键：使用跳过功能可以避免它们相互冲突，如下所示：
TRIGGER_THRESHOLD = -1 # Use hair trigger for primary fire
ZR_MODE = MUST_SKIP    # Enable full pull binding, soft and full bindings are mutually exclusive
ZR = LMOUSE            # Primary Fire
ZRF = V G              # Quick full tap to melee; Quick hold full press to unpin grenade and throw on release
Using MUST_SKIP mode makes sure that once you start firing, reaching the full pull will not make you stop firing to melee.
使用 MUST_SKIP 模式可确保一旦开始射击，达到最大拉力后不会停止近战射击。

---
The "Responsive" variants of the skip modes enable a different behaviour that can give you a better experience than the original versions in specific circumstances.
跳过模式的“响应式”变体实现了不同的行为，在特定情况下可以为您带来比原始版本更好的体验。
A typical example is when the soft binding is a mode-like binding like ADS or crouch, and there is no hold or simultaneous press binding on that soft press.
一个典型的例子是，当软按键绑定是类似 ADS 或蹲伏的模式绑定时，并且该软按键没有按住或同时按下的绑定。
The difference is that the soft binding is actived as soon as the trigger crosses the threshold, giving the desired responsive feeling, but gets removed if the full press is reached quickly, thus still allowing you to hip fire for example.
区别在于，当扳机越过阈值时，软绑定就会激活，从而提供所需的响应感，但如果快速达到完全按下，软绑定就会被移除，因此仍然可以让你进行腰射等操作。
This will result in a hopefully negligeable scope glitch but grants a snappier ADS activation.
这可能会导致瞄准镜出现轻微故障（希望可以忽略不计），但可以实现更迅速的瞄准镜激活。

---
2.3 Adaptive Triggers  2.3 自适应触发器

---
The Dualsense controller features adaptive trigger that allow software to control the force feedback applies on the triggers. JoyShockMapper makes use of this feature to provide useful feedback depending on the trigger mode and position of the trigger.
DualSense 控制器配备了自适应扳机功能，软件可以通过控制扳机上的力反馈来调节力度。JoyShockMapper 利用此功能，根据扳机模式和位置提供相应的反馈。
If you don't want JSM to use this feature, it can be disbaled across the board with the following command:
如果您不希望 JSM 使用此功能，可以使用以下命令将其全部禁用：

---
ADAPTIVE_TRIGGER = OFF # Don't use force feedback in my triggers

---
While adaptive triggers are enabled, the Dualsense controller will ignore hair trigger threshold, and consider it to be simply threshold zero. This is because the adaptive triggers fulfill the purpose of hair triggers by restricting uneccessary travelling distance.
启用自适应扳机后，DualSense 控制器将忽略灵敏扳机的触发阈值，并将其视为零阈值。这是因为自适应扳机通过限制不必要的行程来实现灵敏扳机的功能。
With adaptive triggers turned off, regular hair trigger is then accessible.
关闭自适应触发器后，即可使用普通的微动触发器。

---
Each trigger and each devices might have slightly different trigger properties, which causes a mismatch between the reported trigger position and the position setting in the resistance packet.
每个触发器和每个设备可能具有略微不同的触发特性，这会导致报告的触发位置与电阻包中的位置设置不匹配。
Each trigger thus gets 2 new settings, an offset and a range, that can be determined through a single-time calibration procedure.
因此，每个触发器都会获得 2 个新设置，即偏移量和范围，这些设置可以通过一次性校准程序确定。
You can start this procedure by entering the commandCALIBRATE_TRIGGERS : you will be required to gently press on a trigger just until you feel the resistance push back. Then you press a button and you will feel the trigger slowly lower : make sure you press gently.
您可以通过输入命令 CALIBRATE_TRIGGERS 来启动此过程：您需要轻轻按下扳机，直到感觉到阻力回弹。然后按下按钮，您会感觉到扳机缓慢下降：请务必轻柔按压。
Once you reach full press JSM will display to you the calculated offset and range for your trigger. The same procedure is done on the other trigger after.
完全按下扳机后，JSM 将显示计算出的扳机偏移量和作用范围。之后对另一个扳机执行相同的操作。

---
You should set these values in your OnReset.txt file so that they are always set properly for your controller.
您应该在 OnReset.txt 文件中设置这些值，以便您的控制器始终能够正确设置这些值。
LEFT_TRIGGER_OFFSET = 20     # My DS trigger calibration values
LEFT_TRIGGER_RANGE = 167
RIGHT_TRIGGER_OFFSET = 31
RIGHT_TRIGGER_RANGE = 175
User Nielk1 has reverse engineered the adaptive trigger data and developped a C# utility for it. With his permission (and under MIT licence) I've C++-ified the code and integrated it into JSM. Two new settings are then available LEFT_TRIGGER_EFFECT and RIGHT_TRIGGER_EFFECT. They can be set to OFF or ON (JSM handling) or be provided with one of Nielk1's functions.
用户 Nielk1 对自适应触发数据进行了逆向工程，并开发了一个 C# 工具 。经他许可（并遵循 MIT 许可证），我将该代码转换为 C++ 并集成到 JSM 中。现在可以使用两个新的设置： LEFT_TRIGGER_EFFECT 和 RIGHT_TRIGGER_EFFECT 。它们可以设置为 OFF 或 ON（由 JSM 处理），也可以使用 Nielk1 提供的函数之一。
RESISTANCE start[0 9] force[0 8]: Some resistance starting at point
BOW start[0 8] end[0 8] forceStart[0 8] forceEnd[0 8]: increasingly strong resistance
GALLOPING start[0 8] end[0 9] foot1[0 6] foot2[0 7] freq[Hz]: Two pulses repeated periodically
SEMI_AUTOMATIC start[2 7] end[0 8] force[0 8]: Trigger effect
AUTOMATIC start[0 9] strength[0 8] freq[Hz]: Regular pulse effect
MACHINE start[0 9] end[0 9] force1[0 7] force2[0 7] freq[Hz] period: Irregular pulsing
3. Stick Configuration  3. 棒状配置
Each stick has 8 different operation modes when you're not using a virtual controller:
在不使用虚拟控制器时，每个摇杆都有 8 种不同的操作模式：
AIM: traditional stick aiming
FLICK: flick stick
FLICK_ONLY: flick stick without rotation after tilting the stick
ROTATE_ONLY: flick stick rotation without the initial flick
MOUSE_RING: stick angle sets the mouse position on a circle directly around the center of the screen
MOUSE_AREA: stick position sets the cursor in a circular area around the neutral position
NO_MOUSE: don't affect the mouse, use button mappings (default)
SCROLL_WHEEL: enable left and right bindings by rotating the stick counter-clockwise or clockwise.
HYBRID_AIM: adds together traditional behavior of a stick with a mouse-like behavior.
The mode for the left and right stick are set like so:
左右摇杆的模式设置如下：
LEFT_STICK_MODE = NO_MOUSE
RIGHT_STICK_MODE = AIM
Regardless of what mode you're in, you can have additional input bound to a partial or full tilt of either stick. For example, you might want to always be pressing LSHIFT when the stick is fully tilted:
无论你处于哪种模式，你都可以将额外的输入绑定到摇杆的部分或完全倾斜上。例如，你可能希望在摇杆完全倾斜时始终按下左 Shift 键：
LEFT_RING_MODE = OUTER # OUTER is default, so this line is optional
LRING = LSHIFT
Or you might want to always be pressing LALT when the stick is only partially tilted:
或者，你可能希望在摇杆只部分倾斜时始终按下 LALT 键：
LEFT_RING_MODE = INNER
LRING = LALT
For backwards compatibility reasons, there are two extra options for LEFT_STICK_MODE and RIGHT_STICK_MODE that set the corresponding STICK_MODE and RING_MODE at the same time:
出于向后兼容性的考虑， LEFT_STICK_MODE 和 RIGHT_STICK_MODE 各有两个额外的选项，它们可以同时设置相应的 STICK_MODE 和 RING_MODE：
INNER_RING: Same as _STICK_MODE = NO_MOUSE and _RING_MODE = INNER
OUTER_RING: Same as _STICK_MODE = NO_MOUSE and _RING_MODE = OUTER
If you're holding the controller in an unusual orientation (such as for comfort reasons or when using a single JoyCon), you can set CONTROLLER_ORIENTATION to reflect how you're holding the controller:
如果您以不寻常的方向握持控制器（例如出于舒适性考虑或使用单个 Joy-Con 时），您可以设置 CONTROLLER_ORIENTATION 来反映您握持控制器的方式：
- FORWARD is the default.
FORWARD 是默认值。
- LEFT is for when you're holding the controller rotated to its left.
LEFT 指的是当你握住控制器并将其向左旋转时。
- RIGHT is for when you're holding the controller rotated to its right.
右是指你握住控制器时将其向右旋转。
- BACKWARD is for when you're holding teh controller rotated 180°.
BACKWARD 指的是当你握住旋转了 180° 的控制器时。
- JOYCON_SIDEWAYS means LEFT for the left hand joycon, RIGHT for the right hand joycon, FORWARD for all other controllers.
JOYCON_SIDEWAYS 表示左手 Joy-Con 手柄向左移动，右手 Joy-Con 手柄向右移动，其他所有控制器向前移动。
Once set, JoyShockMapper will rearrange the stick's X and Y axis data to match your perspective. CONTROLLER_ORIENTATION only affects sticks (including motion stick). It doesn't affect the arrangement of the face buttons, d-pad, etc. Look up Gyro Mouse Inputs section for how to remap gyro axis to mouse axis.
设置完成后，JoyShockMapper 会重新排列摇杆的 X 轴和 Y 轴数据以匹配您的视角。CONTROLLER_ORIENTATION 仅影响摇杆（包括体感摇杆），不会影响功能键、方向键等的排列。有关如何将陀螺仪轴重新映射到鼠标轴，请参阅 “陀螺仪鼠标输入” 部分。
Let's have a look at all the different operations modes.
让我们一起来看看所有不同的操作模式。
3.1 Standard AIM mode  3.1 标准 AIM 模式
When using the AIM stick mode, there are a few important commands:
使用 AIM 摇杆模式时，有几个重要的命令：
- STICK_SENS (default 360.0) - How fast does the stick move the camera when tilted fully? The default, when calibrated correctly, is 360 degrees per second. Assign a second value if you desire a different vertical sensitivity from the horizontal sensitivity.
STICK_SENS （默认值 360.0）- 当摇杆完全倾斜时，摇杆移动摄像机的速度是多少？默认值（正确校准后）为每秒 360 度。如果您希望垂直灵敏度与水平灵敏度不同，请指定第二个值。

---
- STICK_POWER (default 1.0) - What is the shape of the curve used for converting stick input to camera turn velocity?
STICK_POWER （默认值 1.0）- 用于将摇杆输入转换为相机转动速度的曲线形状是什么？
1.0 is a simple linear relationship (half-tilting the stick will turn at half the velocity given by STICK_SENS), 0.5 for square root, 2.0 for quadratic, etc. Minimum value is 0.0, which means any input beyond STICK_DEADZONE_INNER will be treated as a full press as far as STICK_SENS is concerned.
1.0 表示简单的线性关系（摇杆倾斜一半，转动速度为 STICK_SENS 的一半），0.5 表示平方根关系，2.0 表示二次关系，以此类推。最小值为 0.0，这意味着任何超出 STICK_DEADZONE_INNER 的输入，就 STICK_SENS 而言，都将被视为完全按下。

---
- LEFT_STICK_AXIS and RIGHT_STICK_AXIS (default STANDARD) - This allows you to invert stick axes if you wish. Your options are STANDARD (default) or INVERTED (flip the axis). To assign a separate vertical value, provide a second parameter.
LEFT_STICK_AXIS 和 RIGHT_STICK_AXIS （默认值：STANDARD）——您可以根据需要反转摇杆轴。选项为 STANDARD（默认值）或 INVERTED（反转轴）。要指定单独的垂直值，请提供第二个参数。

---
- STICK_ACCELERATION_RATE (default 0.0 multiplier increase per second) - When the stick is pressed fully, this option allows you to increase the camera turning velocity over time. The unit for this setting is a multiplier for STICK_SENS per second.
STICK_ACCELERATION_RATE （默认值：每秒增加 0.0 倍率） - 当摇杆完全按下时，此选项允许您随时间增加摄像机的旋转速度。此设置的单位是每秒 STICK_SENS 的倍率。
For example, 2.0 with a STICK_SENS of 100 will cause the camera turn rate to accelerate from 100 degrees per second to 300 degrees per second over 1 second.
例如，当 STICK_SENS 为 100 时，2.0 版本会导致相机旋转速度在 1 秒内从每秒 100 度加速到每秒 300 度。

---
- STICK_ACCELERATION_CAP (default 1000000.0 multiplier) - You may want to set a limit on the camera turn velocity when STICK_ACCELERATION_RATE is non-zero. For example, setting STICK_ACCELERATION_CAP to 2.0 will mean that your camera turn speed won't accelerate past double the STICK_SENS setting.
STICK_ACCELERATION_CAP （默认值为 1000000.0） - 当 STICK_ACCELERATION_RATE 非零时，您可能需要限制摄像机的转动速度。例如，将 STICK_ACCELERATION_CAP 设置为 2.0 意味着摄像机的转动速度不会超过 STICK_SENS 设置的两倍。
This has no effect when STICK_ACCELERATION_RATE is zero.
当 STICK_ACCELERATION_RATE 为零时，此操作无效。

---
- STICK_DEADZONE_INNER and STICK_DEADZONE_OUTER (default 0.15 and 0.1, respectively) - Controller thumbsticks can be a little imprecise. When you release the stick, it probably won't return exactly to the centre. STICK_DEADZONE_INNER lets you say how much of the stick's range will be considered "centre".
STICK_DEADZONE_INNER 和 STICK_DEADZONE_OUTER （默认值分别为 0.15 和 0.1）—— 手柄摇杆的精准度可能略有不足。松开摇杆后，它可能不会完全回到中心位置。STICK_DEADZONE_INNER 参数允许您设置摇杆行程中“中心”位置的判定范围。
If the stick position is within this distance from the centre, it'll be considered to have no stick input. STICK_DEADZONE_OUTER does the same for the outer edge. If the stick position is within this distance from the outer edge, it'll be considered fully pressed.
如果摇杆位置与中心点之间的距离在此范围内，则视为没有摇杆输入。STICK_DEADZONE_OUTER 对外侧边缘执行相同的操作。如果摇杆位置与外侧边缘之间的距离在此范围内，则视为完全按下。
Everything in-between is scaled accordingly.
介于两者之间的所有数值都会相应调整比例。
You can set the deadzones individually for each stick withLEFT_STICK_DEADZONE_INNER, LEFT_STICK_DEADZONE_OUTER, RIGHT_STICK_DEADZONE_INNER, RIGHT_STICK_DEADZONE_OUTER.
你可以使用 LEFT_STICK_DEADZONE_INNER 、 LEFT_STICK_DEADZONE_OUTER 、 RIGHT_STICK_DEADZONE_INNER 、 RIGHT_STICK_DEADZONE_OUTER 分别设置每个摇杆的死区。

---
3.2 FLICK mode and variants
3.2 轻弹模式及其变体

---
When using the FLICK stick mode, there is less to configure. There are no deadzones and no sensitivity.
使用 FLICK 摇杆模式时，需要配置的选项更少。没有死区，也没有灵敏度设置。
When you press the stick in a direction, JoyShockMapper just takes the angle of the stick input and translates it into the same in-game direction relative to where your camera is already facing, before smoothly moving the camera to point in that direction in a small fraction of a second.
当你朝某个方向推动摇杆时，JoyShockMapper 会获取摇杆输入的角度，并将其转换为游戏中相对于摄像机当前朝向的相同方向，然后在极短的时间内平滑地将摄像机指向该方向。
Once already pressed, rotating theflick stick X degrees will then instantly turn the in-game camera X degrees. This provides a very natural way to quickly turn around, respond to gun-fire from off-screen, or make gradual turns without moving the controller.
按下摇杆后，旋转摇杆 X 度即可立即将游戏内视角旋转 X 度。这提供了一种非常自然的方式，可以快速转身、应对屏幕外的枪击，或在不移动控制器的情况下进行缓慢转向。

---
Since flick stick only turns the camera horizontally, it's generally only practical in combination with gyro aiming that can handle vertical aiming.
由于拨动摇杆只能水平旋转相机，因此它通常只有与能够进行垂直瞄准的陀螺仪瞄准结合使用才实用。
Flick stick will use the above-mentioned STICK_DEADZONE_OUTER to decide if the stick has been pressed far enough for a flick or rotation. Flick stick relies on REAL_WORLD_CALIBRATION to work correctly (covered later, as it affects all inputs that translate to mouse-movements). This is because JoyShockMapper can only point the camera in a given direction by making the right mouse movement, and REAL_WORLD_CALIBRATION helps JoyShockMapper calculate what that movement should be. A game that natively implements flick stick would have no need for calibration. Flick stick has a few settings if you really want to mess with it:
拨动摇杆会使用前面提到的 STICK_DEADZONE_OUTER 来判断摇杆是否被按下到足以进行拨动或旋转的程度。 拨动摇杆依赖于 REAL_WORLD_CALIBRATION 才能正常工作（ 稍后会详细介绍 ，因为它会影响所有转换为鼠标移动的输入）。这是因为 JoyShockMapper 只能通过正确的鼠标移动来将镜头指向特定方向，而 REAL_WORLD_CALIBRATION 可以帮助 JoyShockMapper 计算出正确的鼠标移动方向。原生支持拨动摇杆的游戏则无需进行校准。如果您想对拨动摇杆进行一些自定义设置，可以使用以下选项：

---
- FLICK_TIME (default 0.1 seconds) - When you tilt the stick a direction, how long does it take the camera to complete its turn to face that direction? I find that 0.1 seconds provides a nice, snappy response, while still looking good.
FLICK_TIME （默认值 0.1 秒）——当您向某个方向倾斜摇杆时，摄像头需要多长时间才能完成旋转并朝向该方向？我发现 0.1 秒的响应速度很快，而且画面效果也不错。
Set the value too low and it may look like you're cheating, instantly going from one direction to facing another.
如果数值设置得太低，看起来就像作弊一样，瞬间就能从一个方向变成另一个方向。
Keep in mind that, once tilted, rotating the stick will rotate the camera instantly. There’s no need to smooth it out*; the camera just needs to make the same movement the stick is. FLICK_TIME only affects behaviour when you first tilt the stick.
请注意，倾斜摇杆后，旋转摇杆会立即旋转镜头。无需进行平滑处理*；镜头只需与摇杆的运动保持一致即可。FLICK_TIME 仅影响首次倾斜摇杆时的行为。

---
- FLICK_TIME_EXPONENT (default 0.0) - Some people prefer the flick time to be proportional to the flick angle, and some games don't handle extreme flicks in a short timespan well. This setting scales the FLICK_TIME based on the flick angle.
FLICK_TIME_EXPONENT （默认值 0.0）- 有些人喜欢拨动鼠标的时间与拨动角度成正比，而且有些游戏对短时间内大幅度的拨动操作处理不佳。此设置会根据拨动角度调整 FLICK_TIME 的大小。
For any value here, FLICK_TIME will always be the time for a 180 degree flick, but smaller flicks are affected: a value of 0.0 means no scaling at all (any flick takes FLICK_TIME seconds), while a value of 1.0 causes the actual flick time to be linearly proportional to the flick angle (a 90 degree flick takes 0.5 * FLICK_TIME seconds).
对于此处的任何值，FLICK_TIME 始终是 180 度翻转所需的时间，但较小的翻转会受到影响：值为 0.0 表示完全不缩放（任何翻转都需要 FLICK_TIME 秒），而值为 1.0 则会导致实际翻转时间与翻转角度成线性比例（90 度翻转需要 0.5 * FLICK_TIME 秒）。
Higher values (over)dramatize the differences between small and large flicks.
较高的数值会（过分）夸大小电影和大电影之间的差异。

---
- FLICK_SNAP_MODE (default none) - Without practice, sometimes you'll flick to a different angle than you intended. If you want to limit the angles you can flick to, FLICK_SNAP_MODE gives you three options. The default, NONE, is no snapping at all.
FLICK_SNAP_MODE （默认值：无） - 如果不练习，有时你会不小心将鼠标移到与预期不同的角度。如果你想限制鼠标移到的角度，FLICK_SNAP_MODE 提供了三个选项。默认值“无”表示完全不进行吸附。
With practice, I expect players will find this most useful, as surprises can come from any angle. But your other options are 4, which snaps the flick to the nearest of directly forward, directly left, directly right, or directly backwards. These are 90° intervals.
通过练习，我相信玩家会发现这非常有用，因为意外可能来自任何方向。但你还有其他选项，例如 4，它会将拨片快速拨向最接近的正前方、正左、正右或正后方。这些角度间隔为 90°。
If you want to be able to snap to 45° intervals, too, you can set FLICK_SNAP_MODE to 8.
如果您也希望能够以 45° 的间隔进行捕捉，可以将 FLICK_SNAP_MODE 设置为 8。

---
- FLICK_SNAP_STRENGTH (default 1.0) - If you have a snap mode other than NONE set, this value gives you the strength of its snapping, ranging from 0 (no snapping) to 1 (full snapping).
FLICK_SNAP_STRENGTH （默认值 1.0） - 如果您设置了除 NONE 以外的捕捉模式，则此值会给出捕捉强度，范围从 0（不捕捉）到 1（完全捕捉）。

---
- FLICK_DEADZONE_ANGLE (default 0.0 degrees) - Sometimes you want to prepare for turning quickly without flicking. Pushing the stick perfectly forward is near impossible so you end up turning a little, losing the angle you are trying to hold.
轻击死区角度 （默认值 0.0 度） - 有时你想快速转向，但又不想猛击摇杆。完美地向前推动摇杆几乎不可能，所以你最终会稍微转动一下，从而失去你想要保持的角度。
This setting creates a deadzone for forward flicks: moving the thumbstick forward within this range will be treated as flicking at a 0 degree angle, basically putting you in rotation mode directly.
此设置会为向前拨动创建死区：在此范围内向前移动拇指摇杆将被视为以 0 度角拨动，基本上直接将您置于旋转模式。
The value is applied in both left and right directions separately: setting this to 15 creates a total deadzone arc of 30 degrees.
该值分别应用于左侧和右侧方向：将其设置为 15 将产生 30 度的总死区弧。

---

---
*Developer note: The DualSense and DualShock 4's stick input resolution is low enough that small flick stick rotations can be jittery. JoyShockMapper applies some smoothing just to very small changes in the flick stick angle, which is very effective at covering this up. Larger movements are not smoothed at all. This is more thoroughly explained for developers to implement in their own games on GyroWiki.
*开发者注： DualSense 和 DualShock 4 的摇杆输入分辨率较低，因此轻微的摇杆旋转可能会出现抖动。JoyShockMapper 会对摇杆角度的微小变化进行平滑处理，从而有效地掩盖这个问题。对于较大的摇杆移动，则不会进行任何平滑处理。GyroWiki 上有更详细的解释，供开发者在自己的游戏中实现。
JoyShockMapper automatically calculates different smoothing thresholds for the PlayStation and Switch controllers, but you can override the smoothing threshold by setting ROTATE_SMOOTH_OVERRIDE any small number, or to 0 to disable smoothing, or to -1 to return to the automatically calculated threshold.
JoyShockMapper 会自动计算 PlayStation 和 Switch 控制器的不同平滑阈值，但您可以通过将 ROTATE_SMOOTH_OVERRIDE 设置为任何较小的数字来覆盖平滑阈值，或者设置为 0 以禁用平滑，或者设置为 -1 以返回到自动计算的阈值。

---
The FLICK_ONLY and ROTATE_ONLY stick modes work the same as flick stick with some features blocked out. The former means you'll get the initial flick, but no subsequent rotation when rotating the stick. The latter means you won't get the initial flick, but subsequent rotations will work.
FLICK_ONLY 和 ROTATE_ONLY 摇杆模式与 Flick 摇杆模式的工作方式相同，只是部分功能被禁用。前者意味着你只能进行初始的轻弹操作，而无法在旋转摇杆时进行后续的旋转操作。后者意味着你无法进行初始的轻弹操作，但可以进行后续的旋转操作。

---
You can also emulate flick stick with a virtual controller, but it's more limited. Set FLICK_STICK_OUTPUT to RIGHT_STICK or LEFT_STICK instead of its default value of MOUSE. When outputting flick stick to a virtual controller, FLICK_TIME and FLICK_TIME_EXPONENT won't do anything. Instead, the virtual stick will be tilted at its full strength in the desired direction for enough time to complete the flick.
你也可以使用虚拟控制器来模拟摇杆操作，但功能比较有限。请将 FLICK_STICK_OUTPUT 设置为 RIGHT_STICK 或 LEFT_STICK ，而不是默认值 MOUSE 。当使用虚拟控制器输出摇杆操作时，FLICK_TIME 和 FLICK_TIME_EXPONENT 将不起作用。虚拟摇杆会以最大力度朝所需方向倾斜，持续足够长的时间以完成摇杆操作。
This will generally be much less precise than MOUSE mode, but it's still useful.
虽然这种模式的精确度通常远不如鼠标模式，但仍然很有用。
Tune the size of a flick stick flick/rotation by settingVIRTUAL_STICK_CALIBRATION. Ideally, this should be set to the maximum horizontal turning speed of the in game camera in degrees per second.
通过设置 VIRTUAL_STICK_CALIBRATION 来调整摇杆的拨动/旋转幅度。理想情况下，该值应设置为游戏内摄像机的最大水平旋转速度（以度/秒为单位）。

---
3.3 HYBRID_AIM mode  3.3 混合瞄准模式

---
When using HYBRID_AIM stick mode, the output consists of the sum of the behavior of a traditional stick, i.e. stick position sets cursor speed, as well as the positional behavior, i.e. stick travelling sets cursor travelling.
使用 HYBRID_AIM 摇杆模式时，输出由传统摇杆的行为（即摇杆位置决定光标速度）和位置行为（即摇杆移动决定光标移动）的总和构成。
Additionally, there is an 'edge push' feature to preserve the motion speed when pushing the stick to the edge.
此外，还有一个“边缘推动”功能，可以在将摇杆推到边缘时保持运动速度。
Moving the stick quickly gives a large output that is dominated by the mouse-like component, whereas moving it slowly gives an output that in more influenced by the stick-like component.
快速移动摇杆会产生较大的输出，该输出主要受鼠标成分的影响；而缓慢移动摇杆会产生较大的输出，该输出更多地受摇杆成分的影响。

---
With this input method it is easier to do accurate small movements of the camera while being able to do faster turns than with a traditional stick method as the combined behavior results in a high dynamic range.
使用这种输入方式，可以更轻松地对相机进行精确的小幅移动，同时还能比传统摇杆方式更快地转弯，因为这种组合方式可以实现高动态范围。
This mode shares STICK_SENS*, STICK_POWER, (LEFT / RIGHT)_STICK_AXIS, (LEFT_ / RIGHT_)STICK_DEADZONE_DEADZONE_INNER and (LEFT_ / RIGHT_)STICK_DEADZONE_OUTER with AIM.
此模式与 AIM 共享 STICK_SENS*、STICK_POWER、(LEFT / RIGHT)_STICK_AXIS、(LEFT_ / RIGHT_)STICK_DEADZONE_DEADZONE_INNER 和 (LEFT_ / RIGHT_)STICK_DEADZONE_OUTER。
It is recommended to keep STICK_DEADZONE_OUTER as small as possible for the best experience. STICK_DEADZONE_INNER matters less, as this mode is very responsive even with a large inner deadzone.
为了获得最佳体验，建议将 STICK_DEADZONE_OUTER 的值尽可能小。STICK_DEADZONE_INNER 的值则不太重要，因为即使内部死区较大，此模式的响应速度也非常快。
The other settings of this mode are:
此模式的其他设置包括：
- STICK_SENS (default 360.0) - How fast the camera is moved by the position of the stick. Currently this is an arbitrary number and a calibration is not implemented for this. In the future this should represent degrees per second.
STICK_SENS （默认值 360.0）- 摇杆位置移动相机的速度。目前这是一个任意值，尚未实现校准。未来将以每秒度数表示。
- MOUSELIKE_FACTOR (default 90.0) - How fast the camera is moved by the movement of the stick. Like the above, no calibration implemented yet. In the future this should represent degrees per one full travel of the stick from center to full deflection.
鼠标感应系数 （默认值 90.0）- 摇杆移动时摄像机移动的速度。与上述参数类似，目前尚未实现校准。未来，该参数应表示摇杆从中心位置到最大偏转角度对应的摄像机移动角度。

---
- RETURN_DEADZONE_IS_ACTIVE (default ON) - There are two possibly quite different ways this input mode can function.
RETURN_DEADZONE_IS_ACTIVE （默认开启） - 此输入模式可能有两种截然不同的功能。
When this setting is set to ON, the mode may feel more like a traditional stick, when its set to OFF, the mode may feel way more responsive but it is difficult to make the output hold still because of the behavior inherent to this input method.
当此设置设为“开”时，该模式可能感觉更像传统的摇杆；当此设置设为“关”时，该模式可能感觉响应速度更快，但由于此输入方法固有的特性，很难使输出保持静止。

---
- RETURN_DEADZONE_ANGLE (default 45.0 degrees) - The angle to the center from the current stick position where the output is set to zero.
返回死区角度 （默认值 45.0 度） - 从当前摇杆位置到输出设置为零的中心点的角度。
- RETURN_DEADZONE_CUTOFF_ANGLE (default 90.0 degrees) - The angle to the center where the return deadzone has no effect anymore. Between RETURN_DEADZONE_ANGLE and this, the output slowly returns to normal.
返回死区截止角（默认值 90.0 度） - 返回死区不再起作用时，输出信号与中心点之间的角度。在返回死区截止角和此值之间，输出信号会缓慢恢复正常。

---
- EDGE_PUSH_IS_ACTIVE (default ON) - Whether or not the mouse-like movement is to be continued when hitting the edge of the stick (entering the outer deadzone).
EDGE_PUSH_IS_ACTIVE （默认开启） - 当触碰到摇杆边缘（进入外部死区）时，是否继续进行类似鼠标的移动。
If so, it functions similar to the stick-like component until it is reset either by entering the return deadzone or inner deadzone, but is at most the value at the smallest deflection since the push.
如果是这样，它的功能类似于棒状组件，直到通过进入返回死区或内部死区进行重置，但至多是自推动以来最小偏转时的值。

---
3.4 Other mouse modes  3.4 其他鼠标模式

---
When using the MOUSE_RING stick mode, tilting the stick will put the mouse cursor in a position offset from the centre of the screen by your stick position. This mode is primarily intended for twin-stick shooters.
使用 MOUSE_RING 摇杆模式时，倾斜摇杆会使鼠标光标偏离屏幕中心，偏移量等于摇杆的倾斜角度。此模式主要用于双摇杆射击游戏。
To do this, the application needs to know your screen resolution (SCREEN_RESOLUTION_X and SCREEN_RESOLUTION_Y) and how far you want the cursor to sit from the centre of the screen (MOUSE_RING_RADIUS).
为此，应用程序需要知道您的屏幕分辨率（SCREEN_RESOLUTION_X 和 SCREEN_RESOLUTION_Y）以及您希望光标距离屏幕中心的距离（MOUSE_RING_RADIUS）。
When this mode is in operation (i.e. the stick is not at rest), all other mouse movements are ignored.
当此模式运行时（即摇杆不在静止状态），所有其他鼠标移动都将被忽略。

---
When using the MOUSE_AREA stick mode, the stick value directly sets the mouse position. So moving the stick rightward gradually all the way to the edge will move the cursor at the same speed for a number of pixel equal to the value of MOUSE_RING_RADIUS ; and moving the stick back to the middle will move the cursor back again to where it started. Contrary to the previous mode, this mode can operate in conjunction with other mouse inputs, such as gyro.
使用 MOUSE_AREA 摇杆模式时，摇杆值直接设置鼠标位置。因此，将摇杆向右逐渐移动到边缘，光标将以相同的速度移动等于 MOUSE_RING_RADIUS 值的像素数；将摇杆移回中心，光标将返回到起始位置。与之前的模式不同，此模式可以与其他鼠标输入（例如陀螺仪）协同工作。
3.5 Digital modes  3.5 数字模式
When using stick mode NO_MOUSE, JSM will use the stick's UP DOWN LEFT and RIGHT bindings in a cross gate layout. There is a small square deadzone to ignore very small stick moves.
使用摇杆模式 NO_MOUSE 时，JSM 将采用十字形布局，使用摇杆的上下左右按键。摇杆上有一个小的方形死区，用于忽略非常小的摇杆移动。

---
Finally, SCROLL_WHEEL turns the stick into a rotating scroll wheel. Left bindings are pulsed by rotating counter-clockwise and right bindings are pulsed by rotating clockwise. The setting SCROLL_SENS allows you to change the amount of degrees you need to perform to trigger a pulse.
最后， SCROLL_WHEEL 可以将摇杆变成旋转滚轮。逆时针旋转摇杆会触发左侧按键的脉冲，顺时针旋转摇杆会触发右侧按键的脉冲。SCROLL_SENS 设置允许您更改触发脉冲所需的旋转角度。
Unlike other sensitivity parameters, a higher value is less sensitive.
与其他灵敏度参数不同，该参数值越高，灵敏度越低。

---
# Left stick moves
LLEFT = A
LRIGHT = D
LUP = W
LDOWN = S
LEFT_RING_MODE = INNER
LRING = LALT # Walk
3.6 Motion Stick and lean bindings
3.6 运动杆和倾斜固定器
Using the motion sensors, you can treat your whole controller as a stick. The "Motion Stick" can do everything that a regular stick can do:
利用运动传感器，您可以将整个控制器当作摇杆来使用。“运动摇杆”可以实现普通摇杆的所有功能：
- MOTION_STICK_MODE (default NO_MOUSE) - All the same options as LEFT_STICK_MODE and RIGHT_STICK_MODE.
MOTION_STICK_MODE （默认 NO_MOUSE） - 与 LEFT_STICK_MODE 和 RIGHT_STICK_MODE 相同的选项。
- MOTION_RING_MODE (default OUTER) - All the same options as LEFT_RING_MODE and RIGHT_RING_MODE.
MOTION_RING_MODE （默认 OUTER）- 与 LEFT_RING_MODE 和 RIGHT_RING_MODE 的所有选项相同。
- MOTION_DEADZONE_INNER (default 15°) - How far the controller needs to be tilted in order to register as non-zero.
MOTION_DEADZONE_INNER （默认值 15°） - 控制器需要倾斜多远才能被注册为非零值。
- MOTION_DEADZONE_OUTER (default 135°) - How far from the maximum rotation will be considered a full tilt. The maximum rotation is of course 180°, so the default value of 135° means tilting at or above 45° from the neutral position will be considered "full tilt".
MOTION_DEADZONE_OUTER （默认值 135°）- 偏离最大旋转角度多少才算完全倾斜。最大旋转角度当然是 180°，因此默认值 135° 表示从中立位置倾斜 45° 或以上将被视为“完全倾斜”。
- MOTION_STICK_AXIS (default STANDARD) - Select whether you want to invert the axis. To assign a separate vertical value, provide a second parameter.
MOTION_STICK_AXIS （默认 STANDARD）- 选择是否反转轴。要指定单独的垂直值，请提供第二个参数。
- MLEFT, MRIGHT, MUP, MDOWN are the motion stick equivalents of left, right, forward, back mappings, respectively.
MLEFT 、 MRIGHT 、 MUP 、 MDOWN 分别是左、右、前、后方向键对应的摇杆按键。
- This is also affected by CONTROLLER_ORIENTATION described at the end of the previous section.
这也会受到上一节末尾描述的 CONTROLLER_ORIENTATION 的影响。
The gyro needs to be correctly calibrated for motion stick to work best (see calibration commands below under Gyro Mouse Inputs).
要使运动摇杆发挥最佳性能，需要正确校准陀螺仪（请参阅下面的“陀螺仪鼠标输入”下的校准命令）。
By default, the neutral position is approximately the position the controller is when left on a flat surface. You can set a different neutral position by entering the command SET_MOTION_STICK_NEUTRAL. When this command is executed, however you're holding the controller at the time will be considered the "neutral" orientation.
默认情况下， 中立位置大致是指控制器平放在平面上时的位置。您可以通过输入命令 SET_MOTION_STICK_NEUTRAL 来设置不同的中立位置。执行此命令时，您当时握持控制器的方向将被视为“中立”方向。
A common use for the motion sensors is to map left and right leans of the controller. This isn't quite the same as motion stick -- regardless of whether you hold your controller flat or upright, lean mappings should still work the same. You just need:
运动传感器的一个常见用途是映射控制器的左右倾斜动作。这与体感摇杆略有不同——无论您是平握还是竖握控制器，倾斜映射都应该正常工作。您只需要：
- LEAN_THRESHOLD (default 15°) - Leaning the controller more than this angle to the left or right will trigger the LEAN_LEFT or LEAN_RIGHT bindings, respectively.
LEAN_THRESHOLD （默认 15°） - 控制器向左或向右倾斜超过此角度将分别触发 LEAN_LEFT 或 LEAN_RIGHT 绑定。
4. Gyro Mouse Inputs  4. 陀螺仪鼠标输入

---
The first thing you need to know about gyro mouse inputs is that a controller's gyro will often need calibrating. This just means telling the application where "zero" is. Just like a scale, the gyro needs a point of reference to compare against in order to accurately give a result.
关于陀螺仪鼠标输入，首先需要了解的是，控制器的陀螺仪通常需要校准。这其实就是告诉应用程序“零点”在哪里。就像秤一样，陀螺仪需要一个参考点来比较，才能给出准确的结果。
This is done by leaving the controller still, or holding it very still in your hands, and finding the average velocity over a short time of staying still.
具体做法是，保持控制器静止不动，或者将其牢牢地握在手中，然后计算在短时间内保持静止时的平均速度。
It needs to be averaged over some time because the gyro will pick up a little bit of "noise" -- tiny variations that aren't caused by any real movement -- but this noise is negligible compared to the shakiness of human hands trying to hold a controller still.
需要对一段时间进行平均，因为陀螺仪会接收到一些“噪声”——并非由任何实际运动引起的微小变化——但与人手试图保持控制器静止时的抖动相比，这种噪声可以忽略不计。

---
If you have gyro mouse enabled and the gyro moves across the screen (even slowly) when the controller is lying still on a solid surface, your device needs calibrating.
如果启用了陀螺仪鼠标，并且当控制器静止地放在坚实的表面上时，陀螺仪在屏幕上移动（即使速度很慢），则您的设备需要校准。
That's okay -- I do it at the beginning of most play sessions, especially with Nintendo devices, which seem to need it more often.
没关系——我通常在游戏开始时这样做，尤其是在使用任天堂设备时，这些设备似乎更需要这样做。

---
If you set AUTO_CALIBRATE_GYRO to ON, JoyShockMapper will try to detect when your controller is being held still or left on a steady surface and calibrate the gyro automatically. This is imperfect, though -- every automatic calibration solution will sometimes interpret slow and steady movement as the controller being held still. This can interrupt you making small adjustments to your aim or tracking slow/distant targets. It's also only a new feature, and we try not to change default behaviour.
如果将 AUTO_CALIBRATE_GYRO 设置为 ON ，JoyShockMapper 会尝试检测您的控制器是否处于静止状态或放置在稳定的表面上，并自动校准陀螺仪。但这种方法并不完美——任何自动校准方案有时都会将缓慢稳定的移动误判为控制器静止。这可能会干扰您对瞄准进行微调或追踪缓慢/远处的目标。此外，这只是一个新功能，我们尽量不更改默认行为。
Also, it doesn't yet give you any settings to tweak its thresholds.
此外，它目前还没有提供任何设置来调整其阈值。
For all of these reasons this setting isOFF by default, and it's recommended that you calibrate your gyro manually instead.
鉴于以上所有原因，此设置默认处于关闭状态，建议您手动校准陀螺仪。

---
To manually calibrate your gyro, place your controller on steady surface so that it's not moving at all, and then use the following commands:
要手动校准陀螺仪，请将控制器放置在稳定的表面上，使其完全静止，然后使用以下命令：
- RESTART_GYRO_CALIBRATION - All connected gyro devices will begin collecting gyro data, remembering the average collected so far and treating it as "zero".
RESTART_GYRO_CALIBRATION - 所有连接的陀螺仪设备将开始收集陀螺仪数据，记住到目前为止收集的平均值并将其视为“零”。
- FINISH_GYRO_CALIBRATION - Stop collecting gyro data for calibration. JoyShockMapper will use whatever it has already collected from that controller as the "zero" reference point for input from that controller.
完成陀螺仪校准 - 停止收集陀螺仪数据进行校准。JoyShockMapper 将使用已从该控制器收集的数据作为该控制器输入的“零”参考点。
It should only take a second or so to get a good calibration for your devices. You can also calibrate each controller separately with buttons mapped to CALIBRATE. This is how you using them assuming you use the built-in mappings:
只需一秒钟左右即可完成设备的校准。您还可以使用映射到 “校准” 按钮的按键分别校准每个控制器。以下是在使用内置映射的情况下，使用方法如下：
- Tap the PS, Touchpad-click, Home, or Capture button on your controller to restart calibration, or to finish calibration if that controller is already calibrating.
点击控制器上的 PS、触摸板点击、主页或捕获按钮以重新开始校准，或者如果该控制器已经在校准，则点击这些按钮以完成校准。

---
- Hold the PS, Touchpad-click, Home, or Capture button to restart calibration, and it'll finish calibration once you release the controller. Warning: I've found that touching the Home button interferes with the gyro input on one of my JoyCons, so if I hold the button to calibrate it, it'll be incorrectly calibrated when I release the button.
按住 PS 键、触摸板点击、Home 键或截图键即可重新开始校准，松开手柄后校准将完成。 警告 ：我发现触摸 Home 键会干扰我的一个 Joy-Con 手柄的陀螺仪输入，因此如果我按住该键进行校准，松开按键后校准结果将不正确。
If you encounter this, it's better to rely on the tapping toggle shortcuts above for each controller, or calibrate all controllers at the same time using the commands above.
如果遇到这种情况，最好使用上面每个控制器的点击切换快捷方式，或者使用上面的命令同时校准所有控制器。

---

---
The reason gyros need calibrating is that their physical properties (such as temperature) can affect their sense of "zero".
陀螺仪需要校准的原因是，它们的物理特性（如温度）会影响它们的“零点”感觉。
Calibrating at the beginning of a play session will usually be enough for the rest of the play session, but it's possible that after the controller warms up it could use calibrating again.
通常情况下，在游戏开始时进行校准就足以应对接下来的游戏过程，但控制器预热后可能需要再次校准。
You'll be able to tell it needs calibrating if it appears that the gyro's "zero" is incorrect -- when the controller isn't moving, the mouse moves steadily in one direction anyway.
如果陀螺仪的“零点”看起来不正确，则说明需要校准——即使控制器没有移动，鼠标仍然会朝着一个方向稳定地移动。

---
The second thing you need to know about gyro mouse inputs is how to choose the sensitivity of the gyro inputs:
关于陀螺仪鼠标输入，你需要了解的第二件事是如何选择陀螺仪输入的灵敏度：

---
- GYRO_SENS (default 0.0) - How does turning the controller turn the in-game camera? A value of 1 means turning the controller will turn the in-game camera the same angle (within the limits of two axes). A value of 2 means turning the controller will turn double the angle in-game.
GYRO_SENS （默认值 0.0）- 转动控制器如何控制游戏内视角？值为 1 表示转动控制器会使游戏内视角旋转相同的角度（在两个轴的范围内）。值为 2 表示转动控制器会使游戏内视角旋转两倍的角度。
Increasing the GYRO_SENS gives you more freedom to move around before turning uncomfortably and having to disable the gyro and reposition the controller, but decreasing it will give you more stability to hit small targets.
增加 GYRO_SENS 值可以让你在转向不舒服、不得不禁用陀螺仪并重新定位控制器之前有更大的移动自由度，但降低该值会让你在击中小目标时更加稳定。
For games where you don't turn the camera directly, but instead use the mouse to control an on-screen cursor, a GYRO_SENS of 1 would mean the controller needs to turn around completely to get from one side of the screen to the other.
对于那些不直接转动摄像头，而是使用鼠标控制屏幕上的光标的游戏来说，GYRO_SENS 为 1 表示控制器需要完全旋转才能从屏幕的一侧移动到另一侧。
For games like these, you'll be better off with a GYRO_SENS of 8 or more, meaning you only need to turn the controller 360/8 = 45 degrees to move from one side of the screen to the other.
对于这类游戏，最好将 GYRO_SENS 设置为 8 或更高，这意味着你只需要将控制器旋转 360/8 = 45 度即可从屏幕的一侧移动到另一侧。

---
A single GYRO_SENS setting may not be enough to get both the precision you need for small targets and the range you need to comfortably navigate the game without regularly having to disable the gyro and reposition the controller.
单个 GYRO_SENS 设置可能不足以同时获得对小型目标所需的精度和舒适地操控游戏所需的范围，而无需经常禁用陀螺仪并重新定位控制器。

---
JoyShockMapper allows you to say, "When turning slowly, I want this sensitivity. When turning quickly, I want that sensitivity." You can do this by setting two real life speed thresholds and a sensitivity for each of those thresholds.
JoyShockMapper 允许你设置“慢速转弯时使用这种灵敏度，快速转弯时使用那种灵敏度”。你可以通过设置两个实际速度阈值，并分别对应这两个阈值来设置灵敏度。
Everything in-between will be linearly interpolated.
中间的所有值都将进行线性插值。
To do this, use MIN_GYRO_THRESHOLD, MAX_GYRO_THRESHOLD, MIN_GYRO_SENS, and MAX_GYRO_SENS:
为此，请使用 MIN_GYRO_THRESHOLD、MAX_GYRO_THRESHOLD、MIN_GYRO_SENS 和 MAX_GYRO_SENS：

---

---
- MIN_GYRO_THRESHOLD and MAX_GYRO_THRESHOLD (default 0.0 degrees per second); MIN_GYRO_SENS and MAX_GYRO_SENS (default 0.0) - MIN_GYRO_SENS and MAX_GYRO_SENS work just like GYRO_SENS, but MIN_GYRO_SENS applies when the controller is turning at or below the speed defined by MIN_GYRO_THRESHOLD, and MAX_GYRO_SENS applies when the controller is turning at or above the speed defined by MAX_GYRO_THRESHOLD.
MIN_GYRO_THRESHOLD 和 MAX_GYRO_THRESHOLD （默认值为每秒 0.0 度）； MIN_GYRO_SENS 和 MAX_GYRO_SENS （默认值为 0.0） - MIN_GYRO_SENS 和 MAX_GYRO_SENS 的工作方式与 GYRO_SENS 相同，但当控制器以 MIN_GYRO_THRESHOLD 定义的速度或更低的速度旋转时，MIN_GYRO_SENS 适用；当控制器以 MAX_GYRO_THRESHOLD 定义的速度或更高的速度旋转时，MAX_GYRO_SENS 适用。
When the controller is turning at a speed between those two thresholds, the gyro sensitivity is interpolated accordingly. The thresholds are in real life degrees per second.
当控制器以介于这两个阈值之间的速度旋转时，陀螺仪灵敏度会相应地进行插值。这些阈值单位为实际的度/秒。
For example, if you think about how fast you need to turn the controller for it to turn a quarter circle in one second, that's 90 degrees per second. Setting GYRO_SENS overrides MIN_GYRO_SENS and MAX_GYRO_SENS to be the same value.
例如，想想看，要让控制器在一秒钟内转完四分之一圆，你需要以多快的速度转动它，那就是每秒 90 度。设置 GYRO_SENS 会将 MIN_GYRO_SENS 和 MAX_GYRO_SENS 的值覆盖为相同值。
You can set a differentvertical sensitivity by giving two values to the command separated by a space, instead of just one.
你可以通过在命令中用空格分隔两个值来设置不同的垂直灵敏度 ，而不是只设置一个值。

---
Finally, there are a bunch more settings you can tweak if you so desire:
最后 ，如果您愿意，还可以调整更多设置：

---
- GYRO_SPACE (default LOCAL) - Simple gyro aiming solutions will map one of your controller's gyro axes to your camera/cursor's horizontal axis and one to the vertical axis. That's the behaviour you'll get with JoyShockMapper when GYRO_SPACE is set to "LOCAL".
GYRO_SPACE （默认为 LOCAL）——简单的陀螺仪瞄准方案会将控制器的一个陀螺仪轴映射到摄像机/光标的水平轴，另一个映射到垂直轴。当 GYRO_SPACE 设置为“LOCAL”时，JoyShockMapper 就会实现这种效果。
This is simple to implement and leaves no room for misinterpretation, but aiming can feel off as you tilt your controller more and more.
这很容易实现，也不会造成误解，但是随着你倾斜控制器的幅度越来越大，瞄准可能会感觉不太准。
If you'd prefer a more advanced reading of the gyro combined with the accelerometer to more naturally handle different controller positions, PLAYER_TURN is the way to go. Or, if you prefer to lean your controller side to side to turn your camera, try PLAYER_LEAN.
如果您希望更高级地结合陀螺仪和加速度计来读取数据，以便更自然地应对不同的控制器位置，那么 PLAYER_TURN 是您的理想选择。或者，如果您喜欢左右倾斜控制器来转动视角，请尝试 PLAYER_LEAN。
Finally, WORLD_TURN and WORLD_LEAN account for gravity more strictly than the PLAYER_* options.
最后，WORLD_TURN 和 WORLD_LEAN 比 PLAYER_* 选项更严格地考虑了重力。

---
- GYRO_AXIS_X and GYRO_AXIS_Y (default STANDARD) - This allows you to invert the gyro directions if you wish. Want a left- gyro turn to translate to a right- in-game turn? Set GYRO_AXIS_X to INVERTED. For normal behaviour, set it to STANDARD.
GYRO_AXIS_X 和 GYRO_AXIS_Y （默认值：STANDARD）——您可以根据需要反转陀螺仪方向。例如，想要将陀螺仪向左转向转化为游戏中的向右转向？请将 GYRO_AXIS_X 设置为 INVERTED。要保持正常行为，请将其设置为 STANDARD。

---
- MOUSE_X_FROM_GYRO_AXIS and MOUSE_Y_FROM_GYRO_AXIS (default Y and X, respectively) - Maybe you want to turn the camera left and right by rolling your controller about its local Z axis instead of turning it about its local Y axis. Or maybe you want to play with a single JoyCon sideways. This is how you do that.
MOUSE_X_FROM_GYRO_AXIS 和 MOUSE_Y_FROM_GYRO_AXIS （默认值分别为 Y 轴和 X 轴）——也许你想通过绕控制器的局部 Z 轴滚动来左右转动视角，而不是绕其局部 Y 轴转动。或者，也许你想横向使用单个 Joy-Con 手柄进行游戏。以下是如何实现这些操作。
Your options are X, Y, Z, and NONE, if you want an axis of mouse movement unaffected by the gyro.
您可以选择 X、Y、Z 轴，或者如果您希望鼠标移动轴不受陀螺仪影响，则可以选择“无”。
These settings only apply when GYRO_SPACE is set to LOCAL.
这些设置仅在 GYRO_SPACE 设置为 LOCAL 时适用。

---
- GYRO_CUTOFF_SPEED (default 0.0 degrees per second) - Some games attempt to cover up small unintentional movements by setting a minimum speed below which gyro input will be ignored. This is that setting. It's never good. Don't use it. Some games won't even let you change or disable this "feature".
GYRO_CUTOFF_SPEED （默认值：0.0 度/秒）——有些游戏会尝试通过设置一个最低速度来掩盖轻微的无意移动，低于该速度时陀螺仪输入将被忽略。这就是这个设置。这样做绝对不好。不要使用它。有些游戏甚至不允许您更改或禁用此“功能”。
I implemented it to see if it could be made good. I left it in there only so you can see for yourself that it's not good, or for you to perhaps show me how it can be.
我把它实现出来是为了看看它是否可行。我把它保留在那里，只是为了让你自己看看它不好，或者也许你能告诉我它应该如何改进。
It might be mostly harmless for interacting with a simple UI with big-ish buttons, but it's useless if the player will ever intentionally turn the controller slowly (such as to track a slow-moving target), because they may unintentionally fall below the cutoff speed. Even a very small cutoff speed might be so high that it's impossible to move the aimer at the same speed as a very slow-moving target.
对于操作界面简单、按钮较大的场景来说，这或许没什么大碍；但如果玩家有意缓慢转动控制器（例如追踪慢速移动的目标），那就毫无用处了，因为他们可能会无意中低于速度阈值。即使速度阈值设置得很低，也可能高到让瞄准器无法与移动速度极慢的目标保持同步。
One might argue that such a cutoff is too high, and it just needs to be set lower. But if the cutoff speed is small enough that it doesn't make the player's experience worse, it's probably also small enough that it's actually not doing anything.
有人可能会认为这样的截止值太高，应该调低一些。但如果截止速度足够小，不会影响玩家体验，那么它可能也小到实际上没有任何作用。

---
- GYRO_CUTOFF_RECOVERY (default 0.0 degrees per second) - In order to avoid the problem that GYRO_CUTOFF_SPEED makes it impossible to move the cursor at the same speed as a very slow-moving target, JoyShockMapper smooths over the transition between the cutoff speed and a threshold determined by GYRO_CUTOFF_RECOVERY.
GYRO_CUTOFF_RECOVERY （默认值为每秒 0.0 度） - 为了避免 GYRO_CUTOFF_SPEED 导致光标无法以与移动速度非常慢的目标相同的速度移动的问题，JoyShockMapper 会平滑地过渡到由 GYRO_CUTOFF_RECOVERY 确定的阈值。
Originally intended to make GYRO_CUTOFF_SPEED not awful, it ends up doing a good job of reducing shakiness even when GYRO_CUTOFF_SPEED is set to 0.0, but I only use it (possibly in combination with smoothing, below) as a last resort.
最初的目的是为了使 GYRO_CUTOFF_SPEED 不至于太糟糕，结果发现即使 GYRO_CUTOFF_SPEED 设置为 0.0，它也能很好地减少抖动，但我只在万不得已的情况下才使用它（可能与下面的平滑处理结合使用）。

---
- GYRO_SMOOTH_THRESHOLD (default 0.0 degrees per second) - Optionally, JoyShockMapper will apply smoothing to the gyro input to cover up shaky hands at high sensitivities. The problem with smoothing is that it unavoidably introduces latency, so a game should never have any smoothing apply to any input faster than a very small threshold. Any gyro movement at or above this threshold will not be smoothed. Anything below this threshold will be smoothed according to the GYRO_SMOOTH_TIME setting, with a gradual transition from full smoothing at half GYRO_SMOOTH_THRESHOLD to no smoothing at GYRO_SMOOTH_THRESHOLD.
GYRO_SMOOTH_THRESHOLD （默认值：0.0 度/秒）- JoyShockMapper 可选择对陀螺仪输入应用平滑处理，以在高灵敏度下弥补手抖。平滑处理的问题在于它不可避免地会引入延迟，因此游戏不应将任何平滑处理应用于高于一个非常小阈值的输入 。任何高于或等于此阈值的陀螺仪运动都不会被平滑处理。任何低于此阈值的陀螺仪运动将根据 GYRO_SMOOTH_TIME 设置进行平滑处理，平滑程度会随着 GYRO_SMOOTH_THRESHOLD 的设置而逐渐变化：从 GYRO_SMOOTH_THRESHOLD 的一半时完全平滑，到 GYRO_SMOOTH_THRESHOLD 时完全不平滑。

---
- GYRO_SMOOTH_TIME (default 0.125s) - If any smoothing is applied to gyro input (as determined by GYRO_SMOOTH_THRESHOLD), GYRO_SMOOTH_TIME is the length of time over which it is smoothed. Larger values mean smoother movement, but also make it feel sluggish and unresponsive.
GYRO_SMOOTH_TIME （默认值 0.125 秒）- 如果对陀螺仪输入应用了平滑处理（由 GYRO_SMOOTH_THRESHOLD 决定），则 GYRO_SMOOTH_TIME 表示平滑处理所持续的时间长度。值越大，运动越平滑，但也会使动作感觉迟缓、反应迟钝。
Set the smooth time too small, and it won't actually cover up unintentional movements.
如果平滑时间设置得太短，就无法真正掩盖无意的动作。

---
5. Real World Calibration
5. 实际校准
Flick stick, aim stick, and gyro mouse inputs all rely on REAL_WORLD_CALIBRATION to provide useful values that can be shared between games and with other players. Furthermore, if REAL_WORLD_CALIBRATION is set incorrectly, flick stick flicks will not correspond to the direction you press the stick at all.
拨动摇杆 、瞄准摇杆和陀螺仪鼠标的输入都依赖于 REAL_WORLD_CALIBRATION 来提供可在游戏之间以及与其他玩家共享的有效数值。此外，如果 REAL_WORLD_CALIBRATION 设置不正确， 拨动摇杆的拨动方向将与您按下摇杆的方向完全不符。

---
Every game requires a unique REAL_WORLD_CALIBRATION value in order for these other settings to work correctly.
每款游戏都需要一个唯一的 REAL_WORLD_CALIBRATION 值，其他设置才能正常工作。
This actually really simplifies sharing configuration files, because once one person has calculated an accurate REAL_WORLD_CALIBRATION value for a given game, they can share it with anyone else for the same game.GyroWiki has a database of games and their corresponding REAL_WORLD_CALIBRATION (as well as other settings unique to that game).
这实际上大大简化了配置文件的共享，因为一旦有人计算出某个游戏的准确 REAL_WORLD_CALIBRATION 值，就可以将其分享给其他任何想要使用同一游戏的人。GyroWiki 拥有一个游戏数据库，其中包含了游戏及其对应的 REAL_WORLD_CALIBRATION 值（以及其他该游戏特有的设置）。
You can use this to avoid having to calculate this value in games you want to play with JoyShockMapper, or if a game isn't in that database, you can help other players by calculating its REAL_WORLD_CALIBRATION yourself and contributing it toGyroWiki!
您可以利用此功能避免在您想使用 JoyShockMapper 玩的游戏中计算此值，或者如果某个游戏不在该数据库中，您可以自行计算其 REAL_WORLD_CALIBRATION 并将其贡献给 GyroWiki ，从而帮助其他玩家！

---
For 3D games where the mouse directly controls the camera, REAL_WORLD_CALIBRATION is a multiplier to turn a given angle in degrees into a mouse input that turns the camera the same angle in-game.
对于鼠标直接控制摄像机的 3D 游戏，REAL_WORLD_CALIBRATION 是一个乘数，可以将给定的角度（以度为单位）转换为鼠标输入，从而使游戏中的摄像机旋转相同的角度。
For 2D games where the mouse directly controls an on-screen cursor, REAL_WORLD_CALIBRATION is a multiplier to turn a given fraction of a full turn into a mouse input that moves the same fraction of the full width of the screen (at 1920x1080 resolution in games where resolution affects cursor speed relative to the size of the screen).
对于鼠标直接控制屏幕上光标的 2D 游戏，REAL_WORLD_CALIBRATION 是一个乘数，可以将完整旋转的给定分数转换为鼠标输入，从而移动屏幕宽度的相同分数（在分辨率会影响光标相对于屏幕大小的速度的游戏中，分辨率为 1920x1080）。
5.1 Prerequisites  5.1 先决条件
Before we get into how to accurately calculate a good REAL_WORLD_CALIBRATION value for a given game, we first need to address two other things that can affect mouse sensitivity:
在深入探讨如何准确计算特定游戏的良好 REAL_WORLD_CALIBRATION 值之前，我们首先需要了解另外两个可能影响鼠标灵敏度的因素：
- In-game mouse settings  游戏内鼠标设置
- Windows mouse settings  Windows 鼠标设置
Even if REAL_WORLD_CALIBRATION is set correctly, your in-game mouse settings will change how the camera or cursor responds to mouse movements:
即使 REAL_WORLD_CALIBRATION 设置正确， 游戏内的鼠标设置也会改变相机或光标对鼠标移动的响应方式：
- If you are playing with mouse acceleration enabled (a setting only a few games have, and they will usually have it disabled by default), you’ll need to disable it in-game for JoyShockMapper to work accurately.
如果您启用了鼠标加速功能（只有少数游戏支持此功能，而且通常默认情况下是禁用的），则需要在游戏中禁用鼠标加速，JoyShockMapper 才能正常工作。
- Most games have a mouse sensitivity setting, which is a simple multiplier for the mouse input. JoyShockMapper can't see this value, so you need to tell it what that value is so it can cancel it out. You can do this by setting IN_GAME_SENS to the game’s mouse sensitivity.
大多数游戏都有鼠标灵敏度设置，它其实就是一个简单的鼠标输入倍率。JoyShockMapper 无法直接读取这个值，所以你需要告诉它这个值，以便它进行抵消。你可以通过将 IN_GAME_SENS 设置为游戏本身的鼠标灵敏度来实现这一点。
For example, for playing with keyboard and mouse, my Quake Champions mouse sensitivity is 1.8. So in my Quake Champions config files for JoyShockMapper, or whenever I use someone else’s config file, I include the line: IN_GAME_SENS = 1.8 so that JoyShockMapper knows to cancel it out.
例如，在使用键盘和鼠标玩游戏时，我的 Quake Champions 鼠标灵敏度为 1.8。因此，在我的 Quake Champions JoyShockMapper 配置文件中，或者每当我使用其他人的配置文件时，我都会添加一行： IN_GAME_SENS = 1.8 ，以便 JoyShockMapper 知道将其抵消。
There’s one other factor that some games need to deal with. Windows mouse settings:
还有另一个因素需要考虑： Windows 鼠标设置 。
- In your Windows mouse settings, there’s an “Enhance pointer precision” option that JoyShockMapper can’t accurately account for. Most gamers play with this option disabled, and it’s preferable for using JoyShockMapper that you disable it, too.
在 Windows 鼠标设置中，有一个“提高指针精确度”选项，JoyShockMapper 无法准确识别该选项。大多数玩家都会禁用此选项，为了更好地使用 JoyShockMapper，建议您也将其禁用。

---
- Windows’ pointer speed setting will also often affect the way the mouse behaves in game, but JoyShockMapper can detect Windows’ pointer speed setting and account for it. This is done with the simple command: COUNTER_OS_MOUSE_SPEED.
Windows 的指针速度设置通常也会影响鼠标在游戏中的行为方式，但 JoyShockMapper 可以检测 Windows 的指针速度设置并进行调整。这是通过简单的命令 COUNTER_OS_MOUSE_SPEED 实现的。
The only complication is that some games aren’t affected by Windows’ pointer speed settings. Many modern shooters use “raw input” to ignore Windows’ settings so the user is free to use “Enhance pointer precision” and whatever sensitivity settings they want in the operating system without it affecting the game.
唯一的问题是，有些游戏不受 Windows 指针速度设置的影响。许多现代射击游戏使用“原始输入”来忽略 Windows 的设置，因此用户可以自由地在操作系统中使用“提高指针精确度”以及任何他们想要的灵敏度设置，而不会影响游戏。
If you’ve used COUNTER_OS_MOUSE_SPEED and realised you shouldn’t have, the commandIGNORE_OS_MOUSE_SPEED restores default behaviour, which is good for games that use raw input.
如果你使用了 COUNTER_OS_MOUSE_SPEED 并且意识到你不应该这样做，那么 IGNORE_OS_MOUSE_SPEED 命令可以恢复默认行为，这对于使用原始输入的游戏来说很有好处。

---
In summary, when preparing to share a configuration file for others to use, please consider whether COUNTER_OS_MOUSE_SPEED should be included. When using someone else’s configuration file, please remember to set the file’s IN_GAME_SENS to whatever your in-game mouse sensitivity is.
总之，在准备分享配置文件供他人使用时，请考虑是否需要包含 COUNTER_OS_MOUSE_SPEED 参数。使用他人的配置文件时，请务必将文件中的 IN_GAME_SENS 设置为您游戏内的鼠标灵敏度。
Once you've done this, you're ready to calculate your game's REAL_WORLD_CALIBRATION value.
完成此操作后，即可计算游戏的 REAL_WORLD_CALIBRATION 值 。
5.2 Calculating the real world calibration in a 3D game
5.2 计算 3D 游戏中的真实世界校准
For 3D games where the mouse directly controls the camera, the most accurate way to calculate a good REAL_WORLD_CALIBRATION value is to enable flick stick along with a first-guess REAL_WORLD_CALIBRATION value like so:
对于鼠标直接控制摄像机的 3D 游戏 ，计算一个合适的 REAL_WORLD_CALIBRATION 值的最准确方法是启用摇杆功能， 并配合一个初始的 REAL_WORLD_CALIBRATION 值，如下所示：
RIGHT_STICK_MODE = FLICK
REAL_WORLD_CALIBRATION = 40
Now, in-game, use your mouse to fix your aimer precisely on a small target in front of you. Press your right stick forward, and rotate it until you've completed a full turn, releasing the stick once your aimer is in the same position it started before you pressed the stick.
现在，在游戏中，用鼠标将瞄准器精确地对准前方的一个小目标。向前推动右摇杆，并旋转它直到完成一整圈，当瞄准器回到按下摇杆之前的初始位置时，松开摇杆。
JoyShockMapper remembers the last flick stick flick and rotation you did, so now you can simply enter the following command:
JoyShockMapper 会记住你上次拨动摇杆和旋转摇杆的操作，所以现在你只需输入以下命令：
CALCULATE_REAL_WORLD_CALIBRATION
计算真实世界校准

---
This tells JoyShockMapper that your last flick and rotation was exactly one full in-game turn, and that you'd like to know what REAL_WORLD_CALIBRATION value you should have.
这告诉 JoyShockMapper，你最后一次甩动和旋转正好是一个完整的游戏回合，并且你想知道你应该有的 REAL_WORLD_CALIBRATION 值是多少。
JoyShockMapper will respond with something like, "Recommended REAL_WORLD_CALIBRATION: 151.5" (for example).
JoyShockMapper 会回复类似“推荐 REAL_WORLD_CALIBRATION: 151.5”这样的信息（例如）。
Now you can verify that everything worked correctly by changing your REAL_WORLD_CALIBRATION setting like so:
现在，您可以通过更改 REAL_WORLD_CALIBRATION 设置来验证一切是否正常工作，如下所示：

---
REAL_WORLD_CALIBRATION = 151.5 (or whatever value JoyShockMapper gave you).
REAL_WORLD_CALIBRATION = 151.5 （或 JoyShockMapper 给出的任何值）。
Now check in-game if this value works by completing a flick stick rotation again. The angle you turn in-game should match the angle you turned the stick.
现在，在游戏中再次完成一次摇杆旋转，检查这个数值是否有效。游戏中摇杆旋转的角度应该与你旋转摇杆的角度一致。

---
If you want to be even more precise, you can do more than one turn.
如果想要更精确，可以转不止一圈。
If, for example, you complete 10 turns in a row without releasing the stick in order to average out any imprecision at the point of releasing the stick, you can add the number of turns after the CALCULATE_REAL_WORLD_CALIBRATION command:
例如，如果您连续转动 10 圈而不松开摇杆，以平均掉松开摇杆时的任何不精确度，则可以在 CALCULATE_REAL_WORLD_CALIBRATION 命令后加上转动圈数：

---
CALCULATE_REAL_WORLD_CALIBRATION 10
计算真实世界校准 10
You can do this with non-integer turns, as well, such as 0.5 for a half turn.
你也可以使用非整数圈数，例如 0.5 表示半圈。
5.3 Calculating the real world calibration in a 2D game
5.3 计算 2D 游戏中的真实世界校准
For 2D games where the mouse directly controls an on-screen cursor, flick stick doesn't have a practical use in general gameplay, but it's still the most useful way to calculate your REAL_WORLD_CALIBRATION value. Again, make sure your IN_GAME_SENS and COUNTER_OS_MOUSE_SPEED are set as needed, and then we'll start by enabling flick stick alongside a first guess at the REAL_WORLD_CALIBRATION.
对于鼠标直接控制屏幕光标的 2D 游戏 ， 摇杆在一般游戏操作中没有实际用途，但它仍然是计算 REAL_WORLD_CALIBRATION 值的最有效方法。再次提醒，请确保已根据需要设置 IN_GAME_SENS 和 COUNTER_OS_MOUSE_SPEED，然后我们将启用摇杆并初步估算 REAL_WORLD_CALIBRATION 值。
RIGHT_STICK_MODE = FLICK
REAL_WORLD_CALIBRATION = 1
Notice that this time, our first guess REAL_WORLD_CALIBRATION value is 1 instead of 40. 2D cursor games tend to have a much lower REAL_WORLD_CALIBRATION value than 3D camera games, and it's better to underestimate your first guess than overestimate, so you can complete more stick turns and get a more accurate result.
请注意，这次我们第一次猜测的 REAL_WORLD_CALIBRATION 值为 1 而不是 40。2D 光标游戏的 REAL_WORLD_CALIBRATION 值往往比 3D 摄像机游戏低得多，而且第一次猜测值最好低估而不是高估，这样可以完成更多摇杆转动，从而获得更准确的结果。

---
For 2D cursor games, one full rotation of the flick stick should move the cursor from one side of the screen to the other. Unlike with 3D camera games, the edges of the screen clamp the mouse position, and will interfere with the results if we try to go through them.
对于 2D 光标游戏， 摇杆旋转一周应该能将光标从屏幕一侧移动到另一侧。与 3D 摄像机游戏不同，屏幕边缘会限制鼠标的位置，如果试图让光标穿过边缘，就会影响游戏结果。
When calibrating 3D camera games, it's OK if we overshoot our rotation, because we can still move the stick back the way it came until we precisely land on our target, and it'll work fine.
在校准 3D 摄像机游戏时，旋转过度也没关系，因为我们仍然可以将摇杆向后移动，直到精确地落在目标上，这样就能正常工作。
But when calibrating 2D cursor games, overshooting in either direction means that some stick input goes through JoyShockMapper, but the corresponding mouse input is ignored in-game.
但是，在校准 2D 光标游戏时，无论朝哪个方向过度移动，都意味着某些摇杆输入会通过 JoyShockMapper，但相应的鼠标输入在游戏中会被忽略。

---
So, start by manually moving the mouse to the left edge of the screen, then press your right stick forward but slightly to the right, so as to avoid accidentally going slightly to the left (and pressing against the left of the screen).
首先，手动将鼠标移动到屏幕左边缘，然后向前但稍微向右推动右摇杆，以避免意外地稍微向左移动（并按压到屏幕左侧）。
Now rotate the stick clockwise until you barely touch the other side of the screen, and then release the right stick.
现在顺时针旋转摇杆，直到摇杆刚好碰到屏幕的另一侧，然后松开右摇杆。
As before, you can now ask JoyShockMapper for a good REAL_WORLD_CALIBRATION as follows:
和以前一样，现在你可以按如下方式向 JoyShockMapper 请求良好的 REAL_WORLD_CALIBRATION：

---
CALCULATE_REAL_WORLD_CALIBRATION
计算真实世界校准
JoyShockMapper will then give you your recommended REAL_WORLD_CALIBRATION. It might be something like: "Recommended REAL_WORLD_CALIBRATION: 5.3759".
JoyShockMapper 随后会给出推荐的 REAL_WORLD_CALIBRATION 值。它可能类似于：“推荐的 REAL_WORLD_CALIBRATION：5.3759”。
You don't have to tell JoyShockMapper whether you're calibrating for a 2D game or a 3D game. Flick stick and other settings rely on a REAL_WORLD_CALIBRATION calculated this way for 3D games, but there's no direct translation between the way 3D games work (in angles and rotational velocity) to the way 2D games work (across a 2D plane), so calibrating 2D cursor games as described is simply convention.
你无需告诉 JoyShockMapper 你是在为 2D 游戏还是 3D 游戏进行校准。 摇杆和其他设置依赖于以这种方式为 3D 游戏计算的 REAL_WORLD_CALIBRATION，但 3D 游戏的工作方式（角度和旋转速度）与 2D 游戏的工作方式（在 2D 平面上）之间没有直接的对应关系，因此按照上述方式校准 2D 光标游戏仅仅是一种惯例。
With such a calibrated 2D game, you can choose your GYRO_SENS or other settings by thinking about how much you want to turn your controller to move across the whole screen. A GYRO_SENS of 1 would require a complete rotation of the controller to move from one side of the screen to the other, which is quite unreasonable! But a GYRO_SENS of 8 means you only have to turn the controller one eighth of a complete rotation (45 degrees) to move from one side of the other, which is probably quite reasonable.
对于这样一款经过校准的 2D 游戏，你可以根据自己希望移动角色到屏幕另一端所需的控制器旋转角度来选择 GYRO_SENS 或其他设置。GYRO_SENS 设置为 1 时 ，控制器需要旋转一整圈才能从屏幕的一侧移动到另一侧，这显然不合理！而 GYRO_SENS 设置为 8 时 ，你只需将控制器旋转八分之一圈（45 度）即可从屏幕的一侧移动到另一侧，这可能就比较合理了。
6. ViGEm Virtual Controller
6. ViGEm 虚拟控制器

---
JoyShockMapper can create a virtual xbox or DS4 controller thanks to Nefarius' ViGEm Bus and ViGEm Client softwares. The former needs to be installed by the user before the latter can be used.
JoyShockMapper 可以借助 Nefarius 的 ViGEm Bus 和 ViGEm Client 软件创建虚拟 Xbox 或 DS4 控制器。用户需要先安装 ViGEm Bus，才能使用 ViGEm Client。
Once installed, you can set which virtual device you desire to create for each connected device using the commandVIRTUAL_CONTROLLER = XBOX or VIRTUAL_CONTROLLER = DS4. The default value is NONE, which is no virtual controller at all. Rumble will then work on DS4 controllers, but obviously support is game dependant.
安装完成后，您可以使用命令 VIRTUAL_CONTROLLER = XBOX 或 VIRTUAL_CONTROLLER = DS4 为每个连接的设备设置要创建的虚拟设备。默认值为 NONE ，即不使用任何虚拟控制器。震动功能随后可在 DS4 控制器上正常工作，但具体支持情况取决于游戏本身。
Using virtual controllers is most likely to work well only if whitelisting is active (HIDGuardian/HIDCerberus), in order to hide the original controller entry from the game and only expose the virtual one.
只有在启用白名单（HIDGuardian/HIDCerberus）的情况下，使用虚拟控制器才最有可能有效，以便向游戏中隐藏原始控制器条目，而只显示虚拟控制器条目。
Funny thing to note is that hiding DS4s with HIDGuardian will also hide the virtual DS4 from ViGEm, since Windows cannot tell the virtual controller form the physical one.
值得注意的是，使用 HIDGuardian 隐藏 DS4 控制器也会对 ViGEm 隐藏虚拟 DS4 控制器，因为 Windows 无法区分虚拟控制器和物理控制器。

---
6.1 Xbox bindings  6.1 Xbox 按键绑定
If you have set the virtual controller to the xbox scheme, then the following becomes available to you:
如果您已将虚拟控制器设置为 Xbox 方案，则您可以使用以下功能：
- New digital bindings  新型数字装订
X_A, X_B, X_X, X_Y : The xbox face button diamond
X_LB, X_RB : The xbox bumper buttons
X_LS, X_RS : The xbox stick click buttons
X_BACK, X_START, X_GUIDE : The xbox control buttons
X_UP, X_DOWN, X_LEFT, X_RIGHT : The xbox dpad directions
X_LT, X_RT : Digital trigger bindings
# There is no CAPTURE / SHARE (Series X) button binding yet in ViGEm
- New stick mode available  新增摇杆模式
LEFT_STICK_MODE = LEFT_STICK
RIGHT_STICK_MODE = RIGHT_STICK
While these map very simply from your real sticks to the virtual sticks, there are other new stick modes available for giving finer control over a single axis:
虽然这些模式可以非常简单地将你的真实摇杆映射到虚拟摇杆，但还有其他新的摇杆模式可用于对单个轴进行更精细的控制：
LEFT_ANGLE_TO_X
LEFT_ANGLE_TO_Y
RIGHT_ANGLE_TO_X
RIGHT_ANGLE_TO_Y

---
These will take the stick's angle into account for inputs that are normally only in one axis.
对于通常只在一个轴上输入的指令，这些功能会考虑摇杆的角度。
For example, steering a car: instead of just moving the left stick left and right for adjusting your steering, rotating it around the edge of the stick will give you more precision and finer control over how hard you're steering.
例如，驾驶汽车：与其只是左右移动左摇杆来调整方向，不如绕着摇杆边缘旋转，这样可以更精确地控制转向的力度。
Set up the relevant UNDEADZONEs and UNPOWER for best effect.
设置相关的 UNDEADZONES 和 UNPOWER 以达到最佳效果。

---
These stick modes have inner and outer deadzones, set in degrees:
这些摇杆模式具有内部和外部死区，以度为单位设置：
ANGLE_TO_AXIS_DEADZONE_INNER = 0
ANGLE_TO_AXIS_DEADZONE_OUTER = 10
There's also:  还有：
LEFT_WIND_X
RIGHT_WIND_X

---
These also use the angle of the stick to control the virtual stick in a single axis, but these are relative instead of absolute, and can use a much wider range. This means pointing the stick in a direction doesn't really do anything, but rotating the stick does, letting you wind the stick left or right to adjust the stick position left or right.
这些设备也利用摇杆的角度来控制虚拟摇杆在单轴上的运动，但它们是相对的而非绝对的 ，并且可以使用更大的范围。这意味着将摇杆指向某个方向实际上并不会起作用，但旋转摇杆却可以，让你左右转动摇杆来调整摇杆的左右位置。
When you release the stick the virtual stick will quickly pull back to its neutral position.
松开摇杆后，虚拟摇杆会迅速回弹到中立位置。
Here are the relevant options:
以下是相关选项：

---
- WIND_STICK_RANGE (default 900.0°) - This is the total range of winding motion available on the stick. It's from full-left to full-right, but the "neutral" position is in the middle. So the default of 900° means you can rotate the stick 450° to the left and 450° to the right.
WIND_STICK_RANGE （默认值 900.0°）- 这是摇杆可旋转的总范围。范围从完全向左到完全向右，但“中立”位置位于中间。因此，默认值 900° 表示您可以将摇杆向左旋转 450°，向右旋转 450°。

---
- WIND_STICK_POWER (default 1.0) - What is the shape of the curve used for converting the wound position to a stick offset? 1.0 is a simple linear relationship. Larger values will mean rotations are reduced when near the neutral position and increased towards the edge of the range.
WIND_STICK_POWER （默认值 1.0）- 用于将风杆位置转换为摇杆偏移量的曲线形状是什么？1.0 表示简单的线性关系。较大的值意味着在接近中立位置时旋转次数减少，而在接近范围边缘时旋转次数增加。
Smaller values will mean the opposite.
数值越小，含义则相反。

---
- UNWIND_RATE (default 1800.0 degrees per second) - This is how quickly the wound stick position pulls back to its neutral position when the stick is released. If the stick is only partially engaged, the virtual stick position will unwind more slowly.
回卷速度 （默认值：1800.0 度/秒）——此参数表示松开卷轴时，卷轴位置回弹至初始位置的速度。如果卷轴仅部分啮合，则卷轴位置的回卷速度会更慢。
For MOTION_STICK_MODE in particular, there are two new options:
特别是对于 MOTION_STICK_MODE，新增了两个选项：
LEFT_STEER_X
RIGHT_STEER_X

---
These will map leaning the controller to the X axis of either the left or right stick. For steering a car, this works better than mapping MOTION_STICK to a stick. But like mapping it to a stick, UNPOWER and UNDEADZONE come into play.
这些设置会将控制器的倾斜动作映射到左摇杆或右摇杆的 X 轴。对于驾驶汽车来说，这种方式比将 MOTION_STICK 映射到摇杆效果更好。但与映射到摇杆一样，UNPOWER 和 UNDEADZONE 设置也会影响操控体验。
Make sure to set MOTION_DEADZONE_INNER and MOTION_DEADZONE_OUTER to suitable values -- they're both in degrees, with the max motion / lean angle being 180 degrees.
请确保将 MOTION_DEADZONE_INNER 和 MOTION_DEADZONE_OUTER 设置为合适的值——它们都是以度为单位的，最大运动/倾斜角度为 180 度。

---
- New trigger mode available
新增触发模式
# Using analog triggers
ZL_MODE = X_LT
ZR_MODE = X_RT
Using both analog and digital trigger bindings at the same time leads to undefined behaviours. Use modeshift as defined in the next section to disable analog triggers while a digital trigger binding is active.
同时使用模拟和数字触发绑定会导致未定义行为。请使用下一节中定义的模式切换功能，在数字触发绑定激活时禁用模拟触发。
You will also find a default xbox layout in the GyroConfigs folder that you can use to set up a standard xbox controller configuration. But of course, you can remap buttons elsewhere, or combine them in using the event modifiers, chords, simultaneous presses and such.
您还可以在 GyroConfigs 文件夹中找到一个默认的 Xbox 布局，可用于设置标准的 Xbox 控制器配置。当然，您也可以将按键重新映射到其他位置，或者使用事件修饰符、组合键、同时按下等方式组合按键。
GyroConfigs/xbox.txt # load the generic xbox mapping

# Map the dpad as chords of the face buttons
L3 = NONE
L3,N = X_UP
L3,W = X_LEFT
L3,S = X_DOWN
L3,E = X_RIGHT

S,S = X_LS # Double click jump to sprint instead

L+R = X_RS # I don't like to stick click often

MOTION_STICK_MODE = RIGHT_STICK # Gyro driving
6.2 DS4 bindings  6.2 DS4 绑定

---
ViGEm also the ability to emulate a Dualshock 4 controller. This can allow you to use a switch pro as a DS4 in a game that has this support built in for example. Setting the virtual controller to DS4 enables the use of these features as well.
ViGEm 还具备模拟 Dualshock 4 手柄的功能。例如，这可以让你在支持该功能的游戏中将 Switch Pro 当作 DS4 手柄使用。将虚拟手柄设置为 DS4 也能启用这些功能。
Take note that these names are aliases to the xbox names, so the logs might display the other label.
请注意，这些名称是 Xbox 名称的别名，因此日志可能会显示其他标签。

---
- New digital bindings  新型数字装订
PS_CROSS, PS_CIRCLE, PS_SQUARE, PS_TRIANGLE : The playstation face button diamond
PS_L1, PS_R1 : The playstation bumper buttons
PS_L3, PS_R3 : The playstation stick click buttons
PS_SHARE, PS_OPTIONS : The playstation control buttons
PS_UP, PS_DOWN, PS_LEFT, PS_RIGHT : The playstation dpad directions
PS_HOME, PS_PAD_CLICK : The playstation home and pad click buttons
PS_L2, PS_R2 : The playstation digital trigger bindings
- New stick mode available These are exactly the same as the xbox names
新增摇杆模式 ，与 Xbox 名称完全相同。
LEFT_STICK_MODE = LEFT_STICK
RIGHT_STICK_MODE = RIGHT_STICK
- New GYRO_OUTPUT mode available
新增陀螺仪输出模式
GYRO_OUTPUT = PS_MOTION
- New TOUCHPAD_MODE mode available
新增触控板模式
TOUCHPAD_MODE = PS_TOUCHPAD
A ds4 can also use the more advanced angle-to-axis stick modes described in the xbox section:
DS4 手柄还可以使用 Xbox 部分中描述的更高级的角度轴摇杆模式：
LEFT_ANGLE_TO_X
LEFT_ANGLE_TO_Y
RIGHT_ANGLE_TO_X
RIGHT_ANGLE_TO_Y
LEFT_WIND_X
RIGHT_WIND_X
As well as the MOTION_STICK-specific modes:
除了 MOTION_STICK 特有的模式之外：
LEFT_STEER_X
RIGHT_STEER_X
- New trigger mode available. JoyShockMapper will display the trigger mode as the xbox name : the trigger will still work properly.
新增扳机模式 。JoyShockMapper 会将扳机模式显示为 Xbox 名称：扳机仍可正常工作。
# Using analog triggers
ZL_MODE = PS_L2
ZR_MODE = PS_R2
If there is multiple sources of analog data (such as a trigger and a digital binding) the two sources will add up and clamp within the limit of the data. Soft and full pull chords will still be available for use and for the gyro button.
如果存在多个模拟数据源（例如触发器和数字绑定），则这两个数据源的数据会相加，并将数值限制在数据限值内。轻拉和全拉绳仍然可以使用，陀螺仪按钮也同样适用。
6.3 Virtual Controller Gyro
6.3 虚拟控制器陀螺仪
While the virtual controller can't output gyro, JoyShockMapper can convert gyro input to stick output. For example:
虽然虚拟控制器无法输出陀螺仪数据，但 JoyShockMapper 可以将陀螺仪输入转换为摇杆输出。例如：
GYRO_OUTPUT = RIGHT_STICK
GYRO_OUTPUT can also be set to LEFT_STICK or left at its default value of MOUSE, which means gyro will be converted to mouse input.
GYRO_OUTPUT 也可以设置为 LEFT_STICK 或保持其默认值 MOUSE ，这意味着陀螺仪将转换为鼠标输入。
Because games tend to do a lof of processing on stick input to turn it into camera movement, you'll want to counter that processing to convert it to a decent camera movement. So far, here are your options:
由于游戏通常会对摇杆输入进行大量处理才能将其转换为镜头移动，因此你需要抵消这些处理，才能将其转换为流畅的镜头移动。目前，你可以选择以下几种方法：

---
- RIGHT_STICK_UNDEADZONE_INNER / LEFT_STICK_UNDEADZONE_INNER (default 0) - This will counter the game's inner deadzone. For example, if a game has a deadzone of 0.25 (that's 25% off the stick movement range), very small gyro inputs will convert to a stick radius of just over 0.25 so that the game detects them right away.
RIGHT_STICK_UNDEADZONE_INNER / LEFT_STICK_UNDEADZONE_INNER （默认值 0） - 此设置用于抵消游戏内部死区的影响。例如，如果游戏的死区为 0.25（即摇杆移动范围的 25%），则极小的陀螺仪输入将被转换为略大于 0.25 的摇杆半径，以便游戏能够立即检测到这些输入。
When gyro output is assigned to this stick and no gyro is detected (if GYRO_SENS is 0, for example), this stick position will be set to the edge of this deadzone.
当陀螺仪输出分配给此摇杆且未检测到陀螺仪时（例如，如果 GYRO_SENS 为 0），此摇杆位置将设置为此死区的边缘。
This means you can tweak this deadzone value until you get the largest value that doesn't move the camera automatically to find the exact inner deadzone.
这意味着您可以调整此死区值，直到获得不会自动移动相机的最大值，从而找到确切的内部死区。

---
- RIGHT_STICK_UNDEADZONE_OUTER / LEFT_STICK_UNDEADZONE_OUTER (default 0) - Distance from the outer theoretical edge of the stick's range that will be considered "full tilt". Gyro velocity will be mapped to a stick position between _STICK_UNDEADZONE_INNER and _STICK_UNDEADZONE_OUTER.
RIGHT_STICK_UNDEADZONE_OUTER / LEFT_STICK_UNDEADZONE_OUTER （默认值 0） - 摇杆行程理论外边缘到“全倾角”的距离。陀螺仪速度将映射到 _STICK_UNDEADZONE_INNER 和 _STICK_UNDEADZONE_OUTER 之间的摇杆位置。

---
- RIGHT_STICK_UNPOWER / LEFT_STICK_UNPOWER (default 0) - A power curve is often applied to stick input to give players more with small movements at the cost of less precision with very large movements.
右摇杆无动力 / 左摇杆无动力 （默认值 0） - 通常会对摇杆输入应用动力曲线，以便玩家在小幅度移动时获得更多控制，但代价是大幅移动时的精度降低。
If you know what the exponent is, putting it here will counter that power curve to hopefully give you linearly proportional camera control. The default value of 0 does nothing, which is effectively the same as setting it to 1, since that assumes a linear curve.
如果你知道指数是多少，把它放在这里就能抵消幂律曲线的影响，从而有望实现线性比例的相机控制。默认值 0 不起作用，这实际上等同于将其设置为 1，因为 1 假设曲线是线性的。

---
- RIGHT_STICK_VIRTUAL_SCALE / LEFT_STICK_VIRTUAL_SCALE (default 1) - Use this to scale down virtual stick output. For example, if you're converting gyro to right stick aim (GYRO_OUTPUT = RIGHT_STICK), you'll want a high in game stick sensitivity so you can do fast flicks with the gyro.
右摇杆虚拟缩放 / 左摇杆虚拟缩放 （默认值 1） - 使用此选项可降低虚拟摇杆的输出。例如，如果您将陀螺仪数据转换为右摇杆瞄准（GYRO_OUTPUT = RIGHT_STICK），则需要较高的游戏内摇杆灵敏度，以便使用陀螺仪进行快速甩动。
But you may not want your regular stick aim to be that high. You could set this setting to 0.5 to halve the strength of your stick aiming. JSM will take into account your "UNPOWER" and "UNDEADZONE" settings when calculating this new stick output.
但您可能不希望摇杆的瞄准力度这么高。您可以将此设置设为 0.5，以将摇杆瞄准的力度减半。JSM 在计算新的摇杆输出时会考虑您的“UNPOWER”和“UNDEADZONE”设置。

---
Games sometimes do a lot of other processing to the stick input: easing in, acceleration, direction warping, angular deadzones, for example. JSM does not yet have a way to counter these effects.
游戏有时会对摇杆输入进行许多其他处理，例如缓入、加速、方向扭曲、角度死区等等。JSM 目前还没有办法抵消这些影响。
7. Modeshifts  7. 模式转换
Almost all settings described in previous sections that are assignations (i.e.: uses an equal sign '=') can be chorded like a regular button mapping. This is called a modeshift because you are reconfiguring the controller when specific buttons are pressed. The only exceptions are those listed here below.
前面章节中描述的几乎所有设置（即使用等号“=”）都可以像常规按键映射一样进行组合键操作。这被称为模式切换，因为按下特定按键时会重新配置控制器。唯一的例外情况如下所示。
AUTOLOAD
JSM_DIRECTORY
SIM_PRESS_WINDOW
TICK_TIME
GRID_SIZE
HIDE_MINIMIZED
VIRTUAL_CONTROLLER
Here's some usage examples: in DOOM (2016), you can use the right stick when you bring up a weapon wheel even when using flick stick:
以下是一些使用示例：在《毁灭战士》（2016）中，即使使用甩动摇杆，你也可以在调出武器轮盘时使用右摇杆：
RIGHT_STICK_MODE = FLICK # Use flick stick
GYRO_OFF = R3 # Use gyro, disable with stick click

R = Q # Last weapon / Bring up weapon wheel

R,GYRO_ON = NONE\ # Disable gyro when R is down
R,RIGHT_STICK_MODE = MOUSE_AREA # Select wheel item with stick
Other ideas include changing the gyro sensitivity when aiming down sights, or only when fully pulling the trigger.
其他想法包括改变瞄准时陀螺仪的灵敏度，或者只在完全扣动扳机时改变陀螺仪的灵敏度。
GYRO_SENS = 1 0.8 # Lower vertical sensitivity

ZL_MODE = NO_SKIP # Use full pull
ZL = RMOUSE # ADS
ZLF = NONE # No binding on full pull

ZLF,GYRO_SENS = 0.5 0.4 # Half sensitivity on full pull

---
These commands function exactly like chorded press bindings, whereas if multiple chords are active the latest has priority. Also the chord is active whenever the button is down regardless of whether a binding is active or not.
这些命令的功能与组合键按键绑定完全相同，如果多个组合键处于激活状态，则最后激活的组合键优先级最高。此外，无论绑定是否处于激活状态，只要按下按钮，组合键就会生效。
It is also worth noting that a special case is handled on stick mode changes where upon returning to the normal mode by releasing the chord button, the stick input will be ignored until it returns to the center.
值得注意的是，摇杆模式切换时会进行特殊处理，当松开组合键返回正常模式时，摇杆输入将被忽略，直到摇杆回到中心位置。
In the DOOM example above, this prevents an undesirable flick upon releasing the chord.
在上面的 DOOM 示例中，这可以防止松开琴弦时出现不必要的弹跳。

---
To remove an existing modeshift you have to assign NONE to the chord. There is special handling for the gyro button because NONE is a valid assignment. Add a backslash to indicate it is the button assignment rather than clearing the modeshift
要移除现有的模式切换，必须将按键赋值为 NONE 。陀螺仪按钮的处理方式比较特殊，因为 NONE 也是有效的赋值。添加反斜杠以表明这是按钮赋值，而不是清除模式切换。
GYRO_OFF = RIGHT_STICK   # Gyro off when using right stick
ZLF,GYRO_OFF = NONE\     # RS does not turn gyro off when ZLF is pressed
ZLF,GYRO_OFF = NONE      # oops undo
8. Touchpad  8. 触摸板
The touchpad always offers the TOUCH button binding. It will be pressed if there is any touch point active. This binding will overlap with other touch buttons and can be useful to disable gyro for example, or bring up the game map. There is also a dual stage mode setting for the touchpad touch and click: TOUCHPAD_DUAL_STAGE_MODE which can be any mode explained in the analog triggers, where CAPTURE is the full press or click and TOUCH is the soft press. The default setting is NO_SKIP.
触控板始终提供 TOUCH 按钮绑定。只要有触摸点处于激活状态，该按钮就会被按下。此绑定会与其他触摸按钮的功能重叠，例如，可用于禁用陀螺仪或调出游戏地图。触控板的触摸和点击还有一个双段模式设置： TOUCHPAD_DUAL_STAGE_MODE ，它可以是模拟扳机键中描述的任何模式，其中 CAPTURE 表示完全按下或点击，TOUCH 表示轻按。默认设置为 NO_SKIP。
The most important setting for the touchpad is simply TOUCHPAD_MODE which will determine the primary functionality of the touchpad. Here are two possible values:
触摸板最重要的设置是 TOUCHPAD_MODE ，它决定了触摸板的主要功能。以下是两个可选值：

---
- GRID_AND_STICK - Grid And Stick will create a button grid of equally sized buttons on the touch pad. You have to also assign to GRID_SIZE the number of columns and rows of the grid : the product of the two cannot be greater than 25 or lesser than 1. Touch buttons T1-TN will then become available for assignment: they are layed out in order from left to right, from top to bottom.
GRID_AND_STICK - “网格与键控”功能会在触摸板上创建一个大小相同的按钮网格。您还需要为 GRID_SIZE 指定网格的列数和行数：两者的乘积不能大于 25 或小于 1。触摸按钮 T1-TN 随后即可分配：它们按从左到右、从上到下的顺序排列。
There are also two touchsticks available.
此外，还有两款触控杆可供选择。
See below.  见下文。

---
- MOUSE - Mouse mode turns the touchpad into a familiar laptop touchpad. Sensitivity can be adjusted via TOUCHPAD_SENS. Gestures will be added to this mode in future releases. Taps and double taps are already usable via TOUCH.
鼠标模式 - 鼠标模式会将触控板变成熟悉的笔记本电脑触控板。灵敏度可通过 TOUCHPAD_SENS 进行调节。手势功能将在未来的版本中添加到此模式中。点击和双击功能已可通过 TOUCH 实现。
Here's an example of grid usage to add some more buttons that otherwise would not be worth putting on a controller
这里有一个使用网格布局的例子，用来添加一些按钮，否则这些按钮放在控制器上就没什么意义了。
TOUCHPAD_MODE = GRID_AND_STICK
GRID_SIZE = 2 1   # split the pad in two buttons, left and right
GYRO_OFF = TOUCH  # disable the gyro when I touch either button

# Bind on clicks
CAPTURE = NONE   # Chorded with touch buttons
T1,CAPTURE = F1  # View Help
T2,CAPTURE = F10 # Quick Save
Or a typical touchapd in cursor mode
或者典型的光标模式下的 touchapd
TOUCHPAD_MODE = MOUSE
TOUCH = LMOUSE'                   # Quick tap means select
TOUCH,TOUCH = RMOUSE       # Double tap for right click
CAPTURE = LMOUSE ^LMOUSE   # Or click pad to toggle click (dragging)
8.1 Touch Sticks  8.1 触控杆
A touch stick is a virtual joystick mapped unto the touchpad. As such, a touch stick has and uses all of the familiar binding names and settings, plus one new setting.
触控杆是映射到触控板上的虚拟操纵杆。因此，触控杆拥有并使用所有熟悉的按键绑定名称和设置，外加一个新设置。
TUP, TDOWN, TLEFT, TRIGHT, TRING : The touchstick four directions when in NO_MOUSE mode.
TOUCH_STICK_MODE: Set the touchstick to any  stick mode (AIM, FLICK_ONLY, MOUSE_AREA, etc...)
TOUCH_DEADZONE_INNER: Sets how large the area with no output is. There is no TOUCH_DEADZONE_OUTER, as it is replaced with TOUCH_STICK_RADIUS. See below.
TOUCH_RING_MODE: Sets what ring should be used for TRING, either INNER or OUTER.
TOUCH_STICK_RADIUS: Sets the size of the stick, or in other words, the amount of touchpad units to travel to the edge of the stick.
TOUCH_STICK_AXIS** (default STANDARD) - Select whether you want to invert the axis. To assign a separate vertical value, provide a second parameter.
The touchstick center is always the point of contact. As such, one can easily configure swipes by setting a very large touch stick radius and binding values to the 4 directions.
触控杆中心始终是接触点。因此，可以通过设置非常大的触控杆半径并将值绑定到四个方向来轻松配置滑动操作。

---
The touch stick differs from other input methods in one particular way. The four stick directions cannot be used as a chord for other buttons, but you can chord the four direction with the grid buttons.
触控摇杆与其他输入方式的一个显著区别在于：摇杆的四个方向不能与其他按键组合使用，但可以将这四个方向与网格按键组合使用。
As such, you can control two touch sticks at the same time on either side of the touch pad with each having different bindings.
因此，您可以在触摸板两侧同时控制两个触摸摇杆，每个摇杆都有不同的绑定。
The example below showcases the numbers 1 to 4 bound to swipe gestures on the left half of the pad, and 5 to 8 bound to swipe gestures on the right half of the pad.
下面的示例展示了数字 1 到 4 绑定到触控板左半部分的滑动操作，以及数字 5 到 8 绑定到触控板右半部分的滑动操作。

---
TOUCH_STICK_MODE = GRID_AND_STICK
GRID_SIZE = 2 1 # Left and Right
TOUCH_STICK_RADIUS = 800 # Use a larger value to use stick as swipe gestures

T1,TLEFT = 1
T1,TUP = 2
T1,TRIGHT = 3
T1,TDOWN = 4

T2,TLEFT = 5
T2,TUP = 6
T2,TRIGHT = 7
T2,TDOWN = 8
9. Miscellaneous Commands
9. 其他命令
There are a few other useful commands that don't fall under the above categories:
还有一些其他有用的命令不属于上述类别：

---
- RESET_MAPPINGS - This will reset all JoyShockMapper's settings to their default values. This way you don't have to manually unset button mappings or other settings when making a big change. It can be useful to always start your configuration files with the RESET_MAPPINGS command.
RESET_MAPPINGS - 此命令会将 JoyShockMapper 的所有设置重置为默认值。这样，在进行重大更改时，您无需手动取消按键映射或其他设置。建议您始终在配置文件开头添加 RESET_MAPPINGS 命令。
The only exceptions to this are the gyro calibration state / settings and AUTOLOAD.
唯一的例外是陀螺仪校准状态/设置和自动加载。

---
- RECONNECT_CONTROLLERS - Controllers connected after JoyShockMapper starts will be ignored until you tell it to RECONNECT_CONTROLLERS. When this happens, all gyro calibration will reset on all controllers.
RECONNECT_CONTROLLERS - JoyShockMapper 启动后连接的控制器将被忽略，直到您发出 RECONNECT_CONTROLLERS 指令。发出此指令后，所有控制器的陀螺仪校准都将重置。
You can add MERGE or SPLIT to indicate whether you want all joycons under a single controller or separate controllers. The player LED will help you identify whether they are merged or split.
您可以添加 MERGE 或 SPLIT 来指定是将所有 Joy-Con 手柄合并为一个控制器还是分别使用不同的控制器。玩家指示灯会帮助您识别手柄是合并还是分离状态。

---
comments - Any line or part of a line that begins with '#' will be ignored. Use this to organise/annotate your configuration files, or to temporarily remove commands that you may want to add later.
# 注释 - 任何以“#”开头的行或行的一部分都将被忽略。使用此功能可以组织/注释您的配置文件，或暂时删除您可能稍后想要添加的命令。

---
- JOYCON_GYRO_MASK (default IGNORE_LEFT) - Most games that use gyro controls on Switch ignore the left JoyCon's gyro to avoid confusing behaviour when the JoyCons are held separately while playing. This is the default behaviour in JoyShockMapper.
JOYCON_GYRO_MASK （默认 IGNORE_LEFT） - 大多数在 Switch 上使用陀螺仪控制的游戏都会忽略左侧 Joy-Con 的陀螺仪，以避免在游戏过程中分别握持两个 Joy-Con 时出现混乱的情况。这是 JoyShockMapper 的默认行为。
But you can also choose to IGNORE_RIGHT, IGNORE_BOTH, or USE_BOTH.
但您也可以选择忽略右侧、忽略两者或使用两者。

---
- JOYCON_MOTION_MASK (default IGNORE_RIGHT) - To avoid confusing behaviour when the JoyCons are held separately while playing, you can have one JoyCon ignored for MOTION_STICK related functions.
JOYCON_MOTION_MASK （默认 IGNORE_RIGHT） - 为了避免在游戏时分别握持 Joy-Con 时出现混乱的行为，您可以忽略一个 Joy-Con 的 MOTION_STICK 相关功能。
Since we ignore the left JoyCon by default for gyro, we ignore the right JoyCon by default for motion stick. But you can also choose to IGNORE_RIGHT, IGNORE_BOTH, or USE_BOTH.
由于我们默认忽略左侧 Joy-Con 的陀螺仪功能，因此也默认忽略右侧 Joy-Con 的体感摇杆功能。但您也可以选择 IGNORE_RIGHT、IGNORE_BOTH 或 USE_BOTH。

---
- SLEEP - Cause the program to sleep (or wait) for a given number of seconds. The given value must be greater than 0 and less than or equal to 10. Or, omit the value and it will sleep for one second. This command may help automate calibration.
SLEEP - 使程序休眠（或等待）指定的秒数。指定的秒数必须大于 0 且小于等于 10。或者，省略该值，程序将休眠 1 秒。此命令有助于自动校准。

---
- TICK_TIME (default 3) - The number of milliseconds to wait between between checking the state of connected controllers.
TICK_TIME （默认值 3） - 检查已连接控制器的状态之间等待的毫秒数。
Previous versions only sent new virtual keyboard and mouse inputs when there was a new message from the controller, but this made JoyCons clunky on a monitor with a refresh rate higher than 67Hz. Now, all connected devices are polled at the same rate, and you can change it here.
之前的版本只有在收到来自控制器的新消息时才会发送新的虚拟键盘和鼠标输入，但这会导致 Joy-Con 在刷新率高于 67Hz 的显示器上操作不流畅。现在，所有连接的设备都以相同的频率轮询，您可以在此处更改此设置。
The default of 3 milliseconds will give you a polling rate of approximately 333Hz.
默认值为 3 毫秒，轮询率约为 333Hz。

---
- LIGHT_BAR - Set the DS4 light bar to the assigned color. You can assign either a 6 hex digit code precedded by 'x', three decimal values for red, green and blue between 0 and 255, or simply a common color name in capitals and underscore.
LIGHT_BAR - 将 DS4 指示灯条设置为指定颜色。您可以指定一个以“x”开头的 6 位十六进制代码，或者 0 到 255 之间的三个十进制值（分别代表红色、绿色和蓝色），或者直接使用大写字母和下划线表示的常用颜色名称 。
- HIDE_MINIMIZED - Some users like having JSM hidden in the notification area. You can hide JSM when minimized by setting this to ON. OFF is the default value.
HIDE_MINIMIZED - 部分用户喜欢将 JSM 隐藏在通知区域。您可以将此项设置为“开启”以在窗口最小化时隐藏 JSM。默认值为“关闭”。
- README will lead you to this document.
README 文件将引导您找到本文档。
- HELP Will display a list of all commands, all commands containing a given string, or the specific help for all the exact command names given to it.
HELP 将显示所有命令的列表、包含给定字符串的所有命令的列表，或显示给定所有确切命令名称的特定帮助。
- CLEAR Remove all text from the console screen.
清除： 从控制台屏幕中移除所有文本。
Configuration Files  配置文件

---
All of the commands layed out in the previous section can be saved in a text file and run all at once. In Windows, you can also drag and drop a file from Explorer into the JoyShockMapper console window to enter the full path of that file.
上一节中列出的所有命令都可以保存到一个文本文件中，然后一次性运行。在 Windows 系统中，您还可以将文件从资源管理器拖放到 JoyShockMapper 控制台窗口中，以输入该文件的完整路径。
These configuration files can additionally reference one another. This allows you to group a few settings as a "building block" for your configurations: such as your gyro sensitivity and acceleration preferences.
这些配置文件还可以相互引用。这样，您可以将一些设置组合成“构建模块”来构建您的配置，例如陀螺仪灵敏度和加速度偏好设置。

---
If you enter a relative path to the file, it should be relative to the folder where JoyShockMapper.exe is located. If however your files don't seem to get picked up, you can manually set where to look for the configuration files by entering the command JSM_DIRECTORY = D:\JSM for example. You can also set that working directory as a command line argument when running JoyShockMapper, which can be done in a shortcut properties.
如果您输入的是文件的相对路径，则该路径应相对于 JoyShockMapper.exe 所在的文件夹。但是，如果您的文件似乎没有被识别，您可以手动设置配置文件的查找位置，例如输入命令 JSM_DIRECTORY = D:\JSM 。您也可以在运行 JoyShockMapper 时将该工作目录作为命令行参数进行设置，这可以在快捷方式属性中完成。
Putting all your configuration files in a synchronized folder allows you to have those configurations across all computers you use for gaming!
将所有配置文件放在同步文件夹中，即可在所有用于游戏的计算机上使用这些配置！

---
What more? There are some configuration files that can be run automatically to streamline your experience.
还有什么呢？有一些配置文件可以自动运行，以简化您的使用体验。
1. OnStartup.txt

---
When JoyShockMapper first boots up, it will attempt to load the commands found in the file OnStartup.txt. This file should be in the JSM_DIRECTORY, which is next to your executable by default.
JoyShockMapper 首次启动时，会尝试加载 OnStartup.txt 文件中的命令。该文件应位于 JSM_DIRECTORY 目录中，默认情况下该目录与可执行文件位于同一目录下。
This is a great place to automatically calibrate the gyro, load a default configuration for navigating the OS, and/or whitelisting JoyShockMapper.
这里是自动校准陀螺仪、加载操作系统导航的默认配置和/或将 JoyShockMapper 添加到白名单的好地方。

---
2. OnReset.txt

---
This configuration is found in the same location as OnStartup.txt explained above. This file is run each time RESET_MAPPINGS is called, as well as before OnStartup.txt.
此配置与上文所述的 OnStartup.txt 文件位于同一位置。每次调用 RESET_MAPPINGS 函数时以及 OnStartup.txt 文件运行之前，都会执行此文件。
This file is a good spot to set a CALIBRATE button for your controller and/or set your GYRO_SPACE if you're not using the default value.
如果您不使用默认值，则可以在此文件中设置控制器的校准按钮和/或设置 GYRO_SPACE。

---
3. Autoload feature  3. 自动加载功能

---
JoyShockMapper can automatically load a configuration file for your games each time the game window enters focus. Drop the file in the AutoLoad folder where JSM_DIRECTORY refers to. JoyShockMapper will look for a name based on the executable name of the program that's in focus.
JoyShockMapper 可以在每次游戏窗口获得焦点时自动加载游戏配置文件。将该文件放入 JSM_DIRECTORY 指向的 AutoLoad 文件夹中。JoyShockMapper 会根据当前获得焦点的程序的可执行文件名查找该文件。
When it goes into focus and autoload is enabled (which it is by default), JoyShockMapper will tell you the name of the file it's looking for - case insensitive.
当 JoyShockMapper 进入焦点并启用自动加载（默认情况下已启用）时，它会告诉你它正在查找的文件名（不区分大小写）。

---
This enables the user to swap focus between your text editor of choice and the game, and each time the configuration will be automatically reloaded with your latest edits (assuming you've saved!). This system also avoids to step on your toes by NOT reloading your configuration if you do change focus between JoyShockMapper itself and the game: any mappings you enter by hand won't be thrown away when you return to your game.
这样一来，用户就可以在自己选择的文本编辑器和游戏之间切换焦点，每次切换后，配置都会自动加载最新的编辑内容（前提是您已保存！）。此外，如果您在 JoyShockMapper 本身和游戏之间切换焦点，系统也不会重新加载您的配置，从而避免造成不必要的麻烦：您手动输入的任何映射都不会在您返回游戏时丢失。
Autoload can be turned off by entering the command AUTOLOAD = OFF. You can enable it again with AUTOLOAD = ON.
可以通过输入命令 AUTOLOAD = OFF 关闭自动加载功能。您可以使用 AUTOLOAD = ON 再次启用它。
4. Autoconnect feature  4. 自动连接功能

---
The SDL version of JoyShockMapper can monitor the number of connected controllers and run RECONNECT_CONTROLLERS automatically when a new one is detected. This is very handy to relieve you from running it manually.
JoyShockMapper 的 SDL 版本可以监控已连接的控制器数量，并在检测到新控制器时自动运行 RECONNECT_CONTROLLERS 函数。这非常方便，可以免去您手动运行该函数的麻烦。
Should the feature give you grief, you can always disable with the commandAUTOCONNECT=OFF.
如果该功能给您带来麻烦，您可以随时使用命令 AUTOCONNECT=OFF 将其禁用。

---
Troubleshooting  故障排除
Some third-party devices that work as controllers on Switch, PS4, or PS5 may not work with JoyShockMapper. It only officially supports first-party controllers. Issues may still arise with those, though. Reach out, and hopefully we can figure out where the problem is.
某些可在 Switch、PS4 或 PS5 上用作控制器的第三方设备可能无法与 JoyShockMapper 兼容。JoyShockMapper 目前仅官方支持第一方控制器。不过，即使使用第三方设备，也可能出现问题。请联系我们，我们会尽力找出问题所在。
But first, here are some common problems that are worth checking first.
但首先，这里有一些值得先检查的常见问题。

---
- In some circumstances, the JoyShockMapper console is responding to controller input and the mouse is responding to gyro movements, but the game you're playing isn't responding to it. This can happen when you launch the game (or it's launcher) as an administrator.
在某些情况下，JoyShockMapper 主机可以响应控制器输入，鼠标也可以响应陀螺仪运动，但您正在玩的游戏却没有响应。这种情况可能发生在您以管理员身份运行游戏（或其启动器）时。
JoyShockMapper must also be launched with administrator rights in order to send keyboard and mouse events to the game.
JoyShockMapper 还必须以管理员权限启动，才能向游戏发送键盘和鼠标事件。
Windows shortcuts can be set to always run as admininstrator in the properties window.
可以在属性窗口中将 Windows 快捷方式设置为始终以管理员身份运行。

---

---
- The JoyShockMapper console will tell you how many devices are connected, and will output information with most inputs (button presses or releases, tilting the stick). However, the only way to test that the gyro is working is to enable it and see if you can move the mouse.
JoyShockMapper 控制台会显示已连接的设备数量，并会在大多数输入（按键或松开、倾斜摇杆）时输出信息。但是，测试陀螺仪是否正常工作的唯一方法是启用它，然后查看鼠标是否可以移动。
The quickest way to check if gyro input is working without loading a config is to just enter the commandGYRO_SENS = 1 and then move the controller. Don't forget that you might need to calibrate the gyro if the mouse is moving even when the controller isn't.
无需加载配置即可快速检查陀螺仪输入是否正常工作的方法是：输入命令 GYRO_SENS = 1 ，然后移动控制器。请注意，如果鼠标在控制器静止不动时也在移动，则可能需要校准陀螺仪。

---

---
- Many users of JoyShockMapper rely on tools like HIDGuardian to hide controller input from the game. If JSM isn't recognising your controller, maybe you haven't whitelisted JoyShockMapper. Enter WHITELIST_ADD to do so. You can also add this command to your OnStartup.
许多 JoyShockMapper 用户依赖 HIDGuardian 等工具来隐藏游戏中的手柄输入。如果 JSM 无法识别您的手柄，可能是因为您尚未将 JoyShockMapper 添加到白名单。输入 WHITELIST_ADD 即可添加。您也可以将此命令添加到 OnStartup 事件中。
txt script to do it everytime.
使用 txt 脚本每次都执行此操作。

---

---
- Some users have found stick inputs to be unresponsive in one or more directions. This can happen if the stick isn't using enough of the range available to it. In this case, increasing STICK_DEADZONE_OUTER can help.
部分用户反映摇杆输入在一个或多个方向上没有响应。这可能是由于摇杆的活动范围不足造成的。在这种情况下，增加 STICK_DEADZONE_OUTER 的值可以解决问题。
In the same way, the stick might be reporting a direction as pressed even when it's not touched.
同样，即使没有触摸，摇杆也可能报告某个方向被按下。
This happens when STICK_DEADZONE_INNER is too small.
当 STICK_DEADZONE_INNER 值过小时，就会发生这种情况。

---
Known and Perceived Issues
已知问题和感知问题
Bluetooth connectivity  蓝牙连接
JoyCons and Pro Controllers normally only communicate by Bluetooth. Some Bluetooth adapters can't keep up with these devices, resulting in laggy input. This is especially common when more than one device is connected (such as when using a pair of JoyCons). There is nothing JoyShockMapper or JoyShockLibrary can do about this. JoyShockMapper experimentally supports connecting Switch controllers by USB.
Joy-Con 和 Pro 手柄通常仅通过蓝牙通信。某些蓝牙适配器无法与这些设备保持同步，导致输入延迟 。当连接多个设备时（例如使用一对 Joy-Con），这种情况尤为常见。JoyShockMapper 或 JoyShockLibrary 对此无能为力。JoyShockMapper 目前实验性地支持通过 USB 连接 Switch 手柄。
Credits  鸣谢
JoyShockMapper was originally created by Julian "Jibb" Smart. As of version 1.3, JoyShockMapper has benefited from substantial community contributions. Huge thanks to the following contributors:
JoyShockMapper 最初由 Julian "Jibb" Smart 创建。自 1.3 版本起，JoyShockMapper 受益于社区的大量贡献。在此特别感谢以下贡献者：
- Nicolas (code)  尼古拉斯（代码）
- Bryan Rumsey (icon art)
布莱恩·拉姆西（图标艺术）
- Contributer (icon art)  贡献者（图标艺术）
- Sunny Ye (translation)  叶晴（译）
- Romeo Calota (linux and general portability)
Romeo Calota（Linux 和通用可移植性）
- Garrett (code)  加勒特（代码）
- Robin (linux and controller support)
Robin（Linux 和控制器支持）

---
As of version 3, JoyShockMapper development is lead by Nicolas Lessard, who was already a long-time contributor and responsible for many of JoyShockMapper's powerful mapping features, autoload, tray menus, and much more. Have a look at the CHANGELOG for a better idea of who contributed what.
从版本 3 开始，JoyShockMapper 的开发由 Nicolas Lessard 主导。他此前已是 JoyShockMapper 的长期贡献者，并负责开发了 JoyShockMapper 的许多强大映射功能、自动加载、托盘菜单等等。查看更新日志可以更清楚地了解每位贡献者的具体贡献。
While Jibb continues on as a contributor, JoyShockMapper is Nicolas' project now. This means updates won't be bottlenecked by Jibb's availability to approve and build them, and Nicolas has final say on what features are included in new versions.
虽然 Jibb 仍会继续贡献代码，但 JoyShockMapper 现在是 Nicolas 的项目。这意味着更新不会再受 Jibb 审批和构建的空闲时间限制，Nicolas 对新版本包含哪些功能拥有最终决定权。
As such, make sure you're onNicolas' fork for the latest developments.
因此，请务必关注 Nicolas 的分支， 以获取最新进展。

---
JoyShockMapper versions 2.2 and earlier relied a lot on Jibb's JoyShockLibrary, which it used to read controller inputs. Newer versions use SDL2 to read from controllers, as the latest versions of SDL2 are able to read gyro and accelerometer input on the same controllers that could already be used with JoyShockLibrary, but also support many non-gyro controllers as well.
JoyShockMapper 2.2 及更早版本严重依赖 Jibb 的 JoyShockLibrary 库来读取控制器输入。新版本则使用 SDL2 读取控制器数据，因为最新版本的 SDL2 不仅能够读取 JoyShockLibrary 已支持的控制器上的陀螺仪和加速度计输入，而且还支持许多不带陀螺仪的控制器。
Since moving to SDL2, JoyShockMapper uses Jibb's GamepadMotionHelpers, a small project that provides the sensor fusion and calibration options of JoyShockLibrary without all the device-specific stuff.
自从迁移到 SDL2 以来，JoyShockMapper 使用了 Jibb 的 GamepadMotionHelpers ，这是一个小型项目，它提供了 JoyShockLibrary 的传感器融合和校准选项，而无需所有特定于设备的内容。
Helpful Resources  实用资源
- GyroWiki - All about good gyro controls for games:
GyroWiki - 关于游戏中优秀陀螺仪控制的一切：
  - Why gyro controls make gaming better;
为什么陀螺仪控制能让游戏体验更好；
  - How developers can do a better job implementing gyro controls;
开发人员如何才能更好地实现陀螺仪控制；
  - How to use JoyShockMapper;
如何使用 JoyShockMapper；
  - User editable collection of user configurations and tips for using JoyShockMapper with a bunch of games.
用户可编辑的用户配置和使用 JoyShockMapper 玩各种游戏的技巧集合。
- GyroGaming subreddit  陀螺仪游戏子版块
- GyroGaming discord server.
GyroGaming Discord 服务器 。