import { showModal } from "./ui.js";

let weatherCitiesCache = [];
let weatherCurrentIndex = 0;
const WEATHER_CHUNK_SIZE = 9;

export async function initWeather() {
    const weatherBtn = document.getElementById('weather-temp-btn');
    const weatherModal = document.getElementById('weather-modal');
    const weatherGrid = document.getElementById('weather-grid');
    const tempDisplay = document.getElementById('toshkent-temp');

    if (!tempDisplay || !weatherBtn) return;

    try {
        const res = await fetch('/api/weather?city=Tashkent');
        const data = await res.json();
        if (data && data.success) {
            tempDisplay.textContent = Math.round(data.data.temp) + "°C";
        }
    } catch (err) {
        console.error("Toshkent weather error:", err);
    }

    weatherBtn.onclick = async () => {
        showModal(weatherModal);
        
        weatherGrid.innerHTML = '<div class="loader-container" style="grid-column: 1/-1; text-align: center; padding: 3rem;"><i class="fas fa-circle-notch fa-spin fa-2x"></i><p style="margin-top: 1rem;">Shaharlar qidirilmoqda...</p></div>';

        try {
            const mapRes = await fetch('/api/destination_cities');
            const mapData = await mapRes.json();
            if (mapData && mapData.cities && mapData.cities.length > 0) {
                weatherCitiesCache = mapData.cities;
                weatherCurrentIndex = 0;
                weatherGrid.innerHTML = '';
                await loadNextWeatherChunk();
            } else {
                weatherGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Hozircha manzil shaharlar topilmadi.</p>';
            }
        } catch (err) {
            console.error("Weather modal error:", err);
            weatherGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Xatolik yuz berdi.</p>';
        }
    };
}

async function loadNextWeatherChunk() {
    const weatherGrid = document.getElementById('weather-grid');
    const loadMoreBtn = document.getElementById('load-more-weather-btn');
    if (loadMoreBtn) loadMoreBtn.remove();

    const chunk = weatherCitiesCache.slice(weatherCurrentIndex, weatherCurrentIndex + WEATHER_CHUNK_SIZE);
    if (chunk.length === 0) return;

    const loader = document.createElement('div');
    loader.className = 'loader-container';
    loader.style = 'grid-column: 1/-1; text-align: center; padding: 1rem;';
    loader.innerHTML = '<i class="fas fa-circle-notch fa-spin fa-1x"></i> Yuklanmoqda...';
    weatherGrid.appendChild(loader);

    try {
        const citiesStr = chunk.join(',');
        const weatherRes = await fetch(`/api/weather?cities=${citiesStr}`);
        const weatherData = await weatherRes.json();
        
        loader.remove();

        if (weatherData && weatherData.success) {
            renderWeatherCardsAppend(weatherData.results);
            weatherCurrentIndex += WEATHER_CHUNK_SIZE;

            if (weatherCurrentIndex < weatherCitiesCache.length) {
                const btnContainer = document.createElement('div');
                btnContainer.id = 'load-more-weather-btn';
                btnContainer.style = 'grid-column: 1/-1; text-align: center; margin-top: 1.5rem;';
                btnContainer.innerHTML = `<button class="nav-btn" style="padding: 12px 30px; font-size: 1rem; cursor: pointer;"><i class="fas fa-chevron-down"></i> Yana ko'proq shaharlar</button>`;
                btnContainer.querySelector('button').onclick = loadNextWeatherChunk;
                weatherGrid.appendChild(btnContainer);
            }
        } else {
            weatherGrid.innerHTML += '<p style="grid-column: 1/-1; text-align: center;">Ob-havo ma\'lumotlarini qisman olib bo\'lmadi.</p>';
        }
    } catch (err) {
        loader.remove();
        console.error(err);
    }
}

function renderWeatherCardsAppend(results) {
    const weatherGrid = document.getElementById('weather-grid');
    
    results.forEach(w => {
        const card = document.createElement('div');
        card.className = 'weather-card';
        card.innerHTML = `
            <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem">${w.city}</div>
            <div style="font-size: 2rem; color: var(--secondary-blue);">${w.temp}°C</div>
            <img src="https://openweathermap.org/img/wn/${w.icon}@2x.png" alt="${w.description}">
            <div style="text-transform: capitalize;">${w.description}</div>
            <div style="font-size: 0.85rem; opacity: 0.8; margin-top: 5px;">Namlik: ${w.humidity}%</div>
        `;
        weatherGrid.appendChild(card);
    });
}
