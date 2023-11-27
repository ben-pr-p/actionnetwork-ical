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


