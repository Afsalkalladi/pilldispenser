#ifndef SCHEDULE_MANAGER_H
#define SCHEDULE_MANAGER_H

#include "rtc_manager.h"

#define MAX_SCHEDULES 10

struct MedicineSchedule
{
    int hour;
    int minute;

    int trayA;
    int trayB;
    int trayC;
    int trayD;

    bool executed;
};

class ScheduleManager
{

private:

    MedicineSchedule schedules[MAX_SCHEDULES];
    int scheduleCount;

    int lastDay;

public:

    void begin();

    void addSchedule(int hour, int minute,
                     int a, int b, int c, int d);

    bool removeSchedule(int index);

    void clearSchedules();

    int getScheduleCount();

    MedicineSchedule getSchedule(int index);

    bool checkSchedule(RTCManager &rtc,
                       MedicineSchedule &dueSchedule);

    bool getNextSchedule(RTCManager &rtc,
                         MedicineSchedule &nextSchedule);

};

#endif
