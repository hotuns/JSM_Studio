export const cursorSwitchZh = {
  title: '光标自动切换', description: '分别指定光标显示、隐藏时切换的配置。选择“不切换”时保持当前输出，无需为每个游戏单独设置。',
  enable: '启用光标切换', profile: '光标显示时使用', hiddenProfile: '光标隐藏时使用', restorePrevious: '恢复切换前配置', select: '不切换', create: '新建光标配置', presetName: '光标专用',
  save: '保存规则', saved: '光标切换规则已保存', failed: '创建光标配置失败', detected: '系统光标', visible: '显示', hidden: '隐藏', unknown: '暂无法检测',
  active: '自动切换配置生效中', normal: '当前未覆盖常规配置', restore: '恢复目标', missing: '已不存在', missingHelp: '配置已删除或重命名，请重新选择。',
  unsupported: '仅 Windows 桌面版支持系统光标检测。',
  limit: '光标状态稳定约 300 毫秒后执行一次。手动应用配置后，等待下一次光标状态变化才自动切换。仅检测系统光标；游戏自绘光标可能无法识别。暂停输出、体感校准期间不切换。关闭功能会恢复常规配置。',
  presetHint: '新建的光标配置使用右摇杆移动鼠标，A 左键、B 右键、X 回车、Y 返回，LB / RB 滚动，并关闭体感。创建后可在高级映射中调整；保存规则后才开始自动切换。',
}
export const cursorSwitchEn: typeof cursorSwitchZh = {
  title: 'Cursor auto switch', description: 'Choose separate profiles for cursor visible and hidden. No switch keeps the current output. No per-game setup.',
  enable: 'Enable cursor switching', profile: 'While cursor is visible', hiddenProfile: 'While cursor is hidden', restorePrevious: 'Restore previous profile', select: 'No switch', create: 'Create cursor profile', presetName: 'Cursor controls',
  save: 'Save rule', saved: 'Cursor switching rule saved', failed: 'Could not create cursor profile', detected: 'System cursor', visible: 'Visible', hidden: 'Hidden', unknown: 'Unavailable',
  active: 'Automatic profile active', normal: 'Regular profile is not overridden', restore: 'Restore target', missing: 'Missing', missingHelp: 'The profile was deleted or renamed. Select it again.',
  unsupported: 'System cursor detection requires the Windows desktop app.',
  limit: 'Runs once after the cursor state is stable for about 300 ms. After a manual apply, waits for the next cursor state change. Detects the system cursor; cursors drawn by a game may not be detected. Switching is suspended while output is paused or gyro calibration is running. Disabling restores the regular profile.',
  presetHint: 'The preset uses the right stick for pointer movement, A/B for left/right click, X for Enter, Y for Escape and LB/RB for scrolling, with gyro off. Edit it in advanced mapping as needed. Save the rule to enable switching.',
}
