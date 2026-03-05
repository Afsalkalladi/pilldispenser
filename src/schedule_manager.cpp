#include "schedule_manager.h"

void ScheduleManager::begin()
{
    scheduleCount = 0;
    lastDay = -1;
}

void ScheduleManager::addSchedule(int hour, int minute,
                                  int a, int b, int c, int d)
{

    if(scheduleCount >= MAX_SCHEDULES)
        return;

    schedules[scheduleCount].hour = hour;
    schedules[scheduleCount].minute = minute;

    schedules[scheduleCount].trayA = a;
    schedules[scheduleCount].trayB = b;
    schedules[scheduleCount].trayC = c;
    schedules[scheduleCount].trayD = d;

    schedules[scheduleCount].executed = false;

    scheduleCount++;
}

bool ScheduleManager::checkSchedule(RTCManager &rtc,
                                    MedicineSchedule &dueSchedule)
{

    DateTime now = rtc.getNow();

    if(now.day() != lastDay)
    {
        lastDay = now.day();

        for(int i=0;i<scheduleCount;i++)
            schedules[i].executed = false;
    }

    for(int i=0;i<scheduleCount;i++)
    {

        if(!schedules[i].executed)
        {

            if(now.hour() == schedules[i].hour &&
               now.minute() == schedules[i].minute)
            {

                schedules[i].executed = true;

                dueSchedule = schedules[i];

                return true;
            }

        }

    }

    return false;
}

bool ScheduleManager::getNextSchedule(RTCManager &rtc,
                                      MedicineSchedule &nextSchedule)
{

    DateTime now = rtc.getNow();

    int currentMinutes = now.hour()*60 + now.minute();

    int bestDiff = 1440;

    bool found = false;

    for(int i=0;i<scheduleCount;i++)
    {

        int schedMinutes =
            schedules[i].hour*60 +
            schedules[i].minute;

        int diff = schedMinutes - currentMinutes;

        if(diff < 0)
            diff += 1440;

        if(diff < bestDiff)
        {
            bestDiff = diff;
            nextSchedule = schedules[i];
            found = true;
        }

    }

    return found;
}