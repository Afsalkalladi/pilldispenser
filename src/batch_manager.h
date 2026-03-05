#ifndef BATCH_MANAGER_H
#define BATCH_MANAGER_H

#include "servo_dispenser.h"
#include "drop_sensor.h"

struct TrayBatch
{
    int trayA;
    int trayB;
    int trayC;
    int trayD;
};

class BatchManager
{

private:

    ServoDispenser *dispenser;
    DropSensor *sensor;

public:

    BatchManager(ServoDispenser *d, DropSensor *s);

    bool dispenseBatch(TrayBatch batch);

};

#endif