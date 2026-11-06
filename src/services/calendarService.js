import * as Calendar from "expo-calendar/legacy";

const getCalendarPermission = async () => {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== "granted") {
    throw new Error(
      "Calendar access is required to add this event. You can enable it in your device settings.",
    );
  }
};

const getWritableCalendarId = async () => {
  const calendars = await Calendar.getCalendarsAsync(
    Calendar.EntityTypes.EVENT,
  );
  const writableCalendar = calendars.find(
    (calendar) => calendar.allowsModifications !== false,
  );

  if (!writableCalendar?.id) {
    throw new Error("No writable calendar is available on this device.");
  }

  return writableCalendar.id;
};

export const addEventToDeviceCalendar = async (event) => {
  const startDate = new Date(event?.start_date);
  if (!event?.start_date || Number.isNaN(startDate.getTime())) {
    throw new Error("This event does not have a valid start date yet.");
  }

  const endDate = event?.end_date ? new Date(event.end_date) : null;
  const validEndDate =
    endDate && !Number.isNaN(endDate.getTime()) && endDate > startDate
      ? endDate
      : new Date(startDate.getTime() + 60 * 60 * 1000);

  await getCalendarPermission();
  const calendarId = await getWritableCalendarId();

  return Calendar.createEventAsync(calendarId, {
    title: String(event?.title ?? "LumiNUs event"),
    startDate,
    endDate: validEndDate,
    location: String(
      event?.venue?.address ??
        event?.venue?.name ??
        event?.platform ??
        "",
    ),
    notes: String(event?.description ?? ""),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
};
