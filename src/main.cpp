#include <Arduino.h>
#include <WiFi.h>
#include <LittleFS.h>

#include "config.h"
#include "rtc_manager.h"
#include "display_manager.h"
#include "vitals_manager.h"
#include "servo_dispenser.h"
#include "drop_sensor.h"
#include "batch_manager.h"
#include "schedule_manager.h"
#include "web_server.h"

// Global objects
RTCManager rtc;
DisplayManager display;
VitalsManager vitals;
ServoDispenser dispenser(SERVO1_PIN, SERVO2_PIN);
DropSensor drop(DROP_SENSOR_PIN);
BatchManager batchManager(&dispenser, &drop);
ScheduleManager scheduleManager;

// State machine
SystemState state = STANDBY;

// Tray pill tracking (index 0=A, 1=B, 2=C, 3=D)
int trayPills[4] = { TRAY_CAPACITY, TRAY_CAPACITY, TRAY_CAPACITY, TRAY_CAPACITY };

// Last dispense info
bool lastDispenseSuccess = false;
char lastDispenseTime[10] = "00:00:00";
bool hasDispensed = false;

// Manual dispense request from web
bool manualDispenseRequested = false;
TrayBatch manualBatch = {0, 0, 0, 0};

// Vitals read request from web
bool vitalsReadRequested = false;

// Current schedule being processed
MedicineSchedule dueSchedule;
TrayBatch batch;
bool dispenseResult = false;

// Buffers
char timeBuffer[10];
char nextDoseBuffer[6];

// State timing
unsigned long stateEnteredAt = 0;

void decrementTrays(TrayBatch &b)
{
    if(b.trayA > 0) trayPills[0] = max(0, trayPills[0] - b.trayA);
    if(b.trayB > 0) trayPills[1] = max(0, trayPills[1] - b.trayB);
    if(b.trayC > 0) trayPills[2] = max(0, trayPills[2] - b.trayC);
    if(b.trayD > 0) trayPills[3] = max(0, trayPills[3] - b.trayD);
}

void setup()
{
    Serial.begin(115200);

    // Start WiFi AP
    WiFi.softAP(WIFI_AP_SSID, WIFI_AP_PASS);
    Serial.print("WiFi AP started: ");
    Serial.println(WIFI_AP_SSID);
    Serial.print("AP IP: ");
    Serial.println(WiFi.softAPIP());

    // Initialize LittleFS for serving web files
    if(!LittleFS.begin(true)) {
        Serial.println("LittleFS mount failed");
    } else {
        Serial.println("LittleFS mounted");
    }

    // Initialize hardware
    rtc.begin();
    display.begin();
    vitals.begin();
    dispenser.begin();
    drop.begin();
    scheduleManager.begin();

    // Start web server
    setupWebServer();

    stateEnteredAt = millis();

    display.showMessage("MedDispenser", "WiFi Ready");
    delay(2000);

    Serial.println("System Ready");
}

void loop()
{
    unsigned long now = millis();

    switch(state)
    {

    case STANDBY:
    {
        rtc.getCurrentTime(timeBuffer);

        MedicineSchedule next;

        if(scheduleManager.getNextSchedule(rtc, next))
        {
            sprintf(nextDoseBuffer, "%02d:%02d", next.hour, next.minute);
            display.showStandby(timeBuffer, nextDoseBuffer);
        }
        else
        {
            display.showStandby(timeBuffer, "--:--");
        }

        // Check if manual dispense was requested from webapp
        if(manualDispenseRequested)
        {
            manualDispenseRequested = false;

            batch.trayA = manualBatch.trayA;
            batch.trayB = manualBatch.trayB;
            batch.trayC = manualBatch.trayC;
            batch.trayD = manualBatch.trayD;

            // Skip vitals for manual dispense - go straight to dispensing
            display.showMessage("Manual", "Dispensing...");
            state = DISPENSING;
            stateEnteredAt = now;
            break;
        }

        // Check if vitals read was requested from webapp
        if(vitalsReadRequested)
        {
            vitalsReadRequested = false;

            display.showPlaceFinger();
            state = WAIT_FINGER;
            stateEnteredAt = now;

            // Clear dueSchedule so vitals-only read doesn't trigger dispense
            dueSchedule = {0, 0, 0, 0, 0, 0, false, true};
            break;
        }

        // Check scheduled dispense
        if(scheduleManager.checkSchedule(rtc, dueSchedule))
        {
            state = WAIT_FINGER;
            stateEnteredAt = now;
        }
    }
    break;

    case WAIT_FINGER:
    {
        display.showPlaceFinger();

        // Wait 1 second then proceed to vitals reading
        if(now - stateEnteredAt >= 1000)
        {
            state = READING_VITALS;
            stateEnteredAt = now;
        }
    }
    break;

    case READING_VITALS:
    {
        display.showMessage("Reading Vitals", "Please Wait");

        // readVitals() is blocking (waits for finger + 30 samples)
        bool safe = vitals.readVitals();

        if(safe)
        {
            display.showVitalsSafe();

            // If this was a vitals-only request (no scheduled pills), go to result
            if(dueSchedule.trayA == 0 && dueSchedule.trayB == 0 &&
               dueSchedule.trayC == 0 && dueSchedule.trayD == 0)
            {
                dispenseResult = true;
                state = RESULT;
                stateEnteredAt = now;
                break;
            }

            batch.trayA = dueSchedule.trayA;
            batch.trayB = dueSchedule.trayB;
            batch.trayC = dueSchedule.trayC;
            batch.trayD = dueSchedule.trayD;

            state = DISPENSING;
            stateEnteredAt = now;
        }
        else
        {
            display.showVitalsUnsafe();
            state = BLOCKED;
            stateEnteredAt = now;
        }
    }
    break;

    case DISPENSING:
    {
        dispenseResult = batchManager.dispenseBatch(batch);

        if(dispenseResult)
        {
            decrementTrays(batch);
        }

        // Record dispense time
        rtc.getCurrentTime(lastDispenseTime);
        lastDispenseSuccess = dispenseResult;
        hasDispensed = true;

        state = RESULT;
        stateEnteredAt = now;
    }
    break;

    case RESULT:
    {
        if(dispenseResult)
            display.showDispensed();
        else
            display.showMessage("Dispense", "Failed");

        // Show result for 3 seconds
        if(now - stateEnteredAt >= 3000)
        {
            dueSchedule = {0, 0, 0, 0, 0, 0, false, true};
            state = STANDBY;
            stateEnteredAt = now;
        }
    }
    break;

    case BLOCKED:
    {
        display.showVitalsUnsafe();

        // Reset is handled by web server POST /reset
        // Also allow Serial 'R' as fallback
        if(Serial.available())
        {
            char cmd = Serial.read();
            if(cmd == 'R')
            {
                state = STANDBY;
                stateEnteredAt = now;
            }
        }
    }
    break;

    }

    delay(100);
}
