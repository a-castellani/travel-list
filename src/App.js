import { useState, useEffect } from "react";
import { Logo } from "./Logo";
import { Form } from "./Form";
import { PackingList } from "./PackingList";

function getWeatherIcon(wmoCode) {
  const icons = new Map([
    [[0], "☀️"],
    [[1], "🌤"],
    [[2], "⛅️"],
    [[3], "☁️"],
    [[45, 48], "☁️"],
    [[51, 56, 61, 66, 80], "🌦"],
    [[53, 55, 63, 65, 57, 67, 81, 82], "🌧"],
    [[71, 73, 75, 77, 85, 86], "🌨"],
    [[95], "🌩"],
    [[96, 99], "⛈"],
  ]);
  const arr = [...icons.keys()].find((key) => key.includes(wmoCode));
  if (!arr) return "NOT FOUND";
  return icons.get(arr);
}

function formatDay(dateStr) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
  }).format(new Date(dateStr));
}

function convertToFlag(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

export default function App() {
  const [items, setItems] = useState(function () {
    const storedItems = localStorage.getItem("items");
    return JSON.parse(storedItems);
  });

  function handleAddItems(item) {
    setItems((items) => [...items, item]);
  }

  function handleDeleteItems(id) {
    setItems((items) => items.filter((item) => item.id !== id));
  }

  function handleToggleItem(id) {
    setItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, packed: !item.packed } : item
      )
    );
  }

  function handleClearList() {
    const confirmed = window.confirm(
      "Are you sure you want to delete all items?"
    );
    if (confirmed) setItems([]);
  }

  useEffect(
    function () {
      localStorage.setItem("items", JSON.stringify(items));
    },
    [items]
  );

  return (
    <div className="app">
      <Logo />
      <Form onAddItems={handleAddItems} />
      <Stats items={items} />
      <Body
        items={items}
        onClearList={handleClearList}
        onDeleteItems={handleDeleteItems}
        onToggleItem={handleToggleItem}
      />
    </div>
  );
}

function Stats({ items }) {
  if (!items?.length)
    return (
      <p className="stats">
        <em>Start adding some items to your packing list 🚀</em>
      </p>
    );

  const numItems = items.length;
  const numPacked = items.filter((item) => item.packed).length;
  const percentage = Math.round((numPacked / numItems) * 100);

  return (
    <footer className="stats">
      {percentage === 100 ? (
        <em>You got everything ready to go! ✈️</em>
      ) : (
        <em>
          You have {numItems} items on your list, and you already packed{" "}
          {numPacked} ({percentage}%)
        </em>
      )}
    </footer>
  );
}

function Body({ onClearList, onDeleteItems, onToggleItem, items }) {
  return (
    <div className="main-app">
      <PackingList
        onClearList={onClearList}
        onDeleteItems={onDeleteItems}
        onToggleItem={onToggleItem}
        items={items}
      />
      <div className="weather-currency-app">
        <GetWeather />
        <MoneyExchange />
      </div>
    </div>
  );
}

function GetWeather() {
  const [city, setCity] = useState("");
  const [cityName, setCityName] = useState("");
  const [weather, setWeather] = useState({});
  const [error, setError] = useState("");

  useEffect(
    function () {
      async function getGeoData() {
        try {
          const geoRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${city}`
          );

          if (!geoRes.ok) throw new Error("Something went wrong with fetching");
          const geoData = await geoRes.json();

          if (!geoData.results) throw new Error("We could't find your city.");
          const { latitude, longitude, timezone, name, country_code } =
            geoData.results[0];

          setCityName(`${name} ${convertToFlag(country_code)}`);

          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=${timezone}&daily=weathercode,temperature_2m_max,temperature_2m_min`
          );

          const weatherData = await weatherRes.json();
          setWeather(weatherData.daily);
        } catch (err) {
          console.error(err.message);
          setError(err.message);
        }
      }
      if (!city) return setWeather({});
      if (city.length > 2) {
        setError("");
        getGeoData();
      }
    },
    [city]
  );

  return (
    <div className="extra-features-weather">
      <h2>7 days weather</h2>
      <FormWeather city={city} setCity={setCity} />
      {error ? (
        <ErrorMessage message={error} />
      ) : weather.time ? (
        <h3>
          <strong>{cityName}</strong>
        </h3>
      ) : (
        ""
      )}
      <DaysWeather weather={weather} cityName={cityName} />
    </div>
  );
}

function FormWeather({ city, setCity }) {
  return (
    <div>
      <form>
        <input
          className="inputs"
          type="text"
          placeholder="Enter a city name..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </form>
    </div>
  );
}

function DaysWeather({ weather }) {
  const {
    temperature_2m_max: max,
    temperature_2m_min: min,
    time: dates,
    weathercode: codes,
  } = weather;

  return (
    <div className="days">
      {dates?.map((date, i) => (
        <DayWeather
          max={max.at(i)}
          min={min.at(i)}
          date={date}
          codes={codes.at(i)}
          key={date}
          isToday={i === 0}
        />
      ))}
    </div>
  );
}

function DayWeather({ max, min, date, codes, isToday }) {
  return (
    <div className="day">
      <p>{isToday ? "Today" : formatDay(date)}</p>
      <p>
        {Math.floor(min)}&deg; &mdash; <strong>{Math.ceil(max)}&deg;</strong>
      </p>
      <span>{getWeatherIcon(codes)}</span>
    </div>
  );
}

function ErrorMessage({ message }) {
  return (
    <p className="error">
      <span>⛔️</span>
      {message}
    </p>
  );
}

function MoneyExchange() {
  const [inputNum, setInputNum] = useState("");
  const [curType, setCurType] = useState("EUR");
  const [newType, setNewType] = useState("USD");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  function checkIsNumber(str) {
    const num = Number(str);
    if (isNaN(num)) return "";
    return num;
  }

  useEffect(
    function () {
      async function fetchExchange() {
        try {
          const res = await fetch(
            `https://api.frankfurter.app/latest?amount=${inputNum}&from=${curType}&to=${newType}`
          );
          if (!res.ok) throw new Error("Something went wrong with fetching");
          const data = await res.json();
          const { rates } = data;
          if (newType) setResult(rates[newType]);
        } catch (err) {
          console.error(err.message);
          setError(err.message);
        }
      }
      if (inputNum <= 0) return setResult("");
      if (curType === newType) return setResult(inputNum);
      if (inputNum && typeof inputNum === "number") fetchExchange();
    },
    [inputNum, curType, newType]
  );

  return (
    <div className="extra-features-currency">
      <h2>Currency converter</h2>
      <div>
        <input
          className="inputs money"
          type="text"
          value={inputNum}
          onChange={(e) => setInputNum(checkIsNumber(e.target.value))}
        />
        <select
          className="selection"
          value={curType}
          onChange={(e) => setCurType(e.target.value)}
        >
          <option value="USD">USD 🇺🇸</option>
          <option value="EUR">EUR 🇪🇺</option>
          <option value="CAD">CAD 🇨🇦</option>
          <option value="INR">INR 🇮🇳</option>
        </select>
        <select
          className="selection"
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
        >
          <option value="USD">USD 🇺🇸</option>
          <option value="EUR">EUR 🇪🇺</option>
          <option value="CAD">CAD 🇨🇦</option>
          <option value="INR">INR 🇮🇳</option>
        </select>
        <div className="result">
          <p>{error && error}</p>
          {result > 0 ? (
            <div className="currency-result">
              <p>{result + " " + newType}</p>
            </div>
          ) : (
            ""
          )}
        </div>
      </div>
    </div>
  );
}
