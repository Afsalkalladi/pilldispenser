#include <Arduino.h>
#include "drop_sensor.h"

DropSensor::DropSensor(int sensorPin)
{
    pin = sensorPin;
}

void DropSensor::begin()
{
    pinMode(pin, INPUT);
}

void DropSensor::startDetection()
{
    detected = false;
}

void DropSensor::update()
{

    if(digitalRead(pin) == LOW)   // LOW usually means object detected
    {
        detected = true;
    }

}

bool DropSensor::pillDetected()
{
    return detected;
}