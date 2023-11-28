import { Hono } from "hono";
import ical from "ical-generator";
import { cleanEnv, url } from "envalid";

// Generate the typescript type for an ActionNetwork event documented above:
type ActionNetworkEvent = {
  identifiers: string[];
  created_date: string;
  description: string;
  start_date: string;
  reminders: { method: string; minutes: number }[];
  total_accepted: number;
  "action_network:sponsor": {
    title: string;
    browser_url: string;
  };
  location: {
    venue: string;
    address_lines: string[];
    locality: string;
    region: string;
    postal_code: string;
    country: string;
    location: {
      latitude: number;
      longitude: number;
      accuracy: string;
    };
  };
  modified_date: string;
  status: string;
  transparence: string;
  visibility: string;
  guests_can_invite_others: boolean;
  origin_system: string;
  end_date: string;
  title: string;
  name: string;
  browser_url: string;
  featured_image_url: string;
  instructions: string;
  "action_network:hidden": boolean;
};

type ActionNetworkEventList = {
  _embedded: {
    "osdi:events": ActionNetworkEvent[];
  };
  _links: {
    next: {
      href: string;
    };
  };
};

const app = new Hono();

app.get("/", (c) =>
  c.text(`
Hello!

This is a simple app that serves multiple Action Network Event feeds into an
iCal feed for import into Google Calendar or other Calendar systems.
`)
);

const API_KEY_PREFIX = "ACTION_NETWORK_API_KEY_";
const API_KEYS = Object.fromEntries(
  Object.entries(process.env)
    .filter(([key, _]) => key.startsWith(API_KEY_PREFIX))
    .map(([key, value]) => [key.substring(API_KEY_PREFIX.length), value])
);

// This handler provides a directory of available API keys
app.get("/directory", (c) =>
  c.text(
    Object.keys(API_KEYS)
      .map((key) => `- ${key}`)
      .join("\n")
  )
);

/**
 * This handler responds to requests at the "/events" endpoint. It expects one or more "feed"
 * query parameters, each corresponding to a configured API key. The handler generates an iCal
 * feed with events from the specified feeds for import into calendar systems like Google Calendar.
 */
app.get("/events", async (c) => {
  const nameOverride = c.req.query("name");
  const feeds = c.req.queries("feed");
  if (!feeds) {
    return c.text("No feed query parameters provided.", 400);
  }

  for (const feed of feeds) {
    if (!API_KEYS[feed]) {
      return c.text(`Feed ${feed} is not configured in API keys.`, 400);
    }
  }

  const calendar = await generateICalForFeeds(feeds, nameOverride);

  c.header("Content-Type", "text/calendar");
  c.header("Content-Disposition", "attachment; filename=events.ics");
  return c.newResponse(calendar.toString());
});

/**
 * Generates an iCalendar (iCal) feed for the specified calendar names.
 * If an override calendar name is provided, it will be used as the calendar name
 * in the generated iCal feed. Otherwise, the calendar name is constructed by
 * concatenating the provided calendar names in a title-cased, space-separated string.
 *
 * @param {Array} calendarNames - The list of calendar names to include in the iCal feed.
 * @param {string} [overrideCalendarName] - An optional name to override the default calendar name.
 * @returns {Promise<ical.Component>} A promise that resolves to the generated iCal component.
 */
async function generateICalForFeeds(
  calendarNames: (keyof typeof API_KEYS)[],
  overrideCalendarName?: string
) {
  const allEvents = await Promise.all(
    calendarNames.map(fetchAllEventsForCalendar)
  );

  const flattened = allEvents.flat();

  const name = overrideCalendarName
    ? overrideCalendarName
    : `Events for ${calendarNames
        .join(" ")
        .split(" ")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ")}`;

  const calendar = ical({ name });

  flattened.forEach((event) => {
    // Use default event.end_date, or if it's missing, add 2 hours to event.start_date
    if (!event.end_date) {
      const startDate = new Date(event.start_date);
      startDate.setHours(startDate.getHours() + 2);
      event.end_date = startDate.toISOString();
    }

    calendar.createEvent({
      start: new Date(event.start_date),
      end: new Date(event.end_date),
      summary: event.title,
      description: event.description,
      location: event.location.venue,
    });
  });

  return calendar;
}

/**
 * Fetches all events for a given calendar from the Action Network API.
 * It handles pagination to ensure all events are retrieved.
 * This function will continue to make requests to the API until all pages
 * of events have been fetched and added to the events array.
 *
 * @param {keyof typeof API_KEYS} calendarName - The name of the calendar to fetch events for.
 * @returns {Promise<ActionNetworkEvent[]>} A promise that resolves to an array of events.
 */
async function fetchAllEventsForCalendar(calendarName: keyof typeof API_KEYS) {
  const events: ActionNetworkEvent[] = [];

  let url = "https://actionnetwork.org/api/v2/events";
  let hasNextPage = true;

  const token = API_KEYS[calendarName]!;

  while (hasNextPage) {
    const currentDate = new Date().toISOString();
    const queryParams = new URLSearchParams({
      filter: `start_date gt '${currentDate}'`,
    });
    const response = await fetch(`${url}?${queryParams}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "OSDI-API-Token": token,
      },
    });

    const data = (await response.json()) as ActionNetworkEventList;

    events.push(...data._embedded["osdi:events"]);

    if (data._links.next) {
      url = data._links.next.href;
    } else {
      hasNextPage = false;
    }
  }

  return events;
}

export default app;
