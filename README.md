# action-network-to-ical

This is a small utility that can convert multiple Action Network event feeds into
a live ical event feed, suitable for import into Google as a public calendar.

## Usage

### Getting a List of Event Keys

To get a list of possible keys, issue a `GET` to `https://deployedurl.com/directory`:
```
GET https://deployedurl.com/directory
{

}
```

### Fetching an ical Feed

To fetch an ical feed with all events for all configured Action Network API keys,
issue a `GET` to `https://deployedurl.com/events`. To filter to one or multiple events, include one or multiple `feed=X` parameter, like:
```
GET https://deployedurl.com/events?feed=X&feed=X`
```

### Creating a Google Calendar feed from an ical URL 

To create a Google Calendar feed from a URL:
1. Go to calendar.google.com
2. Near "Other calendars" in the bottom left, click the "+" button to its right
3. Select "From URL"
4. Paste the URL with feed=X&feed=Y included
5. All done!

