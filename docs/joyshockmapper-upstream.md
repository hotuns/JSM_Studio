# JoyShockMapper upstream workflow

## Maintenance policy

The application retains Tauri. The debug console and AI assistant are removed;
the navigation order is Controller Status, Motion Control, Key Mapping, Touchpad,
and JSM Documentation. HidHide is an optional external tool exposed only
through an official download link; Studio does not bundle or manage it.
The Windows app uses `asInvoker` and does not require elevation by default.
Keep the explicit administrator development command for elevated-target input
testing; ordinary development uses `npm run tauri:dev` from a standard terminal.

As of 2026-10-21, JSM Studio no longer follows
`evan1mclean/JSM_custom_curve`. That repository remains the historical fork
source; its future commits, GUI changes, and releases are not synchronization
targets. Existing integrated features, including custom curves, remain maintained
in this project and its engine fork.

`Electronicks/JoyShockMapper` is the sole JoyShockMapper engine upstream.
SDL may be upgraded independently in the engine integration branch when needed,
using a pinned version and compatibility testing. The Studio GUI and application
integration are developed independently.

Following engine updates means merging source changes into the maintained engine
fork, preserving custom curves and Studio controller/telemetry interfaces, then
building and testing the bundled runtime. Do not replace the bundled executable
with an upstream release binary that may lack these extensions. Ship the tested
`JoyShockMapper.exe` and `SDL3.dll` together, recording the engine source commit.

`JSM_Studio` consumes the `jsm-studio` branch of the separate
`hotuns/JoyShockMapper` repository as a Git submodule.

The repository layout is:

```text
Electronicks/JoyShockMapper
            |
            v
hotuns/JoyShockMapper/main
            |
            v
hotuns/JoyShockMapper/jsm-studio
            |
            v
hotuns/JSM_Studio/JoyShockMapper
```

`main` tracks the upstream `master` branch. `jsm-studio` contains the
custom curves and the controller-selection/telemetry interfaces required by
the Tauri application.

## Clone and initialize

```powershell
git clone git@github.com:hotuns/JSM_Studio.git
cd JSM_Studio
git submodule update --init --recursive
```

The submodule is intentionally pinned to a commit. Do not edit its source
directly from the JSM Studio repository; make JoyShockMapper changes in
`hotuns/JoyShockMapper` first.

## Update from Electronicks

In a separate clone of `hotuns/JoyShockMapper`:

```powershell
git fetch upstream
git switch main
git merge --ff-only upstream/master
git switch jsm-studio
git merge main
```

Resolve and test any conflicts in the JoyShockMapper repository, then push
the integration branch:

```powershell
git push origin main
git push origin jsm-studio
```

Update the submodule in JSM Studio:

```powershell
git submodule update --remote --merge JoyShockMapper
```

## Rebuild the bundled runtime

After changing the submodule commit, rebuild the SDL runtime and record the
source commit used for the bundled executable:

```powershell
cd JSM_GUI/jsm_gui_tauri
npm run build:joyshockmapper
```

The SDL backend is currently pinned to SDL 3.4.18. The build script configures
the engine submodule directly in `build-jsm-engine-sdl`, requests the static MSVC
runtime, requires `SDL3.dll`, and copies all DLLs beside the built executable.
`runtime-manifest.json` records the source commit, uncommitted-source flag, SDL
version, and runtime file hashes. A dirty source flag means the commit alone does
not reproduce the binary; commit the engine changes before publishing.

This updates:

```text
src-tauri/bin/SDL/JoyShockMapper.exe
src-tauri/bin/SDL/SDL3.dll
src-tauri/bin/SDL/JoyShockMapper.commit
src-tauri/bin/SDL/runtime-manifest.json
```

Before committing, verify that `JoyShockMapper.commit` matches:

```powershell
git -C ..\..\JoyShockMapper rev-parse HEAD
Get-Content src-tauri\bin\SDL\JoyShockMapper.commit
```

Then commit the submodule pointer and bundled runtime together in JSM
Studio.
