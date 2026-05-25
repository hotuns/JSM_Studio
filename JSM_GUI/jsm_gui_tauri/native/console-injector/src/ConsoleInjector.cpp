#include <windows.h>

#include <cstdlib>
#include <cwchar>
#include <string>
#include <string_view>
#include <vector>
#include <iostream>
#include <filesystem>
#include <fstream>
#include <chrono>
#include <ctime>
#include <algorithm>

namespace
{

constexpr INPUT_RECORD MakeKeyRecord(BOOL keyDown, WORD vk, WORD scan, wchar_t ch, DWORD ctrlState = 0)
{
  INPUT_RECORD record{};
  record.EventType = KEY_EVENT;
  record.Event.KeyEvent.bKeyDown = keyDown;
  record.Event.KeyEvent.wRepeatCount = 1;
  record.Event.KeyEvent.wVirtualKeyCode = vk;
  record.Event.KeyEvent.wVirtualScanCode = scan;
  record.Event.KeyEvent.uChar.UnicodeChar = ch;
  record.Event.KeyEvent.dwControlKeyState = ctrlState;
  return record;
}

DWORD VkScanFromChar(wchar_t ch)
{
  SHORT vkScan = VkKeyScanW(ch);
  if (vkScan == -1)
  {
    return 0;
  }
  WORD vk = LOBYTE(vkScan);
  return MapVirtualKeyW(vk, MAPVK_VK_TO_VSC);
}

DWORD ControlStateFromVk(SHORT vkScan)
{
  if (vkScan == -1)
  {
    return 0;
  }
  DWORD state = 0;
  BYTE modifiers = HIBYTE(vkScan);
  if (modifiers & 1)
  {
    state |= SHIFT_PRESSED;
  }
  if (modifiers & 2)
  {
    state |= LEFT_CTRL_PRESSED;
  }
  if (modifiers & 4)
  {
    state |= LEFT_ALT_PRESSED;
  }
  return state;
}

std::filesystem::path LogPath()
{
  wchar_t modulePath[MAX_PATH];
  DWORD len = GetModuleFileNameW(nullptr, modulePath, MAX_PATH);
  if (len == 0 || len == MAX_PATH)
  {
    return std::filesystem::path(L"console-injector.log");
  }
  std::filesystem::path path(modulePath);
  path = path.parent_path() / L"console-injector.log";
  return path;
}

void AppendLog(const std::wstring &message)
{
  static const std::filesystem::path path = LogPath();
  std::ofstream log(path, std::ios::app);
  if (!log.is_open())
  {
    return;
  }
  const auto now = std::chrono::system_clock::now();
  const auto nowTime = std::chrono::system_clock::to_time_t(now);
  std::tm tm;
  localtime_s(&tm, &nowTime);
  char timestamp[32];
  std::strftime(timestamp, sizeof(timestamp), "%Y-%m-%d %H:%M:%S", &tm);
  std::wstring narrowMsg = message;
  int sizeNeeded = WideCharToMultiByte(CP_UTF8, 0, narrowMsg.c_str(), -1, nullptr, 0, nullptr, nullptr);
  std::string utf8Msg;
  if (sizeNeeded > 0)
  {
    utf8Msg.resize(sizeNeeded - 1);
    WideCharToMultiByte(CP_UTF8, 0, narrowMsg.c_str(), -1, utf8Msg.data(), sizeNeeded - 1, nullptr, nullptr);
  }
  log << "[" << timestamp << "] " << utf8Msg << std::endl;
}

std::wstring TrimLeadingWhitespace(const std::wstring &text)
{
  const size_t first = text.find_first_not_of(L" \t\r\n");
  if (first == std::wstring::npos)
  {
    return L"";
  }
  return text.substr(first);
}

std::wstring TrimWhitespace(const std::wstring &text)
{
  const size_t first = text.find_first_not_of(L" \t\r\n");
  if (first == std::wstring::npos)
  {
    return L"";
  }
  const size_t last = text.find_last_not_of(L" \t\r\n");
  return text.substr(first, last - first + 1);
}

std::wstring RemoveCommandEcho(const std::wstring &text, std::wstring_view command)
{
  const std::wstring expected = TrimWhitespace(std::wstring(command));
  const size_t eol = text.find(L'\n');
  if (eol == std::wstring::npos)
  {
    return TrimWhitespace(text) == expected ? L"" : text;
  }

  const std::wstring firstLine = TrimWhitespace(text.substr(0, eol));
  if (firstLine == expected)
  {
    return TrimWhitespace(text.substr(eol + 1));
  }

  return text;
}

std::wstring TrimRight(const std::wstring &line)
{
  const size_t pos = line.find_last_not_of(L' ');
  if (pos == std::wstring::npos)
  {
    return L"";
  }
  return line.substr(0, pos + 1);
}

std::wstring ReadConsoleText()
{
  HANDLE outputHandle = CreateFileW(L"CONOUT$", GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE, nullptr, OPEN_EXISTING, 0, nullptr);
  if (outputHandle == INVALID_HANDLE_VALUE)
  {
    DWORD error = GetLastError();
    AppendLog(L"CreateFile(CONOUT$) failed with error " + std::to_wstring(error));
    std::wcerr << L"CreateFile(CONOUT$) failed (error " << error << L")\n";
    return L"";
  }

  CONSOLE_SCREEN_BUFFER_INFO csbi{};
  if (!GetConsoleScreenBufferInfo(outputHandle, &csbi))
  {
    DWORD error = GetLastError();
    AppendLog(L"GetConsoleScreenBufferInfo failed with error " + std::to_wstring(error));
    std::wcerr << L"GetConsoleScreenBufferInfo failed (error " << error << L")\n";
    CloseHandle(outputHandle);
    return L"";
  }

  const DWORD width = csbi.dwSize.X;
  const SHORT height = csbi.dwSize.Y;
  if (width == 0 || height <= 0)
  {
    CloseHandle(outputHandle);
    return L"";
  }

  const DWORD length = width * height;
  std::wstring buffer;
  buffer.resize(length, L' ');
  DWORD charsRead = 0;
  if (!ReadConsoleOutputCharacterW(outputHandle, buffer.data(), length, {0, 0}, &charsRead))
  {
    DWORD error = GetLastError();
    AppendLog(L"ReadConsoleOutputCharacterW failed with error " + std::to_wstring(error));
    std::wcerr << L"ReadConsoleOutputCharacterW failed (error " << error << L")\n";
    CloseHandle(outputHandle);
    return L"";
  }
  CloseHandle(outputHandle);

  std::wstring result;
  result.reserve(static_cast<size_t>(charsRead) + static_cast<size_t>(height));
  for (SHORT row = 0; row < height; ++row)
  {
    const size_t start = static_cast<size_t>(row) * static_cast<size_t>(width);
    std::wstring line = buffer.substr(start, width);
    result.append(TrimRight(line));
    result.push_back(L'\n');
  }
  return result;
}

std::wstring DiffConsoleText(const std::wstring &before, const std::wstring &after)
{
  const size_t limit = (std::min)(before.size(), after.size());
  size_t index = 0;
  while (index < limit && before[index] == after[index])
  {
    ++index;
  }
  if (index >= after.size())
  {
    return L"";
  }
  return after.substr(index);
}

std::wstring SanitizeOutput(const std::wstring &text)
{
  std::wstring cleaned;
  cleaned.reserve(text.size());
  for (wchar_t ch : text)
  {
    if (ch == L'\n' || ch == L'\r' || ch == L'\t')
    {
      cleaned.push_back(ch);
    }
    else if (ch >= 0x20 && ch < 0xD800)
    {
      cleaned.push_back(ch);
    }
    else if (ch >= 0xE000 && ch <= 0xFFFD)
    {
      cleaned.push_back(ch);
    }
  }
  const size_t MAX_CHARS = 8192;
  if (cleaned.size() > MAX_CHARS)
  {
    return cleaned.substr(cleaned.size() - MAX_CHARS);
  }
  return cleaned;
}

std::vector<INPUT_RECORD> BuildInputSequence(std::wstring_view command)
{
  const WORD escScan = WORD(MapVirtualKeyW(VK_ESCAPE, MAPVK_VK_TO_VSC));
  const WORD retScan = WORD(MapVirtualKeyW(VK_RETURN, MAPVK_VK_TO_VSC));
  const INPUT_RECORD escDown = MakeKeyRecord(TRUE, VK_ESCAPE, escScan, VK_ESCAPE);
  const INPUT_RECORD escUp = MakeKeyRecord(FALSE, VK_ESCAPE, escScan, VK_ESCAPE);
  const INPUT_RECORD retDown = MakeKeyRecord(TRUE, VK_RETURN, retScan, VK_RETURN);
  const INPUT_RECORD retUp = MakeKeyRecord(FALSE, VK_RETURN, retScan, VK_RETURN);

  std::vector<INPUT_RECORD> inputs;
  inputs.reserve(command.size() + 4);
  inputs.push_back(escDown);
  inputs.push_back(escUp);

  for (wchar_t ch : command)
  {
    SHORT vkScan = VkKeyScanW(ch);
    WORD vk = (vkScan == -1) ? 0 : static_cast<WORD>(LOBYTE(vkScan));
    WORD scan = static_cast<WORD>(VkScanFromChar(ch));
    DWORD controlState = ControlStateFromVk(vkScan);
    inputs.push_back(MakeKeyRecord(TRUE, vk, scan, ch, controlState));
  }

  inputs.push_back(retDown);
  inputs.push_back(retUp);
  return inputs;
}

bool InjectCommand(DWORD pid, std::wstring_view command, std::wstring *capturedOutput = nullptr)
{
  FreeConsole();
  if (!AttachConsole(pid))
  {
    DWORD error = GetLastError();
    AppendLog(L"AttachConsole failed for PID " + std::to_wstring(pid) + L" (error " + std::to_wstring(error) + L")");
    std::wcerr << L"AttachConsole failed for PID " << pid << L" (error " << error << L")\n";
    return false;
  }

  struct ConsoleGuard
  {
    ~ConsoleGuard() { FreeConsole(); }
  } guard;

  SetConsoleCtrlHandler(nullptr, TRUE);

  std::wstring beforeText;
  if (capturedOutput)
  {
    beforeText = ReadConsoleText();
  }

  HANDLE inputHandle = CreateFileW(L"CONIN$", GENERIC_READ | GENERIC_WRITE, FILE_SHARE_READ | FILE_SHARE_WRITE, nullptr, OPEN_EXISTING, 0, nullptr);
  if (inputHandle == INVALID_HANDLE_VALUE)
  {
    DWORD error = GetLastError();
    AppendLog(L"CreateFile(CONIN$) failed with error " + std::to_wstring(error));
    std::wcerr << L"CreateFile(CONIN$) failed (error " << error << L")\n";
    return false;
  }

  auto inputs = BuildInputSequence(command);
  DWORD written = 0;
  if (!WriteConsoleInputW(inputHandle, inputs.data(), static_cast<DWORD>(inputs.size()), &written))
  {
    DWORD error = GetLastError();
    AppendLog(L"WriteConsoleInputW failed with error " + std::to_wstring(error));
    std::wcerr << L"WriteConsoleInputW failed (error " << error << L")\n";
    CloseHandle(inputHandle);
    return false;
  }
  CloseHandle(inputHandle);

  if (capturedOutput)
  {
    std::wstring diff;
    const int attempts = 6;
    for (int i = 0; i < attempts; ++i)
    {
      Sleep(200);
      std::wstring afterText = ReadConsoleText();
      diff = DiffConsoleText(beforeText, afterText);
      if (!diff.empty())
      {
        break;
      }
    }
    std::wstring candidate = SanitizeOutput(TrimWhitespace(diff));
    candidate = RemoveCommandEcho(candidate, command);
    if (candidate.empty())
    {
      std::wstring afterText = ReadConsoleText();
      candidate = SanitizeOutput(TrimWhitespace(afterText));
      candidate = RemoveCommandEcho(candidate, command);
    }
    *capturedOutput = candidate;
  }
  return written == inputs.size();
}

} // namespace

int wmain(int argc, wchar_t *argv[])
{
  if (argc < 3)
  {
    std::wcerr << L"Usage: jsm-console-injector.exe <pid> <command> [--capture]\n";
    return EXIT_FAILURE;
  }

  DWORD pid = static_cast<DWORD>(_wtoi(argv[1]));
  if (pid == 0)
  {
    std::wcerr << L"Invalid PID provided.\n";
    return EXIT_FAILURE;
  }

  std::wstring command = argv[2];
  if (command.empty())
  {
    std::wcerr << L"Command may not be empty.\n";
    return EXIT_FAILURE;
  }

  bool captureOutput = false;
  for (int i = 3; i < argc; ++i)
  {
    if (std::wcscmp(argv[i], L"--capture") == 0 || std::wcscmp(argv[i], L"-c") == 0)
    {
      captureOutput = true;
    }
  }

  std::wstring captured;
  if (!InjectCommand(pid, command, captureOutput ? &captured : nullptr))
  {
    return EXIT_FAILURE;
  }

  if (captureOutput && !captured.empty())
  {
    std::wcout << captured;
  }

  return EXIT_SUCCESS;
}
