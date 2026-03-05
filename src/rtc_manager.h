#ifndef RTC_MANAGER_H
#define RTC_MANAGER_H

#include <RTClib.h>

class RTCManager
{

private:

    RTC_DS3231 rtc;

public:

    void begin();

    void getCurrentTime(char *buffer);

    DateTime getNow();   // NEW: return raw RTC time

};

#endif