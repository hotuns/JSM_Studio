#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

struct TelemetryStickState
{
	float x = 0.0f;
	float y = 0.0f;
};

struct TelemetryTriggerState
{
	float left = 0.0f;
	float right = 0.0f;
};

struct TelemetryGyroState
{
	float x = 0.0f;
	float y = 0.0f;
	float z = 0.0f;
};

struct TelemetryDeviceStatus
{
	uint64_t buttons = 0;
	TelemetryStickState leftStick;
	TelemetryStickState rightStick;
	TelemetryTriggerState triggers;
	TelemetryGyroState gyro;
};

struct TelemetryDevice
{
	int handle = 0;
	int controllerType = 0;
	int splitType = 0;
	int vendorId = 0;
	int productId = 0;
	std::optional<TelemetryDeviceStatus> status;
};

struct TelemetrySample
{
	uint64_t timestampMs = 0;
	float omega = 0.0f;
	float normalized = 0.0f;
	float sensX = 0.0f;
	float sensY = 0.0f;
	float minThreshold = 0.0f;
	float maxThreshold = 0.0f;
	float sMinX = 0.0f;
	float sMaxX = 0.0f;
	float sMinY = 0.0f;
	float sMaxY = 0.0f;
	std::string curve = "LINEAR";
	std::string paramsJson = "{}";
	std::vector<TelemetryDevice> devices;
	float sampleRateHz = 0.0f;
};

namespace Telemetry
{

constexpr int kProtoVersion = 3;
constexpr int kDefaultPort = 8974;
constexpr int kMaxRateHz = 120;

void Configure(bool enabled, uint16_t port);
void Shutdown();
void MaybeSend(const TelemetrySample &sample);

} // namespace Telemetry
