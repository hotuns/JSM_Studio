export const profileCreationZh = {
  title: '新建配置', description: '选择一个起点，创建后可继续修改和分享。', template: '基础模板',
  cursor: '光标操作配置', cursorName: '光标操作', cursorHint: '右摇杆移动鼠标，A/B 左右键，X 回车、Y 返回，LB/RB 滚动；体感关闭。',
  native: '手柄原生映射', nativeName: '手柄原生映射', nativeHint: '直接映射常用按键、方向键、双摇杆和模拟扳机，输出虚拟 Xbox 或 DS4 手柄；体感关闭。',
  empty: '空配置', emptyName: '空配置', emptyHint: '仅保留必要设置，不输出键鼠或虚拟手柄，从头配置。',
  scheme: '虚拟手柄类型', driverHint: '运行此配置需要 ViGEmBus。实体手柄与虚拟手柄同时被游戏识别时，可在设置与组件中配置 HidHide。',
  name: '配置名称', load: '创建后加载到编辑器', loadHint: '创建和加载不会立即改变正在运行的映射；确认后点击“应用修改”。',
  unsavedHint: '当前配置有未保存的修改。新配置会保存到配置库，保留当前编辑；保存或取消修改后再加载新配置。',
  create: '创建配置', creating: '正在创建…', saveName: '保存名称', renamed: '配置已重命名为 {{name}}',
  offer: '要直接创建完整的手柄映射吗？', offerHint: '自动映射常用按键、方向键、两个摇杆和扳机，省去逐键设置。',
  createNative: '创建完整手柄映射', outputOnly: '仅修改当前输出类型',
}
export const profileCreationEn: typeof profileCreationZh = {
  title: 'New profile', description: 'Choose a starting point, then customize and share it.', template: 'Starting template',
  cursor: 'Cursor controls', cursorName: 'Cursor controls', cursorHint: 'Right stick moves the pointer; A/B click, X Enter, Y Escape, and LB/RB scroll. Gyro is off.',
  native: 'Native controller mapping', nativeName: 'Native controller mapping', nativeHint: 'Maps common buttons, D-pad, both sticks, and analog triggers to a virtual Xbox or DS4 controller. Gyro is off.',
  empty: 'Empty profile', emptyName: 'Empty profile', emptyHint: 'Only essential settings. No keyboard, mouse, or virtual controller output until configured.',
  scheme: 'Virtual controller type', driverHint: 'Running this profile requires ViGEmBus. If the game sees both physical and virtual controllers, configure HidHide in Settings & Components.',
  name: 'Profile name', load: 'Load into the editor after creation', loadHint: 'Creating and loading do not change running mappings. Click Apply changes when ready.',
  unsavedHint: 'Your current profile has unsaved changes. The new profile will be saved to the library while your edits remain. Save or discard them before loading it.',
  create: 'Create profile', creating: 'Creating…', saveName: 'Save name', renamed: 'Profile renamed to {{name}}',
  offer: 'Create a complete controller mapping?', offerHint: 'Map common buttons, D-pad, both sticks, and triggers automatically instead of assigning each input.',
  createNative: 'Create complete controller mapping', outputOnly: 'Only change current output type',
}
