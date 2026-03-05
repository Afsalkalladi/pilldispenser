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

char timeBuffer[10];
char nextDoseBuffer[6];

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

rtc.getCurrentTime(timeBuffer);

MedicineSchedule next;

if(scheduleManager.getNextSchedule(rtc,next))
{
    sprintf(nextDoseBuffer,"%02d:%02d",
            next.hour,
            next.minute);

    display.showStandby(timeBuffer,nextDoseBuffer);
}

MedicineSchedule due;

if(scheduleManager.checkSchedule(rtc,due))
{

    display.showPlaceFinger();

    bool safe = false;

    while(true)
    {

        if(Serial.available())
        {

            char cmd = Serial.read();

            if(cmd=='V')
            {
                vitals.setVitals(true);
                safe = true;
                break;
            }

            if(cmd=='X')
            {
                vitals.setVitals(false);
                break;
            }

        }

    }

    if(vitals.vitalsSafe())
    {

        display.showVitalsSafe();

        TrayBatch batch;

        batch.trayA = due.trayA;
        batch.trayB = due.trayB;
        batch.trayC = due.trayC;
        batch.trayD = due.trayD;

        bool result =
            batchManager.dispenseBatch(batch);

        if(result)
            display.showDispensed();
        else
            display.showMessage("Dispense","Failed");

    }
    else
    {

        display.showVitalsUnsafe();

    }

}

delay(1000);

}