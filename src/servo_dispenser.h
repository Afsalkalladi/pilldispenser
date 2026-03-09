#ifndef SERVO_DISPENSER_H
#define SERVO_DISPENSER_H

#include <ESP32Servo.h>

enum Tray
{
    TRAY_A,
    TRAY_B,
    TRAY_C,
    TRAY_D
};

class ServoDispenser
{
private:

    Servo servo1;
    Servo servo2;

    int pin1;
    int pin2;

    int idleAngle1 = 45;   // Idle angle for servo1 (Tray A & B)
    int idleAngle2 = 45;   // Idle angle for servo2 (Tray C & D)

public:

    ServoDispenser(int s1, int s2);

    void begin();

    void dispense(Tray tray);
};

#endif