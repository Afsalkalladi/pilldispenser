#include <Arduino.h>
#include "vitals_manager.h"

void VitalsManager::begin()
{
    Serial.println("Vitals Manager Ready");
}

void VitalsManager::setVitals(bool safe)
{
    safeStatus = safe;
}

bool VitalsManager::vitalsSafe()
{
    return safeStatus;
}