// JoyShockLibrary.h - Contains declarations of functions
#pragma once

#include <cstdint>
#include <iostream>

enum class AdaptiveTriggerMode : unsigned char
{
	ON = 0x00,					// Not an actual DS5 code
	OFF = 0x05,
	RESISTANCE_RAW = 0x01,
	SEGMENT = 0x02,
	RESISTANCE = 0x21,
	BOW = 0x22,
	GALLOPING = 0x23,
	SEMI_AUTOMATIC = 0x25,
	AUTOMATIC = 0x26,
	MACHINE = 0x27,
	INVALID = 0x7F,
};

struct AdaptiveTriggerSetting
{
	AdaptiveTriggerMode mode = AdaptiveTriggerMode::ON;
	// Keep these 6 fields next to each other and the same type
	uint16_t start = 0;
	uint16_t end = 0;
	uint16_t force = 0;
	uint16_t frequency = 0;
	uint16_t forceExtra = 0;
	uint16_t frequencyExtra = 0;
};

// Defined in operators.cpp
std::istream &operator>>(std::istream &in, AdaptiveTriggerSetting &atm);
std::ostream &operator<<(std::ostream &out, const AdaptiveTriggerSetting &atm);
bool operator==(const AdaptiveTriggerSetting &lhs, const AdaptiveTriggerSetting &rhs);
inline bool operator!=(const AdaptiveTriggerSetting &lhs, const AdaptiveTriggerSetting &rhs)
{
	return !(lhs == rhs);
}


#if defined(JSL_WRAPPER_SOURCE)

#include "JoyShockLibrary.h"

#else

#define JS_TYPE_UNKNOWN 0
#define JS_TYPE_JOYCON_LEFT 1
#define JS_TYPE_JOYCON_RIGHT 2
#define JS_TYPE_PRO_CONTROLLER 3
#define JS_TYPE_DS4 4
#define JS_TYPE_DS 5
#define JS_TYPE_XBOXONE 6
#define JS_TYPE_XBOXONE_ELITE 7
#define JS_TYPE_XBOX_SERIES 8
#define JS_TYPE_HORI_STEAM 9
#define JS_TYPE_G7_PRO_8K 10
#define JS_TYPE_8BITDO_SF30_PRO 11
#define JS_TYPE_8BITDO_SF30_PRO_BT 12
#define JS_TYPE_8BITDO_SN30_PRO 13
#define JS_TYPE_8BITDO_SN30_PRO_BT 14
#define JS_TYPE_8BITDO_PRO_2 15
#define JS_TYPE_8BITDO_PRO_2_BT 16
#define JS_TYPE_8BITDO_PRO_3 17
#define JS_TYPE_8BITDO_ULTIMATE2_WIRELESS 18

#define JS_SPLIT_TYPE_LEFT 1
#define JS_SPLIT_TYPE_RIGHT 2
#define JS_SPLIT_TYPE_FULL 3

// USB VID values
#define JS_VENDOR_UNKNOWN 0
#define JS_VENDOR_8BITDO 0x2dc8
#define JS_VENDOR_GAMESIR 0x3537
#define JS_VENDOR_HORI 0x0f0d
#define JS_VENDOR_MICROSOFT 0x045e
#define JS_VENDOR_PDP 0x0e6f
#define JS_VENDOR_POWERA 0x24c6

// USB PID values
#define JS_PRODUCT_UNKNOWN 0
#define JS_PRODUCT_8BITDO_SF30_PRO 0x6000
#define JS_PRODUCT_8BITDO_SF30_PRO_BT 0x6100
#define JS_PRODUCT_8BITDO_SN30_PRO 0x6001
#define JS_PRODUCT_8BITDO_SN30_PRO_BT 0x6101
#define JS_PRODUCT_8BITDO_PRO_2 0x6003
#define JS_PRODUCT_8BITDO_PRO_2_BT 0x6006
#define JS_PRODUCT_8BITDO_PRO_3 0x6009
#define JS_PRODUCT_8BITDO_ULTIMATE2_WIRELESS 0x6012
#define JS_PRODUCT_GAMESIR_GAMEPAD_G7_PRO_8K 0x10B8
#define JS_PRODUCT_HORI_STEAM_CONTROLLER 0x01ab
#define JS_PRODUCT_HORI_STEAM_CONTROLLER_BT 0x0196
#define JS_PRODUCT_XBOX_ONE_ELITE_SERIES_1 0x02e3
#define JS_PRODUCT_XBOX_ONE_ELITE_SERIES_2 0x0b00
#define JS_PRODUCT_XBOX_ONE_ELITE_SERIES_2_BLUETOOTH 0x0b05
#define JS_PRODUCT_XBOX_ONE_ELITE_SERIES_2_BLE 0x0b22
#define JS_PRODUCT_XBOX_SERIES_X 0x0b12
#define JS_PRODUCT_XBOX_SERIES_X_BLE 0x0b13
#define JS_PRODUCT_XBOX_ONE_XBOXGIP_CONTROLLER 0x02ff

// Device bus definitions
#define JS_HARDWARE_BUS_UNKNOWN 0x00
#define JS_HARDWARE_BUS_USB 0x03
#define JS_HARDWARE_BUS_BLUETOOTH 0x05
#define JS_HARDWARE_BUS_VIRTUAL 0xff

#define JSMASK_UP 0x000001
#define JSMASK_DOWN 0x000002
#define JSMASK_LEFT 0x000004
#define JSMASK_RIGHT 0x000008
#define JSMASK_PLUS 0x000010
#define JSMASK_OPTIONS 0x000010
#define JSMASK_MINUS 0x000020
#define JSMASK_SHARE 0x000020
#define JSMASK_LCLICK 0x000040
#define JSMASK_RCLICK 0x000080
#define JSMASK_L 0x000100
#define JSMASK_R 0x000200
#define JSMASK_ZL 0x000400
#define JSMASK_ZR 0x000800
#define JSMASK_S 0x001000
#define JSMASK_E 0x002000
#define JSMASK_W 0x004000
#define JSMASK_N 0x008000
#define JSMASK_HOME 0x010000
#define JSMASK_PS 0x010000
#define JSMASK_CAPTURE 0x020000
#define JSMASK_TOUCHPAD_CLICK 0x020000
#define JSMASK_MIC 0x040000
#define JSMASK_SL 0x080000
#define JSMASK_SR 0x100000
#define JSMASK_FNL 0x20000
#define JSMASK_FNR 0x400000
#define JSMASK_LTOUCH 0x800000
#define JSMASK_RTOUCH 0x1000000
#define JSMASK_LMINI 0x2000000
#define JSMASK_RMINI 0x4000000
#define JSMASK_MISC1 0x8000000
#define JSMASK_MISC2 0x10000000
#define JSMASK_MISC3 0x20000000
#define JSMASK_MISC4 0x40000000
#define JSMASK_MISC5 0x80000000
#define JSMASK_MISC6 0x100000000

#define JSOFFSET_UP 0
#define JSOFFSET_DOWN 1
#define JSOFFSET_LEFT 2
#define JSOFFSET_RIGHT 3
#define JSOFFSET_PLUS 4
#define JSOFFSET_OPTIONS 4
#define JSOFFSET_MINUS 5
#define JSOFFSET_SHARE 5
#define JSOFFSET_LCLICK 6
#define JSOFFSET_RCLICK 7
#define JSOFFSET_L 8
#define JSOFFSET_R 9
#define JSOFFSET_ZL 10
#define JSOFFSET_ZR 11
#define JSOFFSET_S 12
#define JSOFFSET_E 13
#define JSOFFSET_W 14
#define JSOFFSET_N 15
#define JSOFFSET_HOME 16
#define JSOFFSET_PS 16
#define JSOFFSET_CAPTURE 17
#define JSOFFSET_TOUCHPAD_CLICK 17
#define JSOFFSET_MIC 18
#define JSOFFSET_SL 19
#define JSOFFSET_SR 20
#define JSOFFSET_FNL 21
#define JSOFFSET_FNR 22
#define JSOFFSET_LTOUCH 23
#define JSOFFSET_RTOUCH 24
#define JSOFFSET_LMINI 25
#define JSOFFSET_RMINI 26
#define JSOFFSET_MISC1 27
#define JSOFFSET_MISC2 28
#define JSOFFSET_MISC3 29
#define JSOFFSET_MISC4 30
#define JSOFFSET_MISC5 31
#define JSOFFSET_MISC6 32

// PS5 Player maps for the DS Player Lightbar
#define DS5_PLAYER_1 = 4
#define DS5_PLAYER_2 = 10
#define DS5_PLAYER_3 = 21
#define DS5_PLAYER_4 = 27
#define DS5_PLAYER_5 = 31

typedef struct JOY_SHOCK_STATE
{
	int buttons;
	float lTrigger;
	float rTrigger;
	float stickLX;
	float stickLY;
	float stickRX;
	float stickRY;
} JOY_SHOCK_STATE;

typedef struct IMU_STATE
{
	float accelX;
	float accelY;
	float accelZ;
	float gyroX;
	float gyroY;
	float gyroZ;
} IMU_STATE;

typedef struct MOTION_STATE
{
	float quatW;
	float quatX;
	float quatY;
	float quatZ;
	float accelX;
	float accelY;
	float accelZ;
	float gravX;
	float gravY;
	float gravZ;
} MOTION_STATE;

typedef struct TOUCH_STATE
{
	int t0Id;
	int t1Id;
	bool t0Down;
	bool t1Down;
	float t0X;
	float t0Y;
	float t1X;
	float t1Y;
} TOUCH_STATE;

#endif

class JslWrapper
{
protected:
	JslWrapper()
	{
	}

public:
	virtual ~JslWrapper()
	{
	}
	static JslWrapper* getNew();

	virtual int ConnectDevices() = 0;
	virtual int GetDeviceCount() = 0;
	virtual int GetConnectedDeviceHandles(int* deviceHandleArray, int size) = 0;
	virtual void DisconnectAndDisposeAll() = 0;
	virtual JOY_SHOCK_STATE GetSimpleState(int deviceId) = 0;
	virtual IMU_STATE GetIMUState(int deviceId) = 0;
	virtual MOTION_STATE GetMotionState(int deviceId) = 0;
	virtual TOUCH_STATE GetTouchState(int deviceId, bool previous = false) = 0;
	virtual bool GetTouchpadDimension(int deviceId, int& sizeX, int& sizeY) = 0;
	virtual uint64_t GetButtons(int deviceId) = 0;
	virtual float GetLeftX(int deviceId) = 0;
	virtual float GetLeftY(int deviceId) = 0;
	virtual float GetRightX(int deviceId) = 0;
	virtual float GetRightY(int deviceId) = 0;
	virtual float GetLeftTrigger(int deviceId) = 0;
	virtual float GetRightTrigger(int deviceId) = 0;
	virtual float GetGyroX(int deviceId) = 0;
	virtual float GetGyroY(int deviceId) = 0;
	virtual float GetGyroZ(int deviceId) = 0;
	virtual float GetAccelX(int deviceId) = 0;
	virtual float GetAccelY(int deviceId) = 0;
	virtual float GetAccelZ(int deviceId) = 0;
	virtual int GetTouchId(int deviceId, bool secondTouch = false) = 0;
	virtual bool GetTouchDown(int deviceId, bool secondTouch = false) = 0;
	virtual float GetTouchX(int deviceId, bool secondTouch = false) = 0;
	virtual float GetTouchY(int deviceId, bool secondTouch = false) = 0;
	virtual float GetStickStep(int deviceId) = 0;
	virtual float GetTriggerStep(int deviceId) = 0;
	virtual float GetPollRate(int deviceId) = 0;
	virtual float GetTimeSinceLastUpdate(int deviceId) = 0;
	virtual float GetSampleRateHz(int deviceId) = 0;
	virtual void ResetContinuousCalibration(int deviceId) = 0;
	virtual void StartContinuousCalibration(int deviceId) = 0;
	virtual void PauseContinuousCalibration(int deviceId) = 0;
	virtual void GetCalibrationOffset(int deviceId, float& xOffset, float& yOffset, float& zOffset) = 0;
	virtual void SetCalibrationOffset(int deviceId, float xOffset, float yOffset, float zOffset) = 0;
	virtual void SetCallback(void (*callback)(int, JOY_SHOCK_STATE, JOY_SHOCK_STATE, IMU_STATE, IMU_STATE, float)) = 0;
	virtual void SetTouchCallback(void (*callback)(int, TOUCH_STATE, TOUCH_STATE, float)) = 0;
	virtual int GetControllerType(int deviceId) = 0;
	virtual int GetControllerSplitType(int deviceId) = 0;
	virtual int GetControllerVendor(int deviceId) = 0;
	virtual int GetControllerProduct(int deviceId) = 0;
	virtual int GetControllerColour(int deviceId) = 0;
	virtual void SetLightColour(int deviceId, int colour) = 0;
	virtual void SetRumble(int deviceId, int smallRumble, int bigRumble) = 0;
	virtual void SetPlayerNumber(int deviceId, int number) = 0;
	virtual void SetTriggerEffect(int deviceId, const AdaptiveTriggerSetting &_leftTriggerEffect, const AdaptiveTriggerSetting &_rightTriggerEffect) { };
	virtual void SetMicLight(int deviceId, unsigned char mode) { }
};
