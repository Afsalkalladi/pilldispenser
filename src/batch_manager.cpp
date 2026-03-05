#include <Arduino.h>
#include "batch_manager.h"

BatchManager::BatchManager(ServoDispenser *d, DropSensor *s)
{
    dispenser = d;
    sensor = s;
}

bool BatchManager::dispenseBatch(TrayBatch batch)
{

    Serial.println("Starting batch dispense");

    sensor->startDetection();

    // Tray A
    for(int i=0;i<batch.trayA;i++)
    {
        dispenser->dispense(TRAY_A);
        delay(1000);
    }

    // Tray B
    for(int i=0;i<batch.trayB;i++)
    {
        dispenser->dispense(TRAY_B);
        delay(1000);
    }

    // Tray C
    for(int i=0;i<batch.trayC;i++)
    {
        dispenser->dispense(TRAY_C);
        delay(1000);
    }

    // Tray D
    for(int i=0;i<batch.trayD;i++)
    {
        dispenser->dispense(TRAY_D);
        delay(1000);
    }

    unsigned long start = millis();

    while(millis() - start < 5000)
    {
        sensor->update();
    }

    if(sensor->pillDetected())
    {
        Serial.println("Medicine Dispensed");
        return true;
    }

    Serial.println("Dispense Failed");

    return false;
}