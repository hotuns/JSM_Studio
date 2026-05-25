cmake_minimum_required(VERSION 3.20)
project(jsm_console_injector LANGUAGES CXX)

add_executable(jsm-console-injector src/ConsoleInjector.cpp)
target_compile_features(jsm-console-injector PRIVATE cxx_std_17)

set(JSM_STUDIO_BIN_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../src-tauri/bin/SDL")
set_target_properties(jsm-console-injector PROPERTIES
  RUNTIME_OUTPUT_DIRECTORY "${JSM_STUDIO_BIN_DIR}"
  RUNTIME_OUTPUT_DIRECTORY_DEBUG "${JSM_STUDIO_BIN_DIR}"
  RUNTIME_OUTPUT_DIRECTORY_RELEASE "${JSM_STUDIO_BIN_DIR}"
  RUNTIME_OUTPUT_DIRECTORY_RELWITHDEBINFO "${JSM_STUDIO_BIN_DIR}"
  RUNTIME_OUTPUT_DIRECTORY_MINSIZEREL "${JSM_STUDIO_BIN_DIR}"
)

if(MSVC)
  target_compile_options(jsm-console-injector PRIVATE /W4 /EHsc /utf-8)
else()
  target_compile_options(jsm-console-injector PRIVATE -Wall -Wextra -pedantic)
endif()
