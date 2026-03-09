#include "servo_dispenser.h"
#include <Arduino.h>

ServoDispenser::ServoDispenser(int s1, int s2)
{
    pin1 = s1;
    pin2 = s2;
}

void ServoDispenser::begin()
{
    servo1.attach(pin1);
    servo2.attach(pin2);

    servo1.write(idleAngle1);
    servo2.write(idleAngle2);
}

void ServoDispenser::dispense(Tray tray)
{

    switch(tray)
    {

        case TRAY_A:

            servo1.write(0);
            delay(1500);
            servo1.write(idleAngle1);

        break;


        case TRAY_B:

            servo1.write(90);
            delay(1500);
            servo1.write(idleAngle1);

        break;


        case TRAY_C:

            servo2.write(0);
            delay(1500);
            servo2.write(idleAngle2);

        break;


        case TRAY_D:

            servo2.write(90);
            delay(1500);
            servo2.write(idleAngle2);

        break;
    }

}
