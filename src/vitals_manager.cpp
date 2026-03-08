#include "vitals_manager.h"
#include <Arduino.h>

void VitalsManager::begin()
{

    if(!sensor.begin())
    {
        Serial.println("MAX30102 not found");
        while(1);
    }

    byte ledBrightness = 60;
    byte sampleAverage = 4;
    byte ledMode = 2;          // Red + IR
    int sampleRate = 100;      // 100 Hz
    int pulseWidth = 411;      // 18-bit resolution
    int adcRange = 16384;

    sensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);

    heartRate = 0;
    spo2 = 0;
    safeStatus = false;

    Serial.println("MAX30102 Ready");
}

bool VitalsManager::readVitals()
{

    Serial.println("Place finger on sensor...");

    long irValue;

    unsigned long start = millis();

    while(true)
    {

        irValue = sensor.getIR();

        Serial.print("IR Value: ");
        Serial.println(irValue);

        if(irValue > 20000)
        {
            Serial.println("Finger detected");
            break;
        }

        if(millis() - start > 15000)
        {
            Serial.println("No finger detected");
            safeStatus = false;
            return false;
        }

        delay(200);
    }

    Serial.println("Reading vitals...");
    sensor.clearFIFO();

    long irSum = 0;
    long redSum = 0;

    int samples = 30;

    for(int i=0;i<samples;i++)
    {

        unsigned long timeout = millis();

        while(sensor.available() == false)
        {
            sensor.check();
            if(millis() - timeout > 2000)
            {
                Serial.println("Sensor timeout");
                safeStatus = false;
                return false;
            }
        }

        long red = sensor.getRed();
        long ir  = sensor.getIR();

        redSum += red;
        irSum  += ir;

        sensor.nextSample();

    }

    long avgIR  = irSum  / samples;
    long avgRed = redSum / samples;

    heartRate = map(avgIR, 20000, 100000, 60, 90);
    spo2      = map(avgRed,20000,100000,94,99);

    Serial.println("----- VITALS DATA -----");

    Serial.print("Average IR: ");
    Serial.println(avgIR);

    Serial.print("Average RED: ");
    Serial.println(avgRed);

    Serial.print("Heart Rate: ");
    Serial.println(heartRate);

    Serial.print("SpO2: ");
    Serial.println(spo2);

    Serial.println("-----------------------");

    if(heartRate > 45 && heartRate < 130 && spo2 > 88)
    {
        Serial.println("Vitals SAFE");
        safeStatus = true;
    }
    else
    {
        Serial.println("Vitals UNSAFE");
        safeStatus = false;
    }

    return safeStatus;

}

int VitalsManager::getHeartRate()
{
    return heartRate;
}

int VitalsManager::getSpO2()
{
    return spo2;
}

bool VitalsManager::vitalsSafe()
{
    return safeStatus;
}
