export function generateICS(events) {
  // events: Array of { title, description, start (Date), end (Date), allDay (bool) }

  const formatDate = (date) => {
    // YYYYMMDDTHHMMSSZ
    return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
  };

  const formatAllDayDate = (date) => {
    // YYYYMMDD using local time to ensure the date matches the user's selection
    // regardless of timezone offsets for midnight timestamps.
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  };

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GPC//Anagrafica//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  events.forEach((event) => {
    icsContent.push("BEGIN:VEVENT");
    // Escape special characters in SUMMARY and DESCRIPTION: , ; \
    // Newlines should be escaped as \n
    const escapeIcsText = (str) => {
      if (!str) return "";
      return str
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\n/g, "\\n");
    };

    icsContent.push(`SUMMARY:${escapeIcsText(event.title)}`);
    icsContent.push(`DESCRIPTION:${escapeIcsText(event.description || "")}`);

    // DTSTAMP is required
    icsContent.push(`DTSTAMP:${formatDate(new Date())}`);

    // UID
    icsContent.push(
      `UID:${Date.now()}_${Math.random().toString(36).substr(2, 9)}@gpcapp`,
    );

    if (event.allDay) {
      // DTSTART;VALUE=DATE:20230101
      icsContent.push(`DTSTART;VALUE=DATE:${formatAllDayDate(event.start)}`);
      // For all day events, DTEND is exclusive (next day)
      const nextDay = new Date(event.start);
      nextDay.setDate(nextDay.getDate() + 1);
      icsContent.push(`DTEND;VALUE=DATE:${formatAllDayDate(nextDay)}`);
    } else {
      icsContent.push(`DTSTART:${formatDate(event.start)}`);
      if (event.end) {
        icsContent.push(`DTEND:${formatDate(event.end)}`);
      } else {
        // Default 1 hour duration
        const endDate = new Date(event.start);
        endDate.setHours(endDate.getHours() + 1);
        icsContent.push(`DTEND:${formatDate(endDate)}`);
      }
    }

    icsContent.push("END:VEVENT");
  });

  icsContent.push("END:VCALENDAR");

  return icsContent.join("\r\n");
}

export function downloadICS(filename, content) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generateGoogleCalendarUrl(event) {
  // event: { title, description, start (Date), end (Date), allDay (bool) }
  // URL structure: https://calendar.google.com/calendar/render?action=TEMPLATE&text=Event+Name&dates=YYYYMMDDTHHMMSSZ/YYYYMMDDTHHMMSSZ&details=Event+Description&location=Online

  const formatDate = (date) => {
    // YYYYMMDDTHHMMSSZ (UTC)
    return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
  };

  const formatAllDayDate = (date) => {
    // YYYYMMDD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  };

  let dates = "";
  if (event.allDay) {
    const startStr = formatAllDayDate(event.start);
    const nextDay = new Date(event.start);
    nextDay.setDate(nextDay.getDate() + 1);
    const endStr = formatAllDayDate(nextDay);
    dates = `${startStr}/${endStr}`;
  } else {
    const startStr = formatDate(event.start);
    let endStr;
    if (event.end) {
      endStr = formatDate(event.end);
    } else {
      // Default 1 hour
      const endDate = new Date(event.start);
      endDate.setHours(endDate.getHours() + 1);
      endStr = formatDate(endDate);
    }
    dates = `${startStr}/${endStr}`;
  }

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    details: event.description || "",
    dates: dates,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
