# Bundled driver installers

These unmodified official installers are redistributed for optional installation from JSM Studio's Settings & components page. They are included as Tauri resources; the frontend does not download them at runtime.

| Component | Bundled release | Upstream |
| --- | --- | --- |
| HidHide | 1.5.230.0, Windows x64 | https://github.com/nefarius/HidHide/releases/tag/v1.5.230.0 |
| ViGEmBus | 1.22.0 | https://github.com/nefarius/ViGEmBus/releases/tag/v1.22.0 |

License notices are included in `HidHide-LICENSE.txt` (MIT) and `ViGEmBus-LICENSE.txt` (BSD-3-Clause). `manifest.json` records original asset URLs, source release links, exact sizes and SHA-256 checksums. Both original executable signatures were verified as valid, signed by Nefarius Software Solutions e.U., when the assets were added.

Run `npm run verify:drivers` before building. Tauri build/dev hooks verify the resources. The backend verifies file size and SHA-256 again before launching an installer, accepts only the two known component IDs, and refuses to reinstall an existing driver through the quick-install button.

Installation uses the original interactive wizard with Windows elevation and `/norestart`. JSM Studio itself continues running without elevation. Cancelling UAC or the wizard is supported; successful installation refreshes driver detection. Installer launch is never part of startup or automated tests.

To update a bundled release, replace its installer from the original upstream, verify its signature, update its entry and license notice, and run the verification/tests. Never change checksums merely to accept an unexplained modified file.
