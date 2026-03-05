#ifndef DROP_SENSOR_H
#define DROP_SENSOR_H

class DropSensor
{

private:

    int pin;
    bool detected;

public:

    DropSensor(int sensorPin);

    void begin();

    void startDetection();

    void update();

    bool pillDetected();

};

#endif