#ifndef VITALS_MANAGER_H
#define VITALS_MANAGER_H

class VitalsManager
{

private:

    bool safeStatus;

public:

    void begin();

    void setVitals(bool safe);   // external input

    bool vitalsSafe();

};

#endif