#ifndef WEB_SERVER_H
#define WEB_SERVER_H

#include <ESPAsyncWebServer.h>
#include "schedule_manager.h"
#include "vitals_manager.h"
#include "rtc_manager.h"
#include "batch_manager.h"
#include "config.h"

// Forward declare the state enum and variables from main
enum SystemState
{
    STANDBY,
    WAIT_FINGER,
    READING_VITALS,
    DISPENSING,
    RESULT,
    BLOCKED
};

// These are defined in main.cpp and shared with web_server
extern SystemState state;
extern RTCManager rtc;
extern VitalsManager vitals;
extern ScheduleManager scheduleManager;
extern BatchManager batchManager;

// Tray pill tracking
extern int trayPills[4];

// Last dispense result
extern bool lastDispenseSuccess;
extern char lastDispenseTime[10];
extern bool hasDispensed;

// Manual dispense request
extern bool manualDispenseRequested;
extern TrayBatch manualBatch;

// Vitals read request
extern bool vitalsReadRequested;

const char* stateToString(SystemState s);

void setupWebServer();

#endif
