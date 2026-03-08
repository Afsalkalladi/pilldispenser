#include "rtc_manager.h"
#include <Arduino.h>

void RTCManager::begin()
{

    if(!rtc.begin())
    {
        Serial.println("RTC not found");
        while(1);
    }

}

void RTCManager::getCurrentTime(char *buffer)
{

    DateTime now = rtc.now();

    sprintf(buffer,"%02d:%02d:%02d",
            now.hour(),
            now.minute(),
            now.second());

}

DateTime RTCManager::getNow()
{
    return rtc.now();
}

void RTCManager::setTime(int year, int month, int day,
                         int hour, int minute, int second)
{
    rtc.adjust(DateTime(year, month, day, hour, minute, second));
    Serial.println("RTC time updated");
}
