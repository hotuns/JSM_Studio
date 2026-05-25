# JoyShockMapper Console Injector

A small helper executable that attaches to the running JoyShockMapper console and
injects any text command you pass it (e.g. a profile path such as `profiles-library/My Profile.txt`) as if the user had typed it manually.

To capture the console output from the injected command, add `--capture` (or `-c`)
as a third argument. Without the flag it behaves exactly as before.

## Building

```
cd JSM_GUI/jsm_gui_tauri
npm run build:sidecars
```

The build writes `jsm-console-injector.exe` directly to
`src-tauri/bin/SDL/`, which is the resource directory bundled by Tauri.
