#ifndef VITALS_MANAGER_H
#define VITALS_MANAGER_H

#include <MAX30105.h>

class VitalsManager
{

private:

    MAX30105 sensor;

    bool safeStatus;

    int heartRate;
    int spo2;

public:

    void begin();

    bool readVitals();

    bool vitalsSafe();

};

#endif