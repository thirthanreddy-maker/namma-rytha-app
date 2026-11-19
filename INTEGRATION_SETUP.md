# Namma Rytha integration setup

## IoT devices and simulator

Creating a plot through **My Farm → Add plot** generates a unique device ingest token. Send readings to `POST /api/iot/ingest` with the token in the `x-iot-device-token` header. The JSON body accepts integer `moisture` (0–100), `temperature` (-30–70), `humidity` (0–100), `battery` (0–100), and an optional `source` of `sensor` or `simulated`.

Example:

```bash
curl -X POST https://nammafarm-7aptvepg.manus.space/api/iot/ingest \
  -H 'x-iot-device-token: PLOT_TOKEN' \
  -H 'content-type: application/json' \
  -d '{"moisture":42,"temperature":28,"humidity":64,"battery":91,"source":"simulated"}'
```

## Live market prices

The market adapter targets the CEDA Agmarknet API. Set `CEDA_AGMARKNET_API_KEY` in the server environment. The optional `CEDA_AGMARKNET_API_URL` defaults to `https://api.ceda.ashoka.edu.in/v1/prices`. When a key is missing or the provider is unavailable, the UI labels the response as a demo fallback instead of presenting it as live data.

## SMS and WhatsApp alerts

Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and the sender values `TWILIO_SMS_FROM` and/or `TWILIO_WHATSAPP_FROM`. Farmers choose their international phone number and channel in **Notifications**. The test button sends only after the provider is configured. Without these values, alerts stay in-app and the API reports that the provider is not configured.

## Scheduled irrigation checks

After a farmer creates a crop cycle, **Crop calendar → Schedule daily irrigation checks** creates a six-field UTC heartbeat job that calls `/api/scheduled/irrigation-alert`. The callback uses the cron task UID to find the crop cycle, reads the latest plot sensor value, and sends an SMS or WhatsApp alert only when moisture is below 35% and the farmer has selected an external channel. The callback is idempotent and safely skips orphaned schedules, missing owners, healthy moisture, and in-app-only preferences.
