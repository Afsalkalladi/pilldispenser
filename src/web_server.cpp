#include "web_server.h"
#include <ArduinoJson.h>
#include <Arduino.h>

AsyncWebServer server(80);

const char* stateToString(SystemState s)
{
    switch(s)
    {
        case STANDBY:        return "STANDBY";
        case WAIT_FINGER:    return "WAIT_FINGER";
        case READING_VITALS: return "READING_VITALS";
        case DISPENSING:     return "DISPENSING";
        case RESULT:         return "RESULT";
        case BLOCKED:        return "BLOCKED";
        default:             return "UNKNOWN";
    }
}

void setupWebServer()
{
    // CORS headers for all responses
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, PATCH, OPTIONS");
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle OPTIONS preflight for all routes
    server.onNotFound([](AsyncWebServerRequest *request){
        if(request->method() == HTTP_OPTIONS){
            request->send(200);
        } else {
            request->send(404, "application/json", "{\"error\":\"Not found\"}");
        }
    });

    // GET /status
    server.on("/status", HTTP_GET, [](AsyncWebServerRequest *request){

        JsonDocument doc;

        doc["state"] = stateToString(state);

        char timeBuffer[10];
        rtc.getCurrentTime(timeBuffer);
        doc["deviceTime"] = timeBuffer;

        doc["heartRate"] = vitals.getHeartRate();
        doc["spo2"] = vitals.getSpO2();
        doc["vitalsSafe"] = vitals.vitalsSafe();

        doc["lastDispenseSuccess"] = lastDispenseSuccess;
        doc["lastDispenseTime"] = lastDispenseTime;
        doc["hasDispensed"] = hasDispensed;

        doc["trayA"] = trayPills[0];
        doc["trayB"] = trayPills[1];
        doc["trayC"] = trayPills[2];
        doc["trayD"] = trayPills[3];

        String response;
        serializeJson(doc, response);
        request->send(200, "application/json", response);
    });

    // GET /schedules
    server.on("/schedules", HTTP_GET, [](AsyncWebServerRequest *request){

        JsonDocument doc;
        JsonArray arr = doc.to<JsonArray>();

        for(int i = 0; i < scheduleManager.getScheduleCount(); i++)
        {
            MedicineSchedule s = scheduleManager.getSchedule(i);
            JsonObject obj = arr.add<JsonObject>();
            obj["index"] = i;
            obj["hour"] = s.hour;
            obj["minute"] = s.minute;
            obj["trayA"] = s.trayA;
            obj["trayB"] = s.trayB;
            obj["trayC"] = s.trayC;
            obj["trayD"] = s.trayD;
        }

        String response;
        serializeJson(doc, response);
        request->send(200, "application/json", response);
    });

    // POST /schedules
    server.on("/schedules", HTTP_POST, [](AsyncWebServerRequest *request){
        request->send(400, "application/json", "{\"error\":\"Body required\"}");
    }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){

        JsonDocument doc;
        DeserializationError error = deserializeJson(doc, data, len);

        if(error)
        {
            request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
            return;
        }

        int hour = doc["hour"] | -1;
        int minute = doc["minute"] | -1;
        int tA = doc["trayA"] | 0;
        int tB = doc["trayB"] | 0;
        int tC = doc["trayC"] | 0;
        int tD = doc["trayD"] | 0;

        if(hour < 0 || hour > 23 || minute < 0 || minute > 59)
        {
            request->send(400, "application/json", "{\"error\":\"Invalid time\"}");
            return;
        }

        if(scheduleManager.getScheduleCount() >= MAX_SCHEDULES)
        {
            request->send(400, "application/json", "{\"error\":\"Max schedules reached\"}");
            return;
        }

        scheduleManager.addSchedule(hour, minute, tA, tB, tC, tD);

        Serial.printf("Schedule added: %02d:%02d A%d B%d C%d D%d\n", hour, minute, tA, tB, tC, tD);

        request->send(201, "application/json", "{\"success\":true}");
    });

    // DELETE /schedules?index=N or DELETE /schedules?all=1
    server.on("/schedules", HTTP_DELETE, [](AsyncWebServerRequest *request){

        if(request->hasParam("all"))
        {
            scheduleManager.clearSchedules();
            Serial.println("All schedules cleared");
            request->send(200, "application/json", "{\"success\":true}");
            return;
        }

        if(!request->hasParam("index"))
        {
            request->send(400, "application/json", "{\"error\":\"index parameter required\"}");
            return;
        }

        int index = request->getParam("index")->value().toInt();

        if(scheduleManager.removeSchedule(index))
        {
            Serial.printf("Schedule %d removed\n", index);
            request->send(200, "application/json", "{\"success\":true}");
        }
        else
        {
            request->send(404, "application/json", "{\"error\":\"Invalid index\"}");
        }
    });

    // POST /reset
    server.on("/reset", HTTP_POST, [](AsyncWebServerRequest *request){

        if(state != BLOCKED)
        {
            JsonDocument doc;
            doc["error"] = String("Device is in ") + stateToString(state) + " state. Reset only available when BLOCKED.";
            String resp;
            serializeJson(doc, resp);
            request->send(400, "application/json", resp);
            return;
        }

        state = STANDBY;
        Serial.println("Device reset from BLOCKED to STANDBY via web");

        request->send(200, "application/json", "{\"success\":true,\"message\":\"Device reset to STANDBY\"}");
    });

    // POST /manual-dispense
    server.on("/manual-dispense", HTTP_POST, [](AsyncWebServerRequest *request){
        request->send(400, "application/json", "{\"error\":\"Body required\"}");
    }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){

        if(state != STANDBY)
        {
            JsonDocument doc;
            doc["error"] = String("Device is in ") + stateToString(state) + " state. Manual dispense only in STANDBY.";
            String resp;
            serializeJson(doc, resp);
            request->send(400, "application/json", resp);
            return;
        }

        JsonDocument doc;
        DeserializationError error = deserializeJson(doc, data, len);

        if(error)
        {
            request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
            return;
        }

        manualBatch.trayA = doc["trayA"] | 0;
        manualBatch.trayB = doc["trayB"] | 0;
        manualBatch.trayC = doc["trayC"] | 0;
        manualBatch.trayD = doc["trayD"] | 0;

        if(manualBatch.trayA + manualBatch.trayB + manualBatch.trayC + manualBatch.trayD == 0)
        {
            request->send(400, "application/json", "{\"error\":\"At least one tray must have pills\"}");
            return;
        }

        manualDispenseRequested = true;

        Serial.printf("Manual dispense requested: A%d B%d C%d D%d\n",
            manualBatch.trayA, manualBatch.trayB, manualBatch.trayC, manualBatch.trayD);

        request->send(200, "application/json", "{\"success\":true,\"message\":\"Manual dispense initiated\"}");
    });

    // POST /sync-time
    server.on("/sync-time", HTTP_POST, [](AsyncWebServerRequest *request){
        request->send(400, "application/json", "{\"error\":\"Body required\"}");
    }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){

        JsonDocument doc;
        DeserializationError error = deserializeJson(doc, data, len);

        if(error)
        {
            request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
            return;
        }

        int year = doc["year"] | 2024;
        int month = doc["month"] | 1;
        int day = doc["day"] | 1;
        int hour = doc["hour"] | 0;
        int minute = doc["minute"] | 0;
        int second = doc["second"] | 0;

        rtc.setTime(year, month, day, hour, minute, second);

        Serial.printf("Time synced: %04d-%02d-%02d %02d:%02d:%02d\n",
            year, month, day, hour, minute, second);

        request->send(200, "application/json", "{\"success\":true,\"message\":\"Device clock synced\"}");
    });

    // POST /read-vitals
    server.on("/read-vitals", HTTP_POST, [](AsyncWebServerRequest *request){

        if(state != STANDBY)
        {
            JsonDocument doc;
            doc["error"] = String("Device is in ") + stateToString(state) + " state. Vitals reading only in STANDBY.";
            String resp;
            serializeJson(doc, resp);
            request->send(400, "application/json", resp);
            return;
        }

        vitalsReadRequested = true;

        request->send(200, "application/json", "{\"success\":true,\"message\":\"Vitals reading initiated\"}");
    });

    // GET /trays
    server.on("/trays", HTTP_GET, [](AsyncWebServerRequest *request){

        JsonDocument doc;

        JsonObject a = doc["A"].to<JsonObject>();
        a["pillCount"] = trayPills[0];
        a["capacity"] = TRAY_CAPACITY;
        a["isLow"] = trayPills[0] <= TRAY_LOW_THRESHOLD;

        JsonObject b = doc["B"].to<JsonObject>();
        b["pillCount"] = trayPills[1];
        b["capacity"] = TRAY_CAPACITY;
        b["isLow"] = trayPills[1] <= TRAY_LOW_THRESHOLD;

        JsonObject c = doc["C"].to<JsonObject>();
        c["pillCount"] = trayPills[2];
        c["capacity"] = TRAY_CAPACITY;
        c["isLow"] = trayPills[2] <= TRAY_LOW_THRESHOLD;

        JsonObject d = doc["D"].to<JsonObject>();
        d["pillCount"] = trayPills[3];
        d["capacity"] = TRAY_CAPACITY;
        d["isLow"] = trayPills[3] <= TRAY_LOW_THRESHOLD;

        String response;
        serializeJson(doc, response);
        request->send(200, "application/json", response);
    });

    // POST /trays/refill
    server.on("/trays/refill", HTTP_POST, [](AsyncWebServerRequest *request){
        request->send(400, "application/json", "{\"error\":\"Body required\"}");
    }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){

        JsonDocument doc;
        DeserializationError error = deserializeJson(doc, data, len);

        if(error)
        {
            request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
            return;
        }

        const char* tray = doc["tray"] | "";

        if(strcmp(tray, "A") == 0) { trayPills[0] = TRAY_CAPACITY; }
        else if(strcmp(tray, "B") == 0) { trayPills[1] = TRAY_CAPACITY; }
        else if(strcmp(tray, "C") == 0) { trayPills[2] = TRAY_CAPACITY; }
        else if(strcmp(tray, "D") == 0) { trayPills[3] = TRAY_CAPACITY; }
        else
        {
            request->send(400, "application/json", "{\"error\":\"Invalid tray. Use A, B, C, or D.\"}");
            return;
        }

        Serial.printf("Tray %s refilled to %d\n", tray, TRAY_CAPACITY);

        request->send(200, "application/json", "{\"success\":true}");
    });

    server.begin();
    Serial.println("Web server started on port 80");
}
