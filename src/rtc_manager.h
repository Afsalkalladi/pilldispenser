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

    DateTime getNow();

    void setTime(int year, int month, int day,
                 int hour, int minute, int second);

};

#endif
