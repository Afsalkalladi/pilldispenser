#include <Arduino.h>

#include "config.h"
#include "rtc_manager.h"
#include "display_manager.h"
#include "vitals_manager.h"
#include "servo_dispenser.h"
#include "drop_sensor.h"
#include "batch_manager.h"
#include "schedule_manager.h"

RTCManager rtc;
DisplayManager display;
VitalsManager vitals;
ServoDispenser dispenser(SERVO1_PIN, SERVO2_PIN);
DropSensor drop(DROP_SENSOR_PIN);
BatchManager batchManager(&dispenser,&drop);
ScheduleManager scheduleManager;
MedicineSchedule dueSchedule;
TrayBatch batch;

char timeBuffer[10];
char nextDoseBuffer[6];
bool dispenseResult = false;

enum SystemState
{
    STANDBY,
    WAIT_FINGER,
    READING_VITALS,
    DISPENSING,
    RESULT,
    BLOCKED
};

SystemState state = STANDBY;

void setup()
{

Serial.begin(115200);

rtc.begin();
display.begin();
vitals.begin();

dispenser.begin();
drop.begin();

scheduleManager.begin();

/* ---------- FORCE TEST SCHEDULE ---------- */

DateTime now = rtc.getNow();

scheduleManager.addSchedule(
    now.hour(),
    (now.minute()+1)%60,
    1,0,0,0
);

/* ---------------------------------------- */

Serial.println("System Ready");

}

void loop()
{

switch(state)
{

case STANDBY:
{

    rtc.getCurrentTime(timeBuffer);

    MedicineSchedule next;

    if(scheduleManager.getNextSchedule(rtc,next))
    {
        sprintf(nextDoseBuffer,"%02d:%02d",
                next.hour,
                next.minute);

        display.showStandby(timeBuffer,nextDoseBuffer);
    }

    if(scheduleManager.checkSchedule(rtc,dueSchedule))
    {
        state = WAIT_FINGER;
    }

}
break;

case WAIT_FINGER:
{

    display.showPlaceFinger();
    delay(1000);

    state = READING_VITALS;

}
break;

case READING_VITALS:
{
    display.showMessage("Reading Vitals","Please Wait");
    bool safe = vitals.readVitals();

    if(safe)
    {

        display.showVitalsSafe();

        batch.trayA = dueSchedule.trayA;
        batch.trayB = dueSchedule.trayB;
        batch.trayC = dueSchedule.trayC;
        batch.trayD = dueSchedule.trayD;

        state = DISPENSING;

    }
    else
    {

        display.showVitalsUnsafe();

        state = BLOCKED;

    }

}
break;

case DISPENSING:
{

    dispenseResult = batchManager.dispenseBatch(batch);

    state = RESULT;

}
break;

case RESULT:
{

    if(dispenseResult)
        display.showDispensed();
    else
        display.showMessage("Dispense","Failed");

    delay(3000);

    state = STANDBY;

}
break;

case BLOCKED:
{

    // waiting for reset from webapp
    if(Serial.available())
    {

        char cmd = Serial.read();

        if(cmd=='R')
        {
            state = STANDBY;
        }

    }

}
break;

}

delay(200);

}