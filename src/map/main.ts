import mapboxgl from "mapbox-gl";
import Papa from "papaparse";
import "mapbox-gl/dist/mapbox-gl.css";
import "./style.css";

mapboxgl.accessToken =
  "pk.eyJ1IjoibWlrZS1waWVyY2UtZGlnaXRhbHNlcnZpY2UiLCJhIjoiY21oM2dtNmVxMTVjcmQzc2IxbDc4eXV0dyJ9.MbZkYC0SWQ_a-OHNddzOXg";
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/standard",
  center: [10, 51], // Centered on Germany
  zoom: 6,
  projection: "globe",
});

map.on("load", () => {
  fetch("/data/people-map/people.csv")
    .then((response) => response.text())
    .then((csvText) => {
      Papa.parse(csvText, {
        header: true,
        complete: (results) => {
          plotData(results.data);
        },
      });
    });
});

function plotData(data) {
  const geocodingPromises = data
    .filter((person) => person.Country)
    .map((person) => {
      const query = person.Bundesland
        ? `${person.Bundesland}, ${person.Country}`
        : person.Country;
      return fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${mapboxgl.accessToken}`
      )
        .then((response) => response.json())
        .then((geoData) => {
          if (geoData.features && geoData.features.length > 0) {
            return {
              person,
              coordinates: geoData.features[0].center,
            };
          }
          return null;
        });
    });

  Promise.all(geocodingPromises).then((results) => {
    const validResults = results.filter((r) => r !== null);

    const locations = new Map();
    validResults.forEach((result) => {
      const key = result.coordinates.toString();
      if (!locations.has(key)) {
        locations.set(key, []);
      }
      locations.get(key).push(result.person);
    });

    locations.forEach((people, key) => {
      const coordinates = key.split(",").map(Number);
      if (people.length > 1) {
        // Apply offset
        const radius = 0.5; // adjust as needed
        people.forEach((person, i) => {
          const angle = (i / people.length) * 2 * Math.PI;
          const newCoords = [
            coordinates[0] + radius * Math.cos(angle),
            coordinates[1] + radius * Math.sin(angle),
          ];
          addMarker(person, newCoords);
        });
      } else {
        addMarker(people[0], coordinates);
      }
    });
  });
}

function addMarker(person, coordinates) {
  const el = document.createElement("div");
  el.className = "profile-pic";
  el.style.backgroundImage = `url(${person.ProfilePic})`;
  el.style.backgroundSize = "cover";

  new mapboxgl.Marker(el)
    .setLngLat(coordinates)
    .setPopup(
      new mapboxgl.Popup({ offset: 80 }).setHTML(
        `<h3>${person.FirstName} ${person.LastName}</h3><p>${person.Anecdote}</p>`
      )
    )
    .addTo(map);
}
