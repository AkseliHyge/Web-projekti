let currentUnit = "celsius"; //globaali lämpötila

let savedTemp = null;
let savedHourlyTemps = []; //Säilytetään viimeisin lämpötilaa

document.getElementById("search-city").addEventListener("click", getWeather);
document.getElementById("location").addEventListener("click", getWeatherByLocation);

//lämpötilayksikön nappi
document.querySelectorAll(".unit-btn").forEach(btn => {
    btn.addEventListener("click", function() {
        document.querySelectorAll(".unit-btn").forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        // Vaihda yksikkö
        currentUnit = this.dataset.unit; //Päivitetään nykyinen lämpötila
        updateTemperatures();
    });
});

function getWeather() { //Kaupugin perusteella hakeutuva sää funktio
    const api = "c908969d3fb4b105b40027899c6b8bbf";
    const city = document.getElementById("city").value;

    if (!city) {
        alert("Error, enter a city");
        return;
    }

    const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${api}&units=metric`;

    fetch(currentWeatherUrl)
        .then(response => response.json())
        .then(data => { 
            displayWeather(data);

            if (data.coord) {
                const lat = data.coord.lat;
                const lon = data.coord.lon;

                //Haetaan 24h tuntikohtainen ennuste (Open-Meteo)
                const hourlyUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weathercode&timezone=auto`;

                fetch(hourlyUrl)
                    .then(res => res.json())
                    .then(hourlyData => showHourlyWeather(hourlyData))
                    .catch(() => alert("Could not fetch hourly forecast"));

                //Haetaan 7 päivän ennuste (OpenWeatherMap)
                const dailyUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${api}&units=metric&cnt=40`;

                fetch(dailyUrl)
                    .then(res => res.json())
                    .then(dailyData => show7DayForecast(dailyData))
                    .catch(() => alert("Could not fetch 7-day forecast"));
            }
        })
        .catch(() => alert("Could not fetch weather data"));
}

function getWeatherByLocation() { //Paikka Geolocationin avulla
    if (!navigator.geolocation) {
        alert("Geolocation not supported by your browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(success, error);

    function success(position) {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

        fetch(url)
            .then(response => response.json())
            .then(data => displayWeatherByLocation(data))
            .catch(() => alert("Could not fetch weather data"));
    }

    function error() {
        alert("Unable to retrieve your location.");
    }
}

function displayWeather(data) {
  const icon = document.getElementById("weather-icon");
  const info = document.getElementById("weather-info");
  const temp = document.getElementById("temperature");

  if (data.cod !== 200) {
    info.textContent = "City not found.";
    icon.style.display = "none";
    temp.textContent = "";
    return;
  }

  const weather = data.weather[0];
  const temperature = Number(data.main.temp); //Tulee numerona

  savedTemp = temperature;

  icon.src = `https://openweathermap.org/img/wn/${weather.icon}@2x.png`;
  icon.style.display = "block";

  info.textContent = `${data.name}, ${data.sys.country} - ${weather.description}`;
  temp.textContent = `Temperature: ${showTemp(temperature)}`; //Katsotaan mitä yksikköä käytetään

  const isNight = weather.icon.includes("n"); //jos icon päättyy n niin havaitaan yö

  console.log("Temp:", temperature, "Night:", isNight); //Debug print

  changeBackround(temperature, isNight)
}

function displayWeatherByLocation(data) {
  const icon = document.getElementById("weather-icon");
  const info = document.getElementById("weather-info");
  const temp = document.getElementById("temperature");

  if (!data.current_weather) {
    info.textContent = "Weather data unavailable.";
    icon.style.display = "none";
    temp.textContent = "";
    return;
  }

  const temperature = data.current_weather.temperature;
  const weatherCode = data.current_weather.weathercode;

  savedTemp = temperature;

  const description = getDescriptionForCode(weatherCode); //Käytetään samaa funktiota kuin tunneittaisessa ennusteessa

  icon.style.display = "none";
  info.textContent = `Your location - ${description}`;
  temp.textContent = `Temperature: ${showTemp(temperature)}`; //Katsotaan mitä yksikköä käytetään

  changeBackround(temperature, false);
}

function showImage() {
    const weatherIcon = document.getElementById("weather-icon");
    weatherIcon.style.display = "block";
}

function changeBackround(temperature, isNight) {
    const body = document.body

    //Tyhjennetään vanhat luokat
    body.classList.remove("cold", "warm", "hot", "night")

    if (isNight) { 
        body.classList.add("night")
        console.log("night");
    } else if (temperature < 5) {
        body.classList.add("cold")
        console.log("cold");
    } else if (temperature > 5 && temperature < 20) {
        body.classList.add("warm")
        console.log("warm");
    } else if (temperature > 20) {
        body.classList.add("hot")
        console.log("hot"); 
    }

    console.log("Background class:", body.classList.value);
}

function showHourlyWeather(data) {
    const forecastDiv = document.getElementById("hourly-forecast");
    
    const times = data.hourly.time;
    const temps = data.hourly.temperature_2m;
    const codes = data.hourly.weathercode;

    savedHourlyTemps = temps;

    const now = new Date();
    const currentHour = now.getHours();
    
    //Etsitään mistä kohdasta aloitetaan (nykyinen tunti)
    let startIndex = 0;
    for (let i = 0; i < times.length; i++) {
        const time = times[i].split("T")[1]; //Esim. "15:00"
        const hour = parseInt(time.split(":")[0]);
        
        if (hour >= currentHour) {
            startIndex = i;
            break;
        }
    }
    
    forecastDiv.innerHTML = "<h3>Next 24 hours</h3>"; //Tyhjennetään aiempi sisältö

    for (let i = startIndex; i < startIndex + 24 && i < temps.length; i++) {
        const dateTime = times[i].split("T");
        const time = dateTime[1]; //Esim. "15:00"
        const tempCelsius = temps[i];
        const code = codes[i];
        const desc = getDescriptionForCode(code);
        const icon = getIconForCode(code);

        forecastDiv.innerHTML += `
            <div>
                <img src="https://openweathermap.org/img/wn/${icon}.png" alt="" style="width:30px;height:30px;">
                ${time} - ${showTemp(tempCelsius)}, ${desc}
            </div>
        `;
    }
}

function getIconForCode(code) {
    if (code === 0) return "01d"; //Clear sky
    if (code === 1) return "02d"; //Mainly clear
    if (code === 2) return "03d"; //Partly cloudy
    if (code === 3) return "04d"; //Overcast
    if (code >= 45 && code <= 48) return "50d"; //Fog
    if (code >= 51 && code <= 57) return "09d"; //Drizzle
    if (code >= 61 && code <= 67) return "10d"; //Rain
    if (code >= 71 && code <= 77) return "13d"; //Snow
    if (code >= 80 && code <= 82) return "09d"; //Rain showers
    if (code >= 85 && code <= 86) return "13d"; //Snow showers
    if (code >= 95 && code <= 99) return "11d"; //Thunderstorm
    
    return "01d"; //Oletus aurinko
}

function getDescriptionForCode(weatherCode) {
    // Ryhmitellään säätilat logiikan mukaan
    if (weatherCode === 0) return "Clear sky";
    if (weatherCode === 1) return "Mainly clear";
    if (weatherCode === 2) return "Partly cloudy";
    if (weatherCode === 3) return "Overcast";
    if (weatherCode >= 45 && weatherCode <= 48) return "Fog";
    if (weatherCode >= 51 && weatherCode <= 57) return "Drizzle";
    if (weatherCode >= 61 && weatherCode <= 67) return "Rain";
    if (weatherCode >= 71 && weatherCode <= 77) return "Snow";
    if (weatherCode >= 80 && weatherCode <= 82) return "Rain showers";
    if (weatherCode >= 85 && weatherCode <= 86) return "Snow showers";
    if (weatherCode >= 95 && weatherCode <= 99) return "Thunderstorm";
    
    return "Variable weather";
}

function formatTemperature(celsius) {
    return showTemp(celsius);
}

//Celsius fahrenheitiksi tai kelviniksi
function convertTemp(celsius) {
    if (currentUnit === "fahrenheit") {
        return (celsius * 9/5) + 32;
    } else if (currentUnit === "kelvin") {
        return celsius + 273.15;
    } else {
        return celsius;
    }
}

//Näytä lämpötila oikealla yksiköllä
function showTemp(celsius) {
    const converted = convertTemp(celsius);
    let symbol = "°C";
    
    if (currentUnit === "fahrenheit") {
        symbol = "°F";
    } else if (currentUnit === "kelvin") {
        symbol = "K";
    }
    
    return `${converted.toFixed(1)}${symbol}`;
}

function updateTemperatures() {
    //Päivitä nykyinen lämpötila
    if (savedTemp !== null) {
        const temp = document.getElementById("temperature");
        temp.textContent = `Temperature: ${showTemp(savedTemp)}`;
    }
    
    //Päivitä tuntikohtaiset lämpötilat
    if (savedHourlyTemps.length > 0) {
        const forecastDiv = document.getElementById("hourly-forecast");
        const allDivs = forecastDiv.querySelectorAll("div");
        
        //Selvitetään taas mikä tunti nyt on
        const now = new Date();
        const currentHour = now.getHours();
        
        //Käydään läpi kaikki tunnit (paitsi otsikko joka on ensimmäinen)
        for (let i = 1; i < allDivs.length; i++) {
            const div = allDivs[i];
            const text = div.textContent;
            
            //Haetaan aika tekstistä (esim. "15:00")
            const timeMatch = text.match(/\d{2}:\d{2}/);
            if (timeMatch) {
                const time = timeMatch[0];
                
                //Lasketaan mistä kohdasta data löytyy
                const correctIndex = currentHour + (i - 1);
                
                if (correctIndex < savedHourlyTemps.length) {
                    const temperature = savedHourlyTemps[correctIndex];
                    
                    //Haetaan sään kuvaus
                    const descMatch = text.match(/(Clear sky|Mainly clear|Partly cloudy|Overcast|Fog|Drizzle|Rain|Snow|Rain showers|Snow showers|Thunderstorm|Variable weather)/);
                    const description = descMatch ? descMatch[0] : "";
                    
                    //Vaihdetaan teksti uudella lämpötilalla
                    const image = div.querySelector("img");
                    if (image) {
                        div.innerHTML = `
                            <img src="${image.src}" alt="" style="width:30px;height:30px;">
                            ${time} - ${showTemp(temperature)}, ${description}
                        `;
                    }
                }
            }
        }
    }
}

function show7DayForecast(data) {
    const dailyDiv = document.getElementById("daily-forecast");
    
    //Tarkistetaan että data on olemassa
    if (!data.list) {
        dailyDiv.innerHTML = "<h3>7-Day Forecast</h3>";
        return;
    }
    
    dailyDiv.innerHTML = "<h3>7-Day Forecast</h3>";
    
    //OpenWeatherMap antaa 3h välein dataa, joten käsitellään päiväkohtaisesti
    const dailyData = {}; //Tallennetaan päivät tänne
    
    //Käydään läpi kaikki ajankohdat
    for (let i = 0; i < data.list.length; i++) {
        const item = data.list[i];
        const dateTime = new Date(item.dt * 1000);
        const dateString = dateTime.toDateString(); //esim. "Mon Oct 21 2024"
        
        if (!dailyData[dateString]) {
            dailyData[dateString] = {
                date: dateTime,
                temps: [],
                weatherCode: item.weather[0].id,
                icon: item.weather[0].icon
            };
        }
        
        //Lisätään lämpötila tähän päivään
        dailyData[dateString].temps.push(item.main.temp);
    }
    
    //Näytetään päivät
    let dayCount = 0;
    for (let dateString in dailyData) {
        if (dayCount >= 7) break; //näytetään max 7 päivää
        
        const day = dailyData[dateString];
        const dayName = getDayName(day.date);
        
        //Lasketaan max ja min lämpötilat
        const maxTemp = Math.max(...day.temps);
        const minTemp = Math.min(...day.temps);
        
        //Haetaan kuvaus OpenWeatherMap koodilla
        const desc = day.weatherCode < 300 ? "Thunderstorm" :
                     day.weatherCode < 600 ? "Rain" :
                     day.weatherCode < 700 ? "Snow" :
                     day.weatherCode < 800 ? "Fog" :
                     day.weatherCode === 800 ? "Clear sky" : "Cloudy";
        
        dailyDiv.innerHTML += `
            <div>
                <img src="https://openweathermap.org/img/wn/${day.icon}.png" alt="" style="width:40px;height:40px;">
                <strong>${dayName}</strong> - ${showTemp(maxTemp)} / ${showTemp(minTemp)}, ${desc}
            </div>
        `;
        
        dayCount++;
    }
}

function getDayName(date) {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const today = new Date();
    
    //näytetään "Today"
    if (date.toDateString() === today.toDateString()) {
        return "Today";
    }
    
    //näytetään "Tomorrow"
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) {
        return "Tomorrow";
    }
    
    return days[date.getDay()];
}