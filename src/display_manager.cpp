#include "display_manager.h"
#include <Arduino.h>

DisplayManager::DisplayManager()
: lcd(0x27,16,2)
{
}

void DisplayManager::begin()
{
    lcd.init();
    lcd.backlight();
}

void DisplayManager::showMessage(const char* l1, const char* l2)
{
    lcd.clear();

    lcd.setCursor(0,0);
    lcd.print(l1);

    lcd.setCursor(0,1);
    lcd.print(l2);
}

void DisplayManager::showPlaceFinger()
{
    showMessage("Place Finger", "On Sensor");
}

void DisplayManager::showVitalsSafe()
{
    showMessage("Vitals OK", "Dispensing...");
}

void DisplayManager::showVitalsUnsafe()
{
    showMessage("Vitals Unsafe", "Medicine Blocked");
}

void DisplayManager::showDispensed()
{
    showMessage("Medicine", "Dispensed");
}

void DisplayManager::showStandby(const char* currentTime, const char* nextDose)
{

    lcd.clear();

    lcd.setCursor(0,0);
    lcd.print(currentTime);

    lcd.setCursor(0,1);
    lcd.print("Next:");
    lcd.print(nextDose);

}