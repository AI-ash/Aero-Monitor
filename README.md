# AeroNarrative: Air Quality Dashboard

![Status](https://img.shields.io/badge/Status-Live-emerald) ![License](https://img.shields.io/badge/License-MIT-blue) ![Stack](https://img.shields.io/badge/Stack-React_|_Tailwind_|_Recharts-blueviolet)

**AeroNarrative** is a sophisticated, real-time air quality monitoring dashboard designed specifically for the Delhi NCR region. It transforms complex environmental data into actionable insights through interactive visualizations, geospatial mapping, and intelligent storytelling.

## 🌟 Key Features

* **📍 Interactive Geospatial Map**: A fully interactive Leaflet map displaying live monitoring stations across Delhi NCR. Markers dynamically color-code based on AQI severity.
* **📊 Real-Time Analytics**:
    * **Live AQI**: Instant updates on the Air Quality Index.
    * **Sensor Data**: Real-time readings for Temperature, Humidity, Wind Speed, and Pressure.
    * **Dominant Pollutant**: Automatic identification of the primary pollutant (e.g., PM2.5, PM10).
* **📈 Historical Analysis Engine**:
    * **24H Trend**: A detailed area chart showing AQI fluctuations over the last 24 hours.
    * **Custom Date Range**: A widget allowing users to select specific dates to view historical daily averages.
    * **Comparison Benchmarks**: Visual markers for safe limits (WHO standards).
* **📱 Fully Responsive Design**: A "glassmorphism" UI that adapts seamlessly from desktop command centers to mobile screens.
* **🚨 Intelligent Alerts**: Color-coded severity indicators (Good to Hazardous) with context-aware health narratives.

## 🛠️ Tech Stack

* **Frontend Framework**: [React](https://react.dev/) (Vite)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/)
* **Maps**: [Leaflet](https://leafletjs.com/) (Dynamic script injection)
* **Charts**: [Recharts](https://recharts.org/)
* **Icons**: [Lucide React](https://lucide.dev/)
* **Data Source**: [World Air Quality Index (WAQI) API](https://aqicn.org/api/)

## 🚀 Getting Started

Follow these instructions to set up the project locally on your machine.

### Prerequisites

* [Node.js](https://nodejs.org/) (v16 or higher)
* npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/yourusername/aero-narrative.git](https://github.com/yourusername/aero-narrative.git)
    cd aero-narrative
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```
    *Note: This project relies on `lucide-react`, `recharts`, and `leaflet`.*

3.  **Configure Environment (Optional)**
    The project currently uses a public demo token. For production use, get your own free API token from [WAQI](https://aqicn.org/data-platform/token/) and update the `WAQI_TOKEN` constant in `src/App.jsx`.

4.  **Run the development server**
    ```bash
    npm run dev
    ```

5.  **Open your browser**
    Navigate to `http://localhost:5173` to view the dashboard.

## 📂 Project Structure
