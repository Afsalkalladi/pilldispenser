#ifndef DISPLAY_MANAGER_H
#define DISPLAY_MANAGER_H

#include <LiquidCrystal_I2C.h>

class DisplayManager
{

private:

    LiquidCrystal_I2C lcd;

public:

    DisplayManager();

    void begin();

    void showMessage(const char* l1, const char* l2);

    void showPlaceFinger();

    void showVitalsSafe();

    void showVitalsUnsafe();

    void showDispensed();

    void showStandby(const char* currentTime, const char* nextDose);

};

#endif