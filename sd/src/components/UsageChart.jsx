import React, { useEffect, useState, useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "./css-files/Chart.css"; // Ensure this path is correct
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload } from "@fortawesome/free-solid-svg-icons";
import { db } from "../firebase"; // Ensure this path is correct
import { collection, getDocs } from "firebase/firestore";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Helper function to get CSS variable value
const getCssVariable = (variableName) => {
  if (typeof window !== "undefined" && document.documentElement) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(variableName)
      .trim();
  }
  return ""; // Fallback
};

export default function UsageChart() {
  const [timeRange, setTimeRange] = useState("30");
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportData, setExportData] = useState([]);
  const [currentTheme, setCurrentTheme] = useState(
    typeof window !== "undefined"
      ? document.documentElement.getAttribute("data-theme") || "dark"
      : "dark"
  );

  useEffect(() => {
    // Observer for theme changes on document.documentElement
    if (typeof window === "undefined" || !document.documentElement) return;

    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-theme"
        ) {
          setCurrentTheme(
            document.documentElement.getAttribute("data-theme") || "dark"
          );
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true });

    // Initial theme check
    setCurrentTheme(
      document.documentElement.getAttribute("data-theme") || "dark"
    );

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchBookingData = async () => {
      try {
        setLoading(true);
        setError(null);
        const facilitiesSnapshot = await getDocs(collection(db, "facilities"));
        const facilitiesData = [];

        for (const facilityDoc of facilitiesSnapshot.docs) {
          const facility = facilityDoc.data();
          let bookingCount = 0;

          if (facility.bookings && Array.isArray(facility.bookings)) {
            bookingCount += countBookingsInTimeRange(
              facility.bookings,
              timeRange
            );
          }

          if (facility.has_subfacilities) {
            const subfacilitiesRef = collection(
              db,
              `facilities/${facilityDoc.id}/subfacilities`
            );
            const subfacilitiesSnapshot = await getDocs(subfacilitiesRef);

            for (const subfacilityDoc of subfacilitiesSnapshot.docs) {
              const subfacility = subfacilityDoc.data();
              if (subfacility.bookings && Array.isArray(subfacility.bookings)) {
                bookingCount += countBookingsInTimeRange(
                  subfacility.bookings,
                  timeRange
                );
              }
            }
          }

          if (bookingCount > 0 || facility.name) {
            // Include facility even if count is 0 for comprehensive export
            facilitiesData.push({
              name: facility.name || `Unnamed Facility ${facilityDoc.id}`,
              count: bookingCount,
            });
          }
        }

        const sortedFacilities = [...facilitiesData].sort(
          (a, b) => b.count - a.count
        );
        setExportData(sortedFacilities);

        const topFacilities = sortedFacilities
          .filter((f) => f.count > 0)
          .slice(0, 5);

        if (topFacilities.length === 0) {
          setChartData({ labels: [], datasets: [] }); // Set empty chart data instead of null
        } else {
          const labels = topFacilities.map((f) => f.name);
          const data = topFacilities.map((f) => f.count);

          // Bar colors - these are quite universal, but could be themed if needed
          const baseBackgroundColor = [
            "rgba(79, 70, 229, 0.8)",
            "rgba(99, 102, 241, 0.8)",
            "rgba(129, 140, 248, 0.8)",
            "rgba(165, 180, 252, 0.8)",
            "rgba(199, 210, 254, 0.8)",
          ];
          const baseBorderColor = [
            "rgba(79, 70, 229, 1)",
            "rgba(99, 102, 241, 1)",
            "rgba(129, 140, 248, 1)",
            "rgba(165, 180, 252, 1)",
            "rgba(199, 210, 254, 1)",
          ];

          setChartData({
            labels,
            datasets: [
              {
                label: "Bookings",
                data,
                backgroundColor: baseBackgroundColor,
                borderColor: baseBorderColor,
                borderWidth: 1,
                borderRadius: 5,
                hoverBackgroundColor: baseBackgroundColor.map((color) =>
                  color.replace("0.8", "1")
                ), // Darken or make more opaque on hover
                hoverBorderColor: baseBorderColor,
              },
            ],
          });
        }
      } catch (err) {
        console.error("Error fetching booking data:", err);
        setError("Failed to load booking data. Please try again later.");
        setChartData({ labels: [], datasets: [] }); // Set empty chart data on error
      } finally {
        setLoading(false);
      }
    };

    fetchBookingData();
  }, [timeRange]);

  const countBookingsInTimeRange = (bookings, days) => {
    if (!Array.isArray(bookings)) return 0; // Defensive check for non-array bookings
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
    return bookings.filter((booking) => {
      if (!booking.bookedAt) return false;
      // Ensure bookedAt is a valid date. Firestore timestamps might need .toDate()
      const bookedAtDate = booking.bookedAt.toDate
        ? booking.bookedAt.toDate()
        : new Date(booking.bookedAt);
      return (
        bookedAtDate instanceof Date &&
        !isNaN(bookedAtDate) &&
        bookedAtDate >= cutoffDate
      );
    }).length;
  };

  const handleTimeRangeChange = (e) => {
    setTimeRange(e.target.value);
  };

  const handleExport = () => {
    if (exportData.length === 0) {
      toast.error("No data to export.");
      return;
    }

    const headers = ["Facility Name", "Number of Bookings"];
    const csvRows = [headers.join(",")];

    exportData.forEach((item) => {
      const escapedName = item.name.replace(/"/g, '""');
      csvRows.push([`"${escapedName}"`, item.count].join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `facility_usage_last_${timeRange}_days.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* eslint-disable react-hooks/exhaustive-deps */
  const chartOptions = useMemo(() => {
    // These CSS variables are assumed to be defined in Chart.css and themed
    // Using 'ph-' prefixed variables as they are already themed in your provided CSS
    const tooltipBg =
      getCssVariable("--ph-tooltip-bg") || "rgba(17, 24, 39, 0.9)";
    const tooltipTitleColor =
      getCssVariable("--ph-tooltip-title-color") || "#ffffff";
    const tooltipBodyColor =
      getCssVariable("--ph-tooltip-body-color") || "rgba(255, 255, 255, 0.8)";
    const tooltipBorderColor =
      getCssVariable("--ph-tooltip-border-color") || "rgba(255, 255, 255, 0.1)";
    const gridColor =
      getCssVariable("--ph-grid-line-color") || "rgba(255, 255, 255, 0.05)";
    const tickColor =
      getCssVariable("--ph-axis-tick-color") || "rgba(255, 255, 255, 0.6)";

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: tooltipTitleColor,
          bodyColor: tooltipBodyColor,
          borderColor: tooltipBorderColor,
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          boxPadding: 4,
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || "";
              if (label) {
                label += ": ";
              }
              if (context.parsed.y !== null) {
                label += context.parsed.y + " bookings";
              }
              return label;
            },
          },
        },
        // title: { // Optional: if you want a title directly on the chart
        //   display: true,
        //   text: `Top 5 Facilities (Last ${timeRange} Days)`,
        //   color: tickColor,
        //   font: { size: 16, weight: '600' },
        //   padding: { top: 10, bottom: 20 }
        // }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: gridColor,
            drawBorder: false,
          },
          ticks: {
            color: tickColor,
            font: { size: 12 },
            precision: 0, // Ensure whole numbers for booking counts
          },
        },
        x: {
          grid: {
            display: false,
            drawBorder: false,
          },
          ticks: {
            color: tickColor,
            font: { size: 12 },
          },
        },
      },
      animation: {
        duration: 800,
        easing: "easeInOutQuart",
      },
      onHover: (event, chartElement) => {
        if (event.native) {
          const target = event.native.target;
          if (target) {
            target.style.cursor = chartElement[0] ? "pointer" : "default";
          }
        }
      },
    };
  }, [currentTheme]);
  /* eslint-enable react-hooks/exhaustive-deps */

  if (loading) {
    return (
      <section className="chart-section usage-chart-section">
        <section className="chart-header">
          <section>
            <h2>Facility Usage Trends</h2>
            <p>Analysing booking statistics...</p>
          </section>
          <select
            className="chart-select"
            value={timeRange}
            onChange={handleTimeRangeChange}
            disabled // Disable during initial load
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
        </section>
        <section className="chart-container chart-loading-state">
          <section className="usage-chart-spinner"></section>
          <p>Loading data, please wait...</p>
        </section>
        <section className="chart-footer">
          <button className="export-btn" disabled>
            <FontAwesomeIcon icon={faDownload} className="mr-2" />
            Export as CSV
          </button>
        </section>
      </section>
    );
  }

  return (
    <section className="chart-section usage-chart-section">
      <section className="chart-header">
        <section>
          <h2>Facility Usage Trends</h2>
          <p>Top facilities by booking volume for the last {timeRange} days.</p>
        </section>
        <select
          className="chart-select"
          value={timeRange}
          onChange={handleTimeRangeChange}
          disabled={loading}
        >
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
        </select>
      </section>
      <section className="chart-container">
        {error && (
          <section className="chart-error-state">
            <p>
              <strong>Oops! Something went wrong.</strong>
            </p>
            <p>{error}</p>
            <p>Please try refreshing or select a different time range.</p>
          </section>
        )}
        {!error &&
        !loading &&
        chartData &&
        chartData.datasets &&
        chartData.datasets.length > 0 ? (
          <Bar data={chartData} options={chartOptions} />
        ) : (
          !error &&
          !loading && (
            <section className="chart-empty-state">
              <p>
                <strong>No Booking Data Found</strong>
              </p>
              <p>
                There's no booking data for the top facilities in the selected
                period.
              </p>
              <p>
                Try a different time range or check if bookings have been made.
              </p>
            </section>
          )
        )}
      </section>
      <section className="chart-footer">
        <button
          className="export-btn"
          onClick={handleExport}
          disabled={loading || exportData.length === 0}
        >
          <FontAwesomeIcon icon={faDownload} style={{ marginRight: "8px" }} />
          Export as CSV
        </button>
      </section>
    </section>
  );
}
